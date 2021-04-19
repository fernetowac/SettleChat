import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface SignalRState {
    connectionId: string | null
    reconnected: boolean
}

export const initialSignalRState: SignalRState = {
    connectionId: null,
    reconnected: false,
}

const signalRSlice = createSlice({
    name: 'signalR',
    initialState: initialSignalRState,
    reducers: {
        connectionEstablished: {
            reducer: (state, action: PayloadAction<{ connectionId: string }>) => {
                return {
                    ...state,
                    connectionId: action.payload.connectionId,
                    reconnected: false,
                }
            },
            prepare: (connectionId: string) => ({ payload: { connectionId } }),
        },
        reconnected: {
            reducer: (state, action: PayloadAction<{ connectionId: string }>) => {
                return {
                    ...state,
                    connectionId: action.payload.connectionId,
                    reconnected: true,
                }
            },
            prepare: (connectionId: string) => ({ payload: { connectionId } }),
        },
        disconnected: (state) => {
            return {
                ...state,
                connectionId: null,
                reconnected: false,
            }
        },
    },
})

export const { actions: signalRActions, reducer: signalRReducer } = signalRSlice
