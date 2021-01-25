import { NOTIFICATION_REMOVE } from './notificationTypes'
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions'

export interface NotificationRemoveAction {
    type: typeof NOTIFICATION_REMOVE;
    id: number;
}

export type NotificationKnownAction = NotificationRemoveAction | HttpFailStatusReceivedAction;