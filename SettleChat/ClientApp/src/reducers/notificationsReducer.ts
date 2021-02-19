import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Notification, NotificationType } from '../types/notificationTypes'
import { NotificationAddActionInput } from '../types/notificationActionTypes'

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState: [] as Notification[],
    reducers: {
        add: {
            reducer: (state, action: PayloadAction<Notification>) => {
                state.push(action.payload)
            },
            prepare: (notification: NotificationAddActionInput | string) => {
                if (typeof notification === "string") {
                    return {
                        payload: {
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
                    payload: {
                        ...notification,
                        messageLines: Array.isArray(notification.message) ? notification.message : [notification.message],
                        key: notification.key || new Date().getTime() + Math.random(),
                        dismissed: false,
                        hasCloseButton: notification.hasCloseButton || false,
                        shouldPersist: notification.shouldPersist || false
                    },
                };
            }
        },
        close: (state, action: PayloadAction<Notification['key']>) => {
            return [
                ...state.map(notification =>
                    notification.key === action.payload
                        ? { ...notification, dismissed: true }
                        : { ...notification }
                )
            ]
        },
        remove: (state, action: PayloadAction<Notification['key']>) => {
            return [
                ...state.filter(notification => notification.key !== action.payload)
            ]
        }
    }
})

export const { actions: notificationsActions, reducer: notificationsReducer } = notificationsSlice