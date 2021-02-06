import { NotificationAddAction, NotificationCloseAction, NotificationRemoveAction, NOTIFICATION_ADD, NOTIFICATION_CLOSE, NOTIFICATION_REMOVE, NotificationAddActionInput } from '../types/notificationActionTypes'
import { Notification, NotificationType } from '../types/notificationTypes'

export const addNotification = (
    notification: NotificationAddActionInput | string): NotificationAddAction => {
    if (typeof notification === "string") {
        return {
            type: NOTIFICATION_ADD,
            notification: {
                type: NotificationType.Info,
                messageLines: [notification],
                key: new Date().getTime() + Math.random(),
                dismissed: false,
                hasCloseButton: true,
                shouldPersist: false
            },
        };
    }
    return {
        type: NOTIFICATION_ADD,
        notification: {
            ...notification,
            messageLines: Array.isArray(notification.message) ? notification.message : [notification.message],
            key: notification.key || new Date().getTime() + Math.random(),
            dismissed: false,
            hasCloseButton: notification.hasCloseButton || false,
            shouldPersist: notification.shouldPersist || false
        },
    };
};

export const closeNotification = (key: Notification['key']): NotificationCloseAction => ({
    type: NOTIFICATION_CLOSE,
    key
});

export const removeNotification = (key: Exclude<Notification['key'], undefined>): NotificationRemoveAction => ({
    type: NOTIFICATION_REMOVE,
    key
});