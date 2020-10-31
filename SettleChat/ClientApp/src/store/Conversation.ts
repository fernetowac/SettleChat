import { Reducer, Action, combineReducers } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { AppThunkAction, ApplicationState } from './index';
import authService from '../components/api-authorization/AuthorizeService';
import { IdentityChangedAction } from './Identity';
import { fetchGet, fetchPost, fetchPut, fetchDelete } from '../services/FetchService';
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions';

export interface ConversationState {
    conversation: ConversationDetail | null;
    messages: Message[];
    users: User[];
    ui: Ui;
    writingActivities: ReceivedWritingActivityStateItem[];
}

export interface ConversationDetail {
    id: string;
    title: string;
}

export interface Message {
    id: string | undefined;
    text: string;
    userId: string;
}

export interface MessageCreateResponse {
    id: string;
    text: string;
    userId: string;
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
    message: MessageCreateResponse;
}

export interface MessagesRequestListAction {
    type: 'MESSAGES_REQUEST_LIST';
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


interface Ui {
    isConversationLoading: boolean
}

const initialUi: Ui = {
    isConversationLoading: false
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

export type ConversationKnownAction = ConversationRequestAction | ConversationReceivedAction;
export type MessageKnownAction = MessageAddAction | MessageAddedAction | MessagesRequestListAction | MessagesReceiveListAction;
type UserKnownAction = UserAddAction | UserAddedAction | UsersRequestListAction | UsersReceivedListAction | ConversationUserStatusChanged;
type KnownAction = ConversationKnownAction | MessageKnownAction;

export const actionCreators = {
    messageAdded(message: MessageCreateResponse): MessageAddedAction {
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
                .then(data => {
                    dispatch({ type: 'CONVERSATION_RECEIVED', conversation: data });
                    return data;
                });
        },
    requestMessages: (): ThunkAction<Promise<Message[] | void>, ApplicationState, undefined, MessageKnownAction> =>//AppThunkAction<MessageKnownAction, void> =>
        (dispatch, getState) => {
            // Only load data if it's something we don't already have (and are not already loading)
            const appState = getState();
            if (appState && appState.conversation && appState.conversation.conversation) {
                dispatch({ type: 'MESSAGES_REQUEST_LIST' });
                const conversationId = appState.conversation.conversation.id;
                return authService.getAccessToken()
                    .then(token => {
                        //TODO: handle unauthorized when !token
                        return fetch(`/api/conversations/${conversationId}/messages`,
                            {
                                cache: "no-cache",
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                }
                            })
                            .then(response => response.json() as Promise<Message[]>)
                            .then(data => {
                                dispatch({ type: 'MESSAGES_RECEIVE_LIST', messages: data });
                                return data;
                            })
                            .catch(error => console.error(error.message));
                    });
            } else {
                return Promise.reject('appState or its conversation is undefined');
            }
        },
    addMessage: (text: string): ThunkAction<Promise<MessageCreateResponse>, ApplicationState, undefined, MessageKnownAction | HttpFailStatusReceivedAction> =>
        (dispatch, getState) => {
            const appState = getState();
            if (!appState) {
                return Promise.reject('appState is undefined');
            }
            if (!appState.identity.isAuthenticated) {
                return Promise.reject('identity is not authenticated');
            }
            if (!appState.conversation || !appState.conversation.conversation) {
                return Promise.reject('conversation not in store');
            }
            const messageInput = { userId: appState.identity.userId, text: text } as Message;
            dispatch({ type: 'MESSAGE_ADD', newMessage: messageInput });
            const conversationId = appState.conversation.conversation.id;
            return fetchPost<MessageCreateResponse>(`/api/conversations/${conversationId}/messages`,
                messageInput,
                dispatch)
                .then(data => {
                    dispatch({ type: 'MESSAGE_ADDED', message: data });
                    return data;
                });
        },
    updateWritingActivity: (writingActivity: WritingActivityData): ThunkAction<Promise<void>, ApplicationState, undefined, HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            const conversationState = getState().conversation;
            if (!conversationState || !conversationState.conversation) {
                return Promise.reject('Conversation must be loaded in order to notify about it');
            }
            const conversationId = conversationState.conversation.id;
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
        if (appState && appState.conversation && appState.conversation.conversation) {
            dispatch({ type: 'USERS_REQUEST_LIST' });
            const conversationId = appState.conversation.conversation.id;
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

export const conversationReducer: Reducer<ConversationDetail | null> = (state: ConversationDetail | null = null, incomingAction: Action): ConversationDetail | null => {
    const action = incomingAction as ConversationKnownAction | IdentityChangedAction;

    switch (action.type) {
        case 'CONVERSATION_REQUEST':
            return state;
        case 'CONVERSATION_RECEIVED':
            return {
                id: action.conversation.id,
                title: action.conversation.title,
            };
        case 'IDENTITY_CHANGED':
            return null;
        default:
            return state;
    }
}

export const messagesReducer: Reducer<Message[]> = (state1: Message[] | undefined, incomingAction: Action): Message[] => {
    let state: Message[] = state1 || [];

    const action = incomingAction as MessageKnownAction | IdentityChangedAction;

    switch (action.type) {
        case 'MESSAGE_ADD':
            return [
                ...state/*,
                ...action.newMessage*/
            ];
        case 'MESSAGE_ADDED':
            // don't change state, when the message already exists in the state
            const existingMessage = state.find(x => x.id === action.message.id);
            if (existingMessage) {
                const equals = JSON.stringify(existingMessage) === JSON.stringify(action.message);
                if (equals) {
                    return state;
                }
            }

            return [
                ...state, //TODO: handle read/sent flags
                {
                    id: action.message.id,
                    text: action.message.text,
                    userId: action.message.userId
                }
            ];
        case 'MESSAGES_RECEIVE_LIST':
            return [
                ...action.messages
            ];
        case 'MESSAGES_REQUEST_LIST':
            return [
                ...state
            ];
        case 'IDENTITY_CHANGED':
            return [];
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
        default:
            return state;
    }
}

const writingActivitiesReducer: Reducer<ReceivedWritingActivityStateItem[]> = (state: ReceivedWritingActivityStateItem[] = new Array<ReceivedWritingActivityStateItem>(), action1: Action): ReceivedWritingActivityStateItem[] => {
    const action = action1 as ConversationWritingActivityReceived
    switch (action.type) {
        case 'CONVERSATION_WRITING_ACTIVITY_RECEIVED':
            const itemsOfOtherUsers = state.filter(x => x.userId !== action.writingActivityData.userId);
            const itemOfUser = state.find(x => x.userId === action.writingActivityData.userId);

            // update state only if there's no data for the user yet, or if action contains newer change than the one already in store for the user
            if (!itemOfUser || (itemOfUser && itemOfUser.lastChange < action.writingActivityData.lastChange)) {
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
    conversation: conversationReducer,
    messages: messagesReducer,
    users: usersReducer,
    ui: uiReducer,
    writingActivities: writingActivitiesReducer
});