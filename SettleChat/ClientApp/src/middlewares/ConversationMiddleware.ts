import { Middleware, Dispatch, MiddlewareAPI, AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store';
import { conversationUserAdded, requestConversationUsers } from '../store/common';
import { requestConversationDetail } from '../store/conversationDetails';
import { signalRActions } from '../store/SignalR'
import { updateOneUser } from '../store/users';
import { requestMessagesByConversationId } from '../store/messages';
import { UserStatus } from '../types/userTypes'

export const createConversationMiddleware = <S extends ApplicationState, D extends Dispatch & ThunkDispatch<ApplicationState, {}, AnyAction>>(): Middleware<{}, S, D> => {
    const dispatchIdentityStatusChangeIfNeeded = <TApi extends MiddlewareAPI<D, S>>(api: TApi, status: UserStatus) => {
        const currentUserId = api.getState().identity.userId;
        if (currentUserId) {
            api.dispatch(updateOneUser({ id: currentUserId, changes: { status } }));
        }
    }

    const dispatchRequestConversationWithUsersAndItsLastMessage = <TApi extends MiddlewareAPI<D, S>>(api: TApi, conversationId: string) => {
        api.dispatch(requestConversationDetail(conversationId))
            .then(() => api.dispatch(requestConversationUsers(conversationId)))
            // we need also conversation last message so that it can be displayed in conversations list
            .then(() => api.dispatch(requestMessagesByConversationId({
                conversationId: conversationId,
                amount: 1
            })))
    }

    return api => {
        return next => action => {
            const result = next(action);
            if (signalRActions.connectionEstablished.match(action)) {
                dispatchIdentityStatusChangeIfNeeded(api, UserStatus.Online)
            }
            else if (signalRActions.disconnected.match(action)) {
                dispatchIdentityStatusChangeIfNeeded(api, UserStatus.Offline)
            }
            else if (conversationUserAdded.match(action)) {
                const state = api.getState()
                const conversationId = action.payload.conversationUser.conversationId
                // load conversation data (with last message) when current user has been added to new conversation
                if (action.payload.conversationUser.userId === state.identity.userId && !state.conversation.detail.ids.includes(conversationId)) {
                    dispatchRequestConversationWithUsersAndItsLastMessage(api, conversationId)
                }
            }
            return result;
        }
    }
}