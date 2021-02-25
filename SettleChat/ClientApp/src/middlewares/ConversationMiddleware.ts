import { Middleware, Dispatch, MiddlewareAPI } from 'redux';
import { ApplicationState } from '../store';
import { updateOneUser } from '../store/Conversation';
import { signalRActions } from '../store/SignalR'
import { UserStatus } from '../types/userTypes'

export const createConversationMiddleware = <S extends ApplicationState, D extends Dispatch>(): Middleware<{}, S, D> => {
    const dispatchIdentityStatusChangeIfNeeded = <TApi extends MiddlewareAPI<D, S>>(api: TApi, status: UserStatus) => {
        const currentUserId = api.getState().identity.userId;
        if (currentUserId) {
            api.dispatch(updateOneUser({ id: currentUserId, changes: { status } }));
        }
    }

    return api => {
        return next => action => {
            const result = next(action);
            if (signalRActions.connectionEstablished.match(action)) {
                dispatchIdentityStatusChangeIfNeeded(api, UserStatus.Online)
            }
            if (signalRActions.disconnected.match(action)) {
                dispatchIdentityStatusChangeIfNeeded(api, UserStatus.Offline)
            }
            return result;
        }
    }
}