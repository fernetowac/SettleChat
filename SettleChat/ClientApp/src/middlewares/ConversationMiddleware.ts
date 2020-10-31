import { Middleware, Dispatch, AnyAction } from 'redux';
import { ApplicationState } from '../store';
import { actionCreators, UserStatus } from '../store/Conversation';

export const createConversationMiddleware = (): Middleware<any, ApplicationState, any> => {

    return api => {
        return next => action => {
            const result = next(action);
            if (action.type === 'SIGNALR_CONNECTION_ESTABLISHED') {
                api.dispatch(actionCreators.connectionStatusChanged(UserStatus.Online));
            }
            if (action.type === 'SIGNALR_DISCONNECTED') {//TODO: use some string enum for action types
                api.dispatch(actionCreators.connectionStatusChanged(UserStatus.Offline));
            }
            return result;
        }
    }
}