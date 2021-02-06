import { ThunkAction } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import { ProblemDetails } from '../services/FetchService'
import { parseErrors } from '../services/ProblemDetailsService'
import { NotificationAddAction } from '../types/notificationActionTypes'
import { addNotification } from '../actions/notificationActions'
import { NotificationType } from '../types/notificationTypes'

export const tryAddProblemDetailNotification = (problemDetails: ProblemDetails): ThunkAction<boolean, ApplicationState, undefined, NotificationAddAction> =>
    (dispatch) => {
        const errorMessages = parseErrors(problemDetails)
        if (errorMessages.length == 0) {
            return false;
        }
        const addNotificationAction = addNotification({
            type: NotificationType.Error,
            message: errorMessages,
            hasCloseButton: true,
            shouldPersist: true
        });
        dispatch(addNotificationAction);
        return true;
    }
