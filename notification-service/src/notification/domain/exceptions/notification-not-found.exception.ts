/**
 * Exception for when a Notification is not found.
 */
export class NotificationNotFoundException extends Error {
  constructor(id: string) {
    super(`Notification with id "${id}" was not found.`);
    this.name = 'NotificationNotFoundException';
  }
}
