import { Notification, NotificationType } from './notificationTypes'

//TODO: move to ./notificationTypes.ts
export type NotificationAddActionInput = {
    key?: Notification['key']
    type: NotificationType
    message: Notification['messageLines'] | Notification['messageLines'][0]
    hasCloseButton?: boolean
    shouldPersist?: boolean
}
