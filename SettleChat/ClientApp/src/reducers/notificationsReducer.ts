import { Reducer, Action } from 'redux';
import { Notification, NotificationType, NOTIFICATION_REMOVE } from '../types/notificationTypes'
import { NotificationKnownAction, NotificationRemoveAction } from '../types/notificationActionTypes'
import { HTTP_FAIL_STATUS_RECEIVED } from '../types/httpStatusTypes'

const getNextId = (state: Notification[]): number =>
    state.length === 0 ? 1 : state[state.length - 1].id + 1

export const notificationsReducer: Reducer<Notification[]> = (state: Notification[] = [], incomingAction: Action): Notification[] => {
    // Note that items in state are ordered by id number ascending
    const action = incomingAction as NotificationKnownAction;

    switch (action.type) {
        case HTTP_FAIL_STATUS_RECEIVED:
            return [
                ...state,
                {
                    id: getNextId(state),
                    type: NotificationType.Error,
                    message: 'Request failed'
                }
            ]
        case NOTIFICATION_REMOVE:
            const actionId = (action as NotificationRemoveAction).id;
            return [
                ...state.filter(x => x.id !== actionId)
            ];
        default:
            return state;
    };
}