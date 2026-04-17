import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);

  private get baseUrl() {
    return `${process.env.KEYCLOAK_URL}/admin/realms/${process.env.KEYCLOAK_REALM}`;
  }

  private async getAdminToken(): Promise<string> {
    const res = await fetch(
      `${process.env.KEYCLOAK_URL}/realms/master/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: process.env.KEYCLOAK_ADMIN_USERNAME ?? '',
          password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? '',
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Failed to get admin token: ${body}`);
      throw new InternalServerErrorException(
        'Could not authenticate with Keycloak',
      );
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async createDoctorUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<string> {
    const token = await this.getAdminToken();

    const createRes = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        username: email,
        enabled: true,
        credentials: [{ type: 'password', value: password, temporary: false }],
      }),
    });

    if (!createRes.ok) {
      const body = await createRes.text();
      this.logger.error(`Failed to create Keycloak user: ${body}`);
      throw new InternalServerErrorException(
        'Failed to create user in Keycloak',
      );
    }

    // Keycloak returns the new user URL in the Location header
    const location = createRes.headers.get('location') ?? '';
    const userId = location.split('/').pop();
    if (!userId) {
      throw new InternalServerErrorException(
        'Could not extract user ID from Keycloak response',
      );
    }

    await this.assignDoctorRole(userId, token);

    this.logger.log(`Keycloak user created: ${userId} (${email})`);
    return userId;
  }

  private async assignDoctorRole(userId: string, token: string): Promise<void> {
    // Fetch the doctor role representation
    const roleRes = await fetch(`${this.baseUrl}/roles/doctor`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!roleRes.ok) {
      throw new InternalServerErrorException(
        'Could not find doctor role in Keycloak',
      );
    }

    const role = (await roleRes.json()) as { id: string; name: string };

    const assignRes = await fetch(
      `${this.baseUrl}/users/${userId}/role-mappings/realm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([role]),
      },
    );

    if (!assignRes.ok) {
      const body = await assignRes.text();
      this.logger.error(`Failed to assign doctor role: ${body}`);
      throw new InternalServerErrorException(
        'Failed to assign doctor role in Keycloak',
      );
    }
  }

  async deleteUser(keycloakUserId: string): Promise<void> {
    const token = await this.getAdminToken();
    await fetch(`${this.baseUrl}/users/${keycloakUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
