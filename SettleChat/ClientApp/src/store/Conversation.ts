﻿import { Reducer, Action, combineReducers } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { AppThunkAction, ApplicationState } from './index';
import authService from '../components/api-authorization/AuthorizeService';
import { IdentityChangedAction } from './Identity';
import { fetchGet, fetchPost, fetchPut, fetchPatch, fetchDelete } from '../services/FetchService';
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions';
import { Identifiable } from '../types/commonTypes'
import { Invitation } from '../types/invitationTypes'
import { invitationsReducer } from '../reducers/invitationsReducer'
import { unionArray } from '../helpers/arrayHelper'
import SchemaKind from '../schemas/SchemaKind'

export interface ConversationState {
    detail: ConversationDetail | null;
    messages: Message[];
    users: User[];
    ui: Ui;
    writingActivities: ReceivedWritingActivityStateItem[];
    invitations: Invitation[];
}

export interface ConversationDetail {
    id: string;
    title: string;
    isPublic: boolean;
}

export interface ConversationPatch {
    title?: string;
    isPublic?: boolean;
}

export interface Message extends Identifiable {
    id: string | undefined;
    conversationId: string;
    text: string;
    userId: string;
    created: Date;
}

interface MessagesResponseItem {
    id: string;
    conversationId: string;
    text: string;
    userId: string;
    created: string;
}

export interface MessageCreateResponse {
    id: string;
    conversationId: string;
    text: string;
    userId: string;
    created: string;
}

export interface User {
    id: string;
    userName: string;
    email: string | undefined;
    status: UserStatus;
    lastActivityTimestamp: Date | null;
}

export interface NewUser {
    userName: string | undefined;
    email: string | undefined;
}

export enum UserStatus {
    Offline = 1,
    Online = 2,
    Inactive = 3
}

interface UninvitedUser {
    id: string;
    userName: string;
    joinLink: string;
    email: string | undefined;
}

export interface ConversationRequestAction {
    type: 'CONVERSATION_REQUEST';
    id: string;
}

export interface ConversationReceivedAction {
    type: 'CONVERSATION_RECEIVED';
    conversation: ConversationDetail;
}

export interface ConversationSendWritingActivity {
    type: 'CONVERSATION_SEND_WRITING_ACTIVITY';
    writingActivity: WritingActivity;
}

export interface ConversationWritingActivityReceived {
    type: 'CONVERSATION_WRITING_ACTIVITY_RECEIVED';
    writingActivityData: ReceivedWritingActivityData;
}

export interface ConversationUserStatusChanged {
    type: 'CONVERSATION_USER_STATUS_CHANGED';
    userId: string;
    status: UserStatus;
}

export interface MessageAddAction {
    type: 'MESSAGE_ADD';
    newMessage: Message;
}

export interface MessageAddedAction {
    type: 'MESSAGE_ADDED';
    message: Message;
}

export interface MessagesRequestListAction {
    type: 'MESSAGES_REQUEST_LIST';
    beforeId?: string;
    amount?: number;
}

export interface MessagesReceiveListAction {
    type: 'MESSAGES_RECEIVE_LIST';
    messages: Message[];
}

export interface UsersRequestListAction {
    type: 'USERS_REQUEST_LIST';
}

export interface UsersReceivedListAction {
    type: 'USERS_RECEIVED_LIST';
    users: User[];
}

export interface UserAddAction {
    type: 'USER_ADD';
    user: NewUser;
}

export interface UserAddedAction {
    type: 'USER_ADDED';
    user: User;
}

export interface ConversationUiDisableLoadingMoreMessages {
    type: 'CONVERSATION_UI_DISABLE_LOADING_MORE_MESSAGES';
}

export interface ConversationUiEnableLoadingMoreMessages {
    type: 'CONVERSATION_UI_ENABLE_LOADING_MORE_MESSAGES';
}

export interface ConversationUiLeftPanelDisplayConversationInviteAction {
    type: 'CONVERSATION_UI_LEFT_PANEL_DISPLAY_CONVERSATION_INVITE';
}

export interface ConversationUiLeftPanelDisplayConversationUsersAction {
    type: 'CONVERSATION_UI_LEFT_PANEL_DISPLAY_CONVERSATION_USERS';
}

export interface ConversationUiLeftPanelDisplayConversationsAction {
    type: 'CONVERSATION_UI_LEFT_PANEL_DISPLAY_CONVERSATIONS';
}

export enum LeftPanelContentKind {
    Conversations,
    ConversationUsers,
    ConversationInvite
}

interface UiLeftPanel {
    contentKind: LeftPanelContentKind
}
interface Ui {
    isConversationLoading: boolean;
    canLoadMoreMessages: boolean;
    leftPanel: UiLeftPanel
}

const initialUi: Ui = {
    isConversationLoading: false,
    canLoadMoreMessages: false,
    leftPanel: {
        contentKind: LeftPanelContentKind.Conversations
    }
};

export interface WritingActivityData {
    activity: WritingActivity;
    lastChange: Date;
}

export enum WritingActivity {
    IsWriting = 1,
    StoppedWriting = 2
}

const initialWritingActivityData: WritingActivityData = {
    activity: WritingActivity.StoppedWriting,
    lastChange: new Date()
};

export interface ReceivedWritingActivityData {
    conversationId: string;
    userId: string;
    activity: WritingActivity;
    lastChange: Date;
}

export interface ReceivedWritingActivityStateItem {
    userId: string;
    activity: WritingActivity;
    lastChange: Date;
}

const createMessages = (response: MessagesResponseItem[]): Message[] => response.map(
    (messageResponseItem) => ({
        ...messageResponseItem,
        created: new Date(messageResponseItem.created as string)
    } as Message)
);

export const transformMessageCreateResponse = (response: MessageCreateResponse): Message => (
    {
        ...response,
        created: new Date(response.created as string)
    });

export type ConversationKnownAction = ConversationRequestAction | ConversationReceivedAction;
export type MessageKnownAction = MessageAddAction | MessageAddedAction | MessagesRequestListAction | MessagesReceiveListAction;
type UserKnownAction = UserAddAction | UserAddedAction | UsersRequestListAction | UsersReceivedListAction | ConversationUserStatusChanged;
export type UiKnownAction = ConversationUiEnableLoadingMoreMessages | ConversationUiDisableLoadingMoreMessages | ConversationUiLeftPanelDisplayConversationInviteAction | ConversationUiLeftPanelDisplayConversationUsersAction | ConversationUiLeftPanelDisplayConversationsAction;
export type KnownAction = ConversationKnownAction | MessageKnownAction | UiKnownAction;

export const actionCreators = {
    messageAdded(message: Message): MessageAddedAction {
        return {
            type: 'MESSAGE_ADDED',
            message: message
        }
    },
    writingActivityReceived(writingActivity: ReceivedWritingActivityData): ConversationWritingActivityReceived {
        return {
            type: 'CONVERSATION_WRITING_ACTIVITY_RECEIVED',
            writingActivityData: writingActivity
        }
    },
    userStatusChanged(userId: string, status: UserStatus): ConversationUserStatusChanged {
        return {
            type: 'CONVERSATION_USER_STATUS_CHANGED',
            userId: userId,
            status: status
        }
    },
    conversationReceived(conversation: ConversationDetail): ConversationReceivedAction {
        return {
            type: 'CONVERSATION_RECEIVED',
            conversation: conversation
        }
    },
    connectionStatusChanged: (status: UserStatus): ThunkAction<void, ApplicationState, undefined, ConversationUserStatusChanged> =>
        (dispatch, getState, extraArgument) => {
            const currentUserId = getState().identity.userId;
            if (currentUserId) {
                dispatch(actionCreators.userStatusChanged(currentUserId, status));
            }
        },
    requestConversation1: (conversationId: string): ThunkAction<Promise<ConversationDetail | never>, ApplicationState, undefined, ConversationKnownAction | HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            dispatch({ type: 'CONVERSATION_REQUEST', id: conversationId });
            return fetchGet<ConversationDetail>(`/api/conversations/${conversationId}`, dispatch)
                .then(conversation => {
                    dispatch(actionCreators.conversationReceived(conversation));
                    return conversation;
                });
        },
    patchConversation: (conversationId: string, updatedProperties: ConversationPatch): ThunkAction<Promise<ConversationDetail>, ApplicationState, undefined, ConversationKnownAction | HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) =>
            fetchPatch<ConversationDetail>(`/api/conversations/${conversationId}`, updatedProperties, dispatch)
                .then(data => {
                    dispatch({ type: 'CONVERSATION_RECEIVED', conversation: data });
                    return data;
                })
    ,
    enableLoadingMoreMessages(): ConversationUiEnableLoadingMoreMessages {
        return {
            type: 'CONVERSATION_UI_ENABLE_LOADING_MORE_MESSAGES'
        }
    },
    disableLoadingMoreMessages(): ConversationUiDisableLoadingMoreMessages {
        return {
            type: 'CONVERSATION_UI_DISABLE_LOADING_MORE_MESSAGES'
        }
    },
    displayConversationInvite(): ConversationUiLeftPanelDisplayConversationInviteAction {
        return {
            type: 'CONVERSATION_UI_LEFT_PANEL_DISPLAY_CONVERSATION_INVITE'
        }
    },
    displayConversationUsers(): ConversationUiLeftPanelDisplayConversationUsersAction {
        return {
            type: 'CONVERSATION_UI_LEFT_PANEL_DISPLAY_CONVERSATION_USERS'
        }
    },
    displayConversations(): ConversationUiLeftPanelDisplayConversationsAction {
        return {
            type: 'CONVERSATION_UI_LEFT_PANEL_DISPLAY_CONVERSATIONS'
        }
    },
    /**
     * Retrieve messages from backend
     * @param beforeId ID of message based on which only older messages will be retrieved
     * @param amount Maximal number of messages to retrieve.
     * @returns {} 
     */
    requestMessages: (conversationId: string, beforeId?: string, amount: number = 30): ThunkAction<Promise<Message[]>, ApplicationState, undefined, MessageKnownAction> =>//AppThunkAction<MessageKnownAction, void> =>
        (dispatch, getState) => {
            // Only load data if it's something we don't already have (and are not already loading)
            dispatch({ type: 'MESSAGES_REQUEST_LIST', beforeId: beforeId, amount: amount });
            let url = `/api/conversations/${conversationId}/messages?amount=${amount}`;
            if (beforeId) {
                url += `&beforeId=${encodeURIComponent(beforeId)}`;
            }
            return fetchGet<Message[]>(url, dispatch, true, createMessages, SchemaKind.MessagesGetResponse)
                .then(data => {
                    dispatch({ type: 'MESSAGES_RECEIVE_LIST', messages: data });
                    return data;
                });
        },
    addMessage: (text: string, conversationId: string): ThunkAction<Promise<Message>, ApplicationState, undefined, MessageKnownAction | HttpFailStatusReceivedAction> =>
        (dispatch, getState) => {
            const appState = getState();
            if (!appState) {
                return Promise.reject('appState is undefined');
            }
            if (!appState.identity.isAuthenticated) {
                return Promise.reject('identity is not authenticated');
            }

            const messageInput = { userId: appState.identity.userId, text: text, created: new Date() } as Message;//TODO: no need to send userId and date created, as backend can figure it out
            dispatch({ type: 'MESSAGE_ADD', newMessage: messageInput });
            return fetchPost<Message>(`/api/conversations/${conversationId}/messages`,
                messageInput,
                dispatch, true, transformMessageCreateResponse)
                .then(message => {
                    dispatch(actionCreators.messageAdded(message));
                    return message;
                });
        },
    updateWritingActivity: (writingActivity: WritingActivityData): ThunkAction<Promise<void>, ApplicationState, undefined, HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            const conversationState = getState().conversation;
            if (!conversationState || !conversationState.detail) {
                return Promise.reject('Conversation must be loaded in order to notify about it');
            }
            const conversationId = conversationState.detail.id;
            //dispatch({ type: 'CONVERSATION_SEND_WRITING_ACTIVITY', writingActivity: writingActivity });
            return fetchPut<void>(`/api/conversations/${conversationId}/writingactivity`, writingActivity, dispatch);
        },
    startListeningConversation: (connectionId: string, conversationId: string): ThunkAction<Promise<void>, ApplicationState, undefined, HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            return fetchPost<void>(`/api/notifications/conversations/${conversationId}`, connectionId, dispatch)
                .then(() => {
                    console.log(`Start listening conversation ${conversationId} on connection ${connectionId}`);
                });
        },
    stopListeningConversation: (connectionId: string, conversationId: string): ThunkAction<Promise<void>, ApplicationState, undefined, HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            return fetchDelete<void>(`/api/notifications/conversations/${conversationId}`, connectionId, dispatch)
                .then(() => {
                    console.log(`Stop listening conversation ${conversationId} on connection ${connectionId}`);
                });
        },
    requestUsers: (): AppThunkAction<UserKnownAction, User[] | void> => (dispatch, getState) => {
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = getState();
        if (appState && appState.conversation && appState.conversation.detail) {
            dispatch({ type: 'USERS_REQUEST_LIST' });
            const conversationId = appState.conversation.detail.id;
            return authService.getAccessToken()
                .then(token => {
                    //TODO: handle unauthorized when !token
                    return fetch(`/api/conversations/${conversationId}/users`,
                        {
                            cache: "no-cache",
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        })
                        .then(response => response.json() as Promise<User[]>)
                        .then(data => {
                            dispatch({ type: 'USERS_RECEIVED_LIST', users: data });
                        })
                        .catch((error) => console.error('Error:', error));
                });
        } else {
            return Promise.reject('appState or its conversation is undefined');
        }
    },
    userAdded: (user: User): UserAddedAction => {
        return {
            type: 'USER_ADDED',
            user: user
        } as UserAddedAction;
    }
};

export const conversationDetailReducer: Reducer<ConversationDetail | null> = (state: ConversationDetail | null = null, incomingAction: Action): ConversationDetail | null => {
    const action = incomingAction as ConversationKnownAction | IdentityChangedAction;

    switch (action.type) {
        case 'CONVERSATION_REQUEST':
            return state;
        case 'CONVERSATION_RECEIVED':
            return {
                id: action.conversation.id,
                title: action.conversation.title,
                isPublic: action.conversation.isPublic
            };
        case 'IDENTITY_CHANGED':
            return null;
        default:
            return state;
    }
}

export const messagesReducer: Reducer<Message[]> = (state1: Message[] | undefined, incomingAction: Action): Message[] => {
    // Note that items in state are not sorted. UI component manages sorting instead.
    let state: Message[] = state1 || [];

    const action = incomingAction as MessageKnownAction | IdentityChangedAction;

    switch (action.type) {
        case 'MESSAGE_ADDED':
            const actionMessage = (action as MessageAddedAction).message;
            // don't change state, when the message already exists in the state
            const existingMessage = state.find(x => x.id === actionMessage.id);
            if (existingMessage) {
                const equals = JSON.stringify(existingMessage) === JSON.stringify(action.message);
                if (equals) {
                    return state;
                }
            }

            return [
                ...state.filter(x => x.id !== actionMessage.id), //TODO: handle read/sent flags
                {
                    ...actionMessage
                }
            ];
        case 'MESSAGES_RECEIVE_LIST':
            return [...unionArray<Message>(action.messages, state)];
        case 'IDENTITY_CHANGED'://TODO: clearing list of messages should be maybe called from component. Store should not be aware of logic when user identity is changed.
            return [];
        case 'MESSAGE_ADD':
        case 'MESSAGES_REQUEST_LIST':
        default:
            return state;
    };
}

export const usersReducer: Reducer<User[]> = (state1: User[] | undefined, incomingAction: Action): User[] => {
    let state: User[] = state1 || [];

    const action = incomingAction as UserKnownAction | IdentityChangedAction;

    switch (action.type) {
        case 'USER_ADD':
            return [
                ...state/*,
                ...action.newMessage*/
            ];
        case 'USER_ADDED':
            return [
                ...state,
                action.user
            ];
        case 'USERS_RECEIVED_LIST':
            return [
                ...action.users
            ];
        case 'USERS_REQUEST_LIST':
            return [
                ...state
            ];
        case 'IDENTITY_CHANGED':
            return [];
        case 'CONVERSATION_USER_STATUS_CHANGED':
            return state.map(x => x.id === action.userId ? {
                ...x,
                status: action.status
            } as User : x);
        default:
            return state;
    };
}

const uiReducer: Reducer<Ui> = (state: Ui = initialUi, action: Action): Ui => {
    switch (action.type) {
        case 'CONVERSATION_REQUEST':
            return {
                ...state,
                isConversationLoading: true
            };
        case 'CONVERSATION_RECEIVED':
            return {
                ...state,
                isConversationLoading: false
            };
        case 'CONVERSATION_UI_DISABLE_LOADING_MORE_MESSAGES':
            return {
                ...state,
                canLoadMoreMessages: false
            };
        case 'CONVERSATION_UI_ENABLE_LOADING_MORE_MESSAGES':
            return {
                ...state,
                canLoadMoreMessages: true
            };
        case 'CONVERSATION_UI_LEFT_PANEL_DISPLAY_CONVERSATION_INVITE':
            return {
                ...state,
                leftPanel: {
                    ...state.leftPanel,
                    contentKind: LeftPanelContentKind.ConversationInvite
                }
            }
        case 'CONVERSATION_UI_LEFT_PANEL_DISPLAY_CONVERSATION_USERS':
            return {
                ...state,
                leftPanel: {
                    ...state.leftPanel,
                    contentKind: LeftPanelContentKind.ConversationUsers
                }
            }
        case 'CONVERSATION_UI_LEFT_PANEL_DISPLAY_CONVERSATIONS':
            return {
                ...state,
                leftPanel: {
                    ...state.leftPanel,
                    contentKind: LeftPanelContentKind.Conversations
                }
            }
        default:
            return state;
    }
}

const writingActivitiesReducer: Reducer<ReceivedWritingActivityStateItem[]> = (state: ReceivedWritingActivityStateItem[] = new Array<ReceivedWritingActivityStateItem>(), action1: Action): ReceivedWritingActivityStateItem[] => {
    const action = action1 as ConversationWritingActivityReceived
    switch (action.type) {
        case 'CONVERSATION_WRITING_ACTIVITY_RECEIVED':
            const itemOfUser = state.find(x => x.userId === action.writingActivityData.userId);

            // update state only if there's no data for the user yet, or if action contains newer change than the one already in store for the user
            if (!itemOfUser || (itemOfUser && itemOfUser.lastChange < action.writingActivityData.lastChange)) {
                const itemsOfOtherUsers = state.filter(x => x.userId !== action.writingActivityData.userId);
                return [
                    ...itemsOfOtherUsers,
                    {
                        activity: action.writingActivityData.activity,
                        lastChange: action.writingActivityData.lastChange,
                        userId: action.writingActivityData.userId
                    }
                ];
            }
            return state;
        default:
            return state;
    }
}



export const reducer = combineReducers<ConversationState>({
    detail: conversationDetailReducer,
    messages: messagesReducer,
    users: usersReducer,
    ui: uiReducer,
    writingActivities: writingActivitiesReducer,
    invitations: invitationsReducer
});