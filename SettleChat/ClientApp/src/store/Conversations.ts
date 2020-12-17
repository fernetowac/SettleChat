import { Reducer, Action } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { ApplicationState } from './index';
import { RouterAction } from 'connected-react-router';
import { IdentityChangedAction } from './Identity';
import { fetchGet, fetchPost } from '../services/FetchService';
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions';
import { MessageAddedAction, ConversationReceivedAction } from './Conversation';

export interface ConversationsState {
    conversations: ConversationListItem[];
}

export const InitialConversationsState: ConversationsState = {
    conversations: []
};

export interface ConversationListItem {
    id: string;
    title: string;
    lastMessageText: string;
    users: ConversationListItemUser[];
    lastActivityTimestamp: Date;
}

export interface ConversationListItemUser {
    id: string;
    userName: string;
}

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
    conversation: ConversationListItem;
}

export interface ReceiveListAction {
    type: 'CONVERSATIONS_RECEIVED_LIST';
    conversations: ConversationListItem[];
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

interface ConversationsResponseItem {
    id: string;
    title: string;
    lastMessageText?: string;
    lastActivityTimestamp: string;
    users: Array<{
        id: string;
        userName: string;
    }>;
}

const createConversation = (conversationsResponseItem: ConversationsResponseItem): ConversationListItem => ({
    id: conversationsResponseItem.id,
    title: conversationsResponseItem.title,
    lastMessageText: conversationsResponseItem.lastMessageText,
    lastActivityTimestamp: new Date(conversationsResponseItem.lastActivityTimestamp as string),
    users: conversationsResponseItem.users.map((conversationsResponseItemUser) => ({
        id: conversationsResponseItemUser.id,
        userName: conversationsResponseItemUser.userName
    } as ConversationListItemUser))
} as ConversationListItem);

const createConversationListItem = (response: ConversationsResponseItem[]): ConversationListItem[] => response.map(createConversation);

type KnownAction = ConversationAddPipelineAction | ReceiveListAction | RequestListAction | ClearListAction
export type ConversationAddPipelineAction = AddAction | AddedAction | RouterAction;

export const actionCreators = {
    addConversation: (conversationInput: NewConversation): ThunkAction<Promise<ConversationListItem>, ApplicationState, undefined, ConversationAddPipelineAction | HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            dispatch({ type: 'CONVERSATION_ADD' });
            return fetchPost<ConversationListItem>('/api/Conversations', conversationInput, dispatch, true, createConversation)
                .then(createdConversation => {
                    dispatch({ type: 'CONVERSATION_ADDED', conversation: createdConversation });
                    return createdConversation;
                });
        },
    requestConversations: (): ThunkAction<Promise<ConversationListItem[]>, ApplicationState, undefined, RequestListAction | ReceiveListAction> => (dispatch, getState) => {
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = getState();
        if (appState && appState.conversations) {
            dispatch({ type: 'CONVERSATIONS_REQUEST_LIST' });
            return fetchGet<ConversationListItem[]>(`/api/conversations`, dispatch, true, createConversationListItem)
                .then(conversations => {
                    dispatch({ type: 'CONVERSATIONS_RECEIVED_LIST', conversations: conversations });
                    return conversations;
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
    const action = incomingAction as KnownAction | IdentityChangedAction | MessageAddedAction | ConversationReceivedAction;
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
            };
        case 'MESSAGE_ADDED':
            {
                const actionMessage = (action as MessageAddedAction).message;
                const conversation: ConversationListItem | undefined =
                    state.conversations.find(
                        (conversation: ConversationListItem) => conversation.id === actionMessage.conversationId);
                if (!conversation) {
                    throw Error("Conversation for added message not found");
                }
                if (conversation.lastActivityTimestamp >= actionMessage.created) {
                    return state;
                }
                const otherConversations: ConversationListItem[] = state.conversations.filter(
                    (conversation: ConversationListItem) => conversation.id !== actionMessage.conversationId);
                return {
                    conversations: [
                        ...otherConversations,
                        {
                            ...conversation,
                            lastMessageText: actionMessage.text,
                            lastActivityTimestamp: actionMessage.created
                        }
                    ]
                };
            }
        case 'CONVERSATION_RECEIVED':
            {
                const actionConversation = (action as ConversationReceivedAction).conversation;
                const conversation: ConversationListItem | undefined =
                    state.conversations.find(
                        (conversation: ConversationListItem) => conversation.id === actionConversation.id);
                if (!conversation) {
                    throw Error("Conversation for added message not found");
                }

                const otherConversations: ConversationListItem[] =
                    state.conversations.filter(
                        (conversation: ConversationListItem) => conversation.id !== actionConversation.id);
                return {
                    conversations: [
                        ...otherConversations,
                        {
                            ...conversation,
                            title: actionConversation.title
                        }
                    ]
                };
            }
        default:
            return state;
    }
}