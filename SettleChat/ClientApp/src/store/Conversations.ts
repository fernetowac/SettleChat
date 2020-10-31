import { Reducer, Action } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { ApplicationState } from './index';
import { RouterAction } from 'connected-react-router';
import { IdentityChangedAction } from './Identity';
import { fetchGet, fetchPost } from '../services/FetchService';
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions';

export interface ConversationsState {
    conversations: Conversation[];
}

export const InitialConversationsState: ConversationsState = {
    conversations: []
};

export interface NewConversation {
    title: string;
    creator: ConversationUser;
    invitedUsers: ConversationUser[];
}

export interface Conversation extends NewConversation {
    id: string;
}

export interface ConversationUser {
    name: string;
    email: string;
}

export interface AddAction {
    type: 'CONVERSATION_ADD';
}

export interface AddedAction {
    type: 'CONVERSATION_ADDED';
    conversation: Conversation;
}

export interface ReceiveListAction {
    type: 'CONVERSATIONS_RECEIVED_LIST';
    conversations: Conversation[];
}

export interface ClearListAction {
    type: 'CONVERSATIONS_CLEAR_LIST';
}

export interface RequestListAction {
    type: 'CONVERSATIONS_REQUEST_LIST';
}

export interface ConversationCreateResponse {
    id: string;
    me: ConversationCreateResponseCreator;
    title: string;
}

export interface ConversationCreateResponseCreator {
    email: string;
    id: string;
    name: string;
}

type KnownAction = ConversationAddPipelineAction | ReceiveListAction | RequestListAction | ClearListAction
export type ConversationAddPipelineAction = AddAction | AddedAction | RouterAction;

export const actionCreators = {
    addConversation: (conversationInput: NewConversation): ThunkAction<Promise<Conversation>, ApplicationState, undefined, ConversationAddPipelineAction | HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            dispatch({ type: 'CONVERSATION_ADD' });
            return fetchPost<Conversation>('/api/Conversations', conversationInput, dispatch)
                .then(data => {
                    const createdConversation = {
                        id: data.id,
                        title: data.title
                    } as Conversation;
                    dispatch({ type: 'CONVERSATION_ADDED', conversation: createdConversation });
                    return createdConversation;
                });
        },
    requestConversations: (): ThunkAction<Promise<Conversation[]>, ApplicationState, undefined, RequestListAction | ReceiveListAction> => (dispatch, getState) => {
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = getState();
        if (appState && appState.conversations) {
            dispatch({ type: 'CONVERSATIONS_REQUEST_LIST' });
            return fetchGet<Conversation[]>(`/api/conversations`, dispatch)
                .then(data => {
                    dispatch({ type: 'CONVERSATIONS_RECEIVED_LIST', conversations: data });
                    return data;
                });
        } else {
            return Promise.reject();
        }
    },
    clearConversations: (): ClearListAction => {
        return {
            type: 'CONVERSATIONS_CLEAR_LIST'
        };
    }
};

export const reducer: Reducer<ConversationsState> = (state: ConversationsState | undefined = InitialConversationsState, incomingAction: Action<any>): ConversationsState => {
    const action = incomingAction as KnownAction | IdentityChangedAction;
    state = state as ConversationsState;
    switch (action.type) {
        case 'CONVERSATION_ADD':
            return state;
        case 'CONVERSATION_ADDED':
            return {
                conversations: [...state.conversations, action.conversation]
            };
        case 'CONVERSATIONS_RECEIVED_LIST':
            return {
                conversations: [...action.conversations]
            };
        case 'CONVERSATIONS_CLEAR_LIST':
            return {
                conversations: []
            };
        case 'CONVERSATIONS_REQUEST_LIST':
            return state;
        case 'IDENTITY_CHANGED':
            return {
                conversations: []
            }
        default:
            return state;
    };
}