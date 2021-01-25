import { NotificationRemoveAction } from '../types/notificationActionTypes'
import { NOTIFICATION_REMOVE } from '../types/notificationTypes'

export function notificationRemove(id: number): NotificationRemoveAction {
    return {
        type: NOTIFICATION_REMOVE,
        id: id
    }
}