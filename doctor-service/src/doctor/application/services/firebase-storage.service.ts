import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ServiceAccount, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage, Storage } from 'firebase-admin/storage';

@Injectable()
export class FirebaseStorageService {
  private storage: Storage;
  private readonly bucketName: string;
  private readonly signedUrlExpirySeconds: number;

  constructor(private readonly config: ConfigService) {
    const projectId = this.config.get<string>('firebase.projectId')?.trim();
    this.bucketName = this.config.get<string>('firebase.storageBucket')?.trim() ?? '';
    this.signedUrlExpirySeconds =
      this.config.get<number>('firebase.signedUrlExpirySeconds') ?? 600;
    const serviceAccount = this.loadServiceAccount();

    if (!projectId || !this.bucketName || !serviceAccount) {
      throw new ServiceUnavailableException(
        'Firebase Storage is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET and service account.',
      );
    }

    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId,
        storageBucket: this.bucketName,
      });
    }
    this.storage = getStorage();
  }

  private loadServiceAccount(): ServiceAccount | null {
    const jsonRaw = this.config.get<string>('firebase.serviceAccountJson')?.trim();
    if (jsonRaw) {
      try {
        return JSON.parse(jsonRaw) as ServiceAccount;
      } catch {
        throw new InternalServerErrorException(
          'FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON.',
        );
      }
    }

    const relativePath = this.config.get<string>('firebase.serviceAccountPath')?.trim();
    if (relativePath) {
      const fullPath = resolve(process.cwd(), relativePath);
      if (!existsSync(fullPath)) {
        throw new ServiceUnavailableException(
          `FIREBASE_SERVICE_ACCOUNT_PATH not found: ${fullPath}`,
        );
      }
      try {
        const contents = readFileSync(fullPath, 'utf-8');
        return JSON.parse(contents) as ServiceAccount;
      } catch {
        throw new InternalServerErrorException(
          'Could not parse Firebase service account file.',
        );
      }
    }

    return null;
  }

  private getExpiresAt(): number {
    return Date.now() + this.signedUrlExpirySeconds * 1000;
  }

  async createUploadUrl(
    blobKey: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; expiresAt: string }> {
    const file = this.storage.bucket(this.bucketName).file(blobKey);
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: this.getExpiresAt(),
      contentType: mimeType,
    });
    return {
      uploadUrl,
      expiresAt: new Date(Date.now() + this.signedUrlExpirySeconds * 1000).toISOString(),
    };
  }

  async createDownloadUrl(blobKey: string): Promise<{ downloadUrl: string; expiresAt: string }> {
    const file = this.storage.bucket(this.bucketName).file(blobKey);
    const [exists] = await file.exists();
    if (!exists) throw new NotFoundException('Blob not found in Firebase Storage.');
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: this.getExpiresAt(),
    });
    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + this.signedUrlExpirySeconds * 1000).toISOString(),
    };
  }

  async ensureBlobExists(blobKey: string): Promise<void> {
    const file = this.storage.bucket(this.bucketName).file(blobKey);
    const [exists] = await file.exists();
    if (!exists) throw new NotFoundException('Uploaded file not found in Firebase Storage.');
  }

  async deleteBlobIfExists(blobKey: string): Promise<void> {
    const file = this.storage.bucket(this.bucketName).file(blobKey);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
  }

  makeInternalFileUrl(blobKey: string): string {
    return `gs://${this.bucketName}/${blobKey}`;
  }
}
