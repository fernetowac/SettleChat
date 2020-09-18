import { Reducer, Action } from 'redux';
import { AppThunkAction } from './index';
import { push, RouterAction } from 'connected-react-router';
import { StatusCodes } from 'http-status-codes';
import authService from '../components/api-authorization/AuthorizeService';
import { IdentityChangedAction } from './Identity';

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

type KnownAction = ConversationAddPipelineAction | ReceiveListAction | RequestListAction
type ConversationAddPipelineAction = AddAction | AddedAction | RouterAction;

export const actionCreators = {
    addConversation: (conversationInput: NewConversation): AppThunkAction<ConversationAddPipelineAction, void> => (dispatch, getState) => {
        const appState = getState();
        if (appState && appState.conversations) {
            dispatch({ type: 'CONVERSATION_ADD' });

            return fetch('/api/Conversations',
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(conversationInput)
                })
                .then(response => { /*response.status == StatusCodes.OK?*/
                    if (response.status === StatusCodes.OK || response.status === StatusCodes.CREATED) {
                        return response.json() as Promise<ConversationCreateResponse>;
                    } else if (response.status === StatusCodes.UNAUTHORIZED) {
                        dispatch(push(`/authentication/login`));
                        return Promise.reject('Unauthorized');
                    }
                })
                .then(data => {
                    if (data) {
                        dispatch({
                            type: 'CONVERSATION_ADDED', conversation: {
                                id: data.id,
                                title: data.title
                            } as Conversation
                        });
                        dispatch(push(`/conversation/${data.id}`));
                    }
                },
                    error => {
                        console.error(error);
                    })
                .catch(error => console.log('error: ', error));
        } else {
            return Promise.resolve();
        }
    },
    requestConversations: (): AppThunkAction<KnownAction, void> => (dispatch, getState) => {
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = getState();
        if (appState && appState.conversations) {
            dispatch({ type: 'CONVERSATIONS_REQUEST_LIST' });
            return authService.getAccessToken()
                .then(token => {
                    //TODO: handle unauthorized when !token
                    fetch(`/api/conversations`,
                        {
                            cache: "no-cache",
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        })
                        .then(response => response.json() as Promise<Conversation[]>)
                        .then(data => {
                            dispatch({ type: 'CONVERSATIONS_RECEIVED_LIST', conversations: data });
                        })
                        .catch((error) => console.error('Error:', error));
                });
        } else {
            return Promise.reject();
        }
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