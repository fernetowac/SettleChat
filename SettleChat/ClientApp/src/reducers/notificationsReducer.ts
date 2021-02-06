import { Reducer, Action } from 'redux';
import { Notification } from '../types/notificationTypes'
import { NotificationKnownAction, NOTIFICATION_ADD, NOTIFICATION_CLOSE, NOTIFICATION_REMOVE } from '../types/notificationActionTypes'

export const notificationsReducer: Reducer<Notification[]> = (state: Notification[] = [], incomingAction: Action): Notification[] => {
    // Note that items in state are ordered by id number ascending
    const action = incomingAction as NotificationKnownAction;

    switch (action.type) {
        case NOTIFICATION_ADD:
            return [
                ...state,
                {
                    ...action.notification,
                }
            ];
        case NOTIFICATION_CLOSE:
            return [
                ...state.map(notification =>
                    notification.key === action.key
                        ? { ...notification, dismissed: true }
                        : { ...notification }
                )
            ];
        case NOTIFICATION_REMOVE:
            return [
                ...state.filter(notification => notification.key !== action.key)
            ];
        default:
            return state;
    };
}