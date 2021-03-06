import { ThunkAction } from '@reduxjs/toolkit'
import { ProblemDetails } from '../types/commonTypes'
import { parseErrors } from '../services/ProblemDetailsService'
import { NotificationType } from '../types/notificationTypes'
import { notificationsActions } from '../reducers/notificationsReducer'

export const tryAddProblemDetailNotification = (problemDetails: ProblemDetails): ThunkAction<boolean, any, any, any> =>
    (dispatch) => {
        const errorMessages = parseErrors(problemDetails)
        if (errorMessages.length == 0) {
            return false;
        }
        const addNotificationAction = notificationsActions.add({
            type: NotificationType.Error,
            message: errorMessages,
            hasCloseButton: true,
            shouldPersist: true
        });
        dispatch(addNotificationAction);
        return true;
    }