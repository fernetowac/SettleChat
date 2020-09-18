import { Reducer, Action, combineReducers } from 'redux';
import { AppThunkAction, AppThunkAction1 } from './index';
import authService from '../components/api-authorization/AuthorizeService';
import { IdentityChangedAction } from './Identity';

export interface ConversationState {
    conversation: ConversationDetail;
    messages: Message[];
    users: User[];
    me: User;
}

export interface ConversationDetail {
    id: string | undefined;
    title: string;
    isLoading: boolean;
    me: User | undefined;
}

export interface Message {
    id: string | undefined;
    text: string;
    userId: string;
}

interface MessageCreateResponse {
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

type ConversationKnownAction = ConversationRequestAction | ConversationReceivedAction;
type MessageKnownAction = MessageAddAction | MessageAddedAction | MessagesRequestListAction | MessagesReceiveListAction;
type UserKnownAction = UserAddAction | UserAddedAction | UsersRequestListAction | UsersReceivedListAction;
type KnownAction = ConversationKnownAction | MessageKnownAction;

export const actionCreators = {
    messageAdded(message: MessageCreateResponse): MessageAddedAction {
        return {
            type: 'MESSAGE_ADDED',
            message: message
        }
    },
    requestConversation: (conversationId: string): AppThunkAction1<ConversationKnownAction | AppThunkAction<MessageKnownAction, void>> =>
        (dispatch, getState) => {
            dispatch({ type: 'CONVERSATION_REQUEST', id: conversationId });
            return authService.getAccessToken()
                .then(token => {
                    //TODO: handle unauthorized when !token

                    fetch(`/api/conversations/${conversationId}`,
                        {
                            cache: "no-cache",
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        })
                        .then(response => response.json() as Promise<ConversationDetail>)
                        .then(data => {
                            dispatch({ type: 'CONVERSATION_RECEIVED', conversation: data });
                            dispatch(actionCreators.requestMessages());
                        });
                });
        },
    requestMessages: (): AppThunkAction<MessageKnownAction, void> => (dispatch, getState) => {
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = getState();
        if (appState && appState.conversation) {
            dispatch({ type: 'MESSAGES_REQUEST_LIST' });
            const conversationId = appState.conversation.conversation.id;
            return authService.getAccessToken()
                .then(token => {
                    //TODO: handle unauthorized when !token
                    fetch(`/api/conversations/${conversationId}/messages`,
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
                        })
                        .catch(error => console.error(error.message));
                });
        } else {
            //TODO: raise exception
            return Promise.resolve();
        }
    },
    addMessage: (text: string): AppThunkAction<MessageKnownAction, void> => (dispatch, getState) => {
        const appState = getState();
        if (appState && appState.conversation) {
            const messageInput = { userId: appState.conversation.me.id, text: text } as Message;
            dispatch({ type: 'MESSAGE_ADD', newMessage: messageInput });
            const conversationId = appState.conversation.conversation.id;
            return authService.getAccessToken()
                .then(token => {
                    //TODO: handle unauthorized when !token
                    fetch(`/api/conversations/${conversationId}/messages`,
                        {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(messageInput)
                        })
                        .then(data => data.json() as Promise<MessageCreateResponse>)
                        .then(data => {
                            dispatch({ type: 'MESSAGE_ADDED', message: data });
                        })
                        .catch((error) => console.error('Error:', error));
                });
        } else {
            //TODO: raise exception
            return Promise.resolve();
        }
    },
    requestUsers: (): AppThunkAction<UserKnownAction, void> => (dispatch, getState) => {
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = getState();
        if (appState && appState.conversation) {
            dispatch({ type: 'USERS_REQUEST_LIST' });
            const conversationId = appState.conversation.conversation.id;
            return authService.getAccessToken()
                .then(token => {
                    //TODO: handle unauthorized when !token
                    fetch(`/api/conversations/${conversationId}/users`,
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
            //TODO: raise exception
            return Promise.resolve();
        }
    },
    //addUser: (newUser: NewUser): AppThunkAction<UserKnownAction, void> => (dispatch, getState) => {
    //    const appState = getState();
    //    if (appState && appState.conversation) {
    //        dispatch({ type: 'USER_ADD', user: newUser });
    //        const conversationId = appState.conversation.conversation.id;
    //        return authService.getAccessToken()
    //            .then(token => {
    //                //TODO: handle unauthorized when !token
    //                fetch(`/api/conversations/${conversationId}/users`,
    //                    {
    //                        method: 'POST',
    //                        headers: {
    //                            'Accept': 'application/json',
    //                            'Content-Type': 'application/json',
    //                            'Authorization': `Bearer ${token}`
    //                        },
    //                        body: JSON.stringify(newUser)
    //                    })
    //                    .then(data => data.json() as Promise<UninvitedUser>)
    //                    .then(data => {
    //                        dispatch({ type: 'USER_ADDED', user: data });
    //                    });
    //            });
    //    } else {
    //        //TODO: raise exception
    //        return Promise.resolve();
    //    }
    //},
    userAdded: (user: User): UserAddedAction => {
        return {
            type: 'USER_ADDED',
            user: user
        } as UserAddedAction;
    }
};

const InitialConversationDetail: ConversationDetail = {
    id: undefined,
    title: '',
    isLoading: false,
    me: undefined
};
export const conversationReducer: Reducer<ConversationDetail> = (state: ConversationDetail | undefined = InitialConversationDetail, incomingAction: Action): ConversationDetail => {
    state = state as ConversationDetail

    const action = incomingAction as ConversationKnownAction | IdentityChangedAction;

    switch (action.type) {
        case 'CONVERSATION_REQUEST':
            return {
                ...state,
                isLoading: true
            };
        case 'CONVERSATION_RECEIVED':
            return {
                ...state,
                id: action.conversation.id,
                title: action.conversation.title,
                isLoading: false
            };
        case 'IDENTITY_CHANGED':
            return {
                ...InitialConversationDetail
            };
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
        default:
            return state;
    };
}

const userUnloadedState: User = { id: '', status: UserStatus.Online, email: '', userName: '', lastActivityTimestamp: null };

export const meReducer: Reducer<User> = (state1: User | undefined, incomingAction: Action<'CONVERSATION_RECEIVED'>): User => {
    let state: User = state1 || userUnloadedState;

    const action = incomingAction as ConversationReceivedAction;

    switch (incomingAction.type) {
        case 'CONVERSATION_RECEIVED':
            return action.conversation.me as User;
        default:
            return state;
    };
}

export const reducer = combineReducers<ConversationState>({
    conversation: conversationReducer,
    messages: messagesReducer,
    users: usersReducer,
    me: meReducer
});

//export const reducer: Reducer<ConversationState> = (state: ConversationState | undefined, incomingAction: Action): ConversationState => {
//    if (!state) {
//        state = {
//            conversations: [], inputConversation: <Conversation>{}
//        }
//    }

//    const action = incomingAction as KnownAction;

//    switch (action.type) {
//        case 'CONVERSATION_ADD':
//            return {
//                conversations: [
//                    ...state.conversations,
//                    {
//                        ...action.newConversation
//                    }],
//                inputConversation: { ...action.newConversation }
//            };
//        case 'CONVERSATION_ADDED':
//            return {
//                conversations: [...state.conversations],
//                inputConversation: <Conversation>{}
//            };
//        case 'CONVERSATION_RECEIVE_LIST':
//            return {
//                conversations: [...action.conversations],
//                inputConversation: {
//                    ...state.inputConversation
//                }
//            };
//        case 'CONVERSATION_REQUEST_LIST':
//            return {
//                conversations: [...state.conversations],
//                inputConversation: {
//                    ...state.inputConversation
//                }
//            };
//        default:
//            return state;
//    };
//}