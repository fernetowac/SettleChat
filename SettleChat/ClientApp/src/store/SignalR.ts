import { Reducer, Action } from 'redux';
import * as SignalRActions from '../actions/SignalRActions';

export interface SignalRState {
    connectionId: string | null;
    reconnected: boolean;
}

export const initialSignalRState: SignalRState = {
    connectionId: null,
    reconnected: false
};

export const reducer: Reducer<SignalRState> = (state: SignalRState = initialSignalRState, incomingAction: Action): SignalRState => {
    const action = incomingAction as SignalRActions.KnownActions;

    switch (action.type) {
        case 'SIGNALR_CONNECTION_ESTABLISHED':
            return {
                ...state,
                connectionId: action.connectionId,
                reconnected: false
            };
        case 'SIGNALR_RECONNECTED':
            return {
                ...state,
                connectionId: action.connectionId,
                reconnected: true
            };
        case 'SIGNALR_DISCONNECTED':
            return {
                ...state,
                connectionId: null,
                reconnected: false
            }
        default:
            return state;
    }
}