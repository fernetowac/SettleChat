export const NOTIFICATION_REMOVE = 'NOTIFICATION_REMOVE'

export enum NotificationType {
    Error
}

export interface Notification {
    id: number;
    type: NotificationType,
    message: string
}