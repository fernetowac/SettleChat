export enum NotificationType {
    Error,
    Info
}

export interface Notification {
    key: number;
    type: NotificationType,
    dismissed: boolean,
    messageLines: string[],
    hasCloseButton: boolean,
    shouldPersist: boolean
}