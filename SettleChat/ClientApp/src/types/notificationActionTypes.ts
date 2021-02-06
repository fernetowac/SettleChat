import { Notification, NotificationType } from './notificationTypes'

export type NotificationAddActionInput = {
    key?: Notification['key'],
    type: NotificationType,
    message: Notification['messageLines'] | Notification['messageLines'][0],
    hasCloseButton?: boolean,
    shouldPersist?: boolean
};

export const NOTIFICATION_ADD = 'NOTIFICATION_ADD';
export const NOTIFICATION_CLOSE = 'NOTIFICATION_CLOSE';
export const NOTIFICATION_REMOVE = 'NOTIFICATION_REMOVE';

export interface NotificationAddAction {
    type: typeof NOTIFICATION_ADD;
    notification: Notification;
}

export interface NotificationCloseAction {
    type: typeof NOTIFICATION_CLOSE;
    key: Notification['key'];
}

export interface NotificationRemoveAction {
    type: typeof NOTIFICATION_REMOVE;
    key: Notification['key'];
}

export type NotificationKnownAction = NotificationAddAction | NotificationCloseAction | NotificationRemoveAction;
