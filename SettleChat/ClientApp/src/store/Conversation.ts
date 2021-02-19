import { Slice, combineReducers, createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ThunkAction } from 'redux-thunk';
import { ApplicationState } from './index';
import { fetchGet, fetchPost, fetchPut, fetchPatch, fetchDelete } from '../services/FetchService';
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions';
import { Invitation } from '../types/invitationTypes'
import { invitationsReducer } from '../reducers/invitationsReducer'
import { unionArray } from '../helpers/arrayHelper'
import SchemaKind from '../schemas/SchemaKind'
import { AppDispatch } from '../'
import { ApiMessage, Message } from '../types/messageTypes'
import { identityChangedActionCreator, messageAddedActionCreator } from './common'
import { ApiType, ReduxType } from '../types/commonTypes'

export interface ConversationState {
    detail: ConversationDetail | null;
    messages: Message[];
    users: ReduxConversationUser[];
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

export type ConversationUser = {
    userId: string;
    conversationId: string;
    userName: string;
    nickname: string | null;
    email: string | undefined;
    status: UserStatus;
    lastActivityTimestamp: Date | null;
}
type ReduxConversationUser = ReduxType<ConversationUser>

export interface NewUser {
    userName: string | undefined;
    email: string | undefined;
}

export enum UserStatus {
    Offline = 1,
    Online = 2,
    Inactive = 3
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

export interface ReceivedWritingActivityData {
    conversationId: string;
    userId: string;
    activity: WritingActivity;
    lastChange: Date;
}

export interface ReceivedWritingActivityStateItem {
    userId: string;
    activity: WritingActivity;
    /** unix timestamp in miliseconds */
    lastChange: number;
}

const createMessages = (response: ApiMessage[]): Message[] => response.map(
    (messageResponseItem) => ({
        ...messageResponseItem,
        created: new Date(messageResponseItem.created).getTime()
    } as Message)
);

export const transformMessageCreateResponse = (response: ApiMessage): Message => (
    {
        ...response,
        created: new Date(response.created).getTime()
    });

interface RequestMessagesInput {
    conversationId: string,
    beforeId?: string,
    amount?: number
}

const transformConversationUsers = (apiResponseItems: ApiType<ConversationUser>[]): ReduxType<ConversationUser>[] =>
    apiResponseItems.map((x) => ({
        ...x,
        lastActivityTimestamp: x.lastActivityTimestamp ? new Date(x.lastActivityTimestamp).getTime() : null
    }))

/**
* Retrieve messages from backend
* @param beforeId ID of message based on which only older messages will be retrieved
* @param amount Maximal number of messages to retrieve.
* @returns {} 
*/
export const requestMessages = createAsyncThunk<Message[], RequestMessagesInput, { dispatch: AppDispatch }>('messages/requestList', async ({ conversationId, beforeId, amount = 30 }: RequestMessagesInput, thunkAPI) => {
    let url = `/api/conversations/${conversationId}/messages?amount=${amount}`;
    if (beforeId) {
        url += `&beforeId=${encodeURIComponent(beforeId)}`;
    }
    return await fetchGet<ApiMessage[]>(url, true, SchemaKind.MessagesGetResponse)
        .then(createMessages)
})

export const actionCreators = {
    requestConversation1: createAsyncThunk<ConversationDetail | never, string, { dispatch: AppDispatch }>('conversation/request', async (conversationId, thunkAPI) => {
        thunkAPI.dispatch(conversationActions.request());
        const conversation = await fetchGet<ApiType<ConversationDetail>>(`/api/conversations/${conversationId}`)
        thunkAPI.dispatch(conversationActions.received(conversation));
        return conversation;
    }),
    patchConversation: createAsyncThunk<ConversationDetail, { conversationId: string, updatedProperties: ApiType<ConversationPatch> }, { state: ApplicationState, dispatch: AppDispatch }>('conversation/patch', async ({ conversationId, updatedProperties }, thunkAPI) => {
        const data = await fetchPatch<ApiType<ConversationDetail>>(`/api/conversations/${conversationId}`, updatedProperties)
        thunkAPI.dispatch(conversationActions.received(data));
        return data;

    }),
    addMessage: createAsyncThunk<Message, { text: string, conversationId: string }, { state: ApplicationState, dispatch: AppDispatch }>('messages/add', async ({ text, conversationId }, thunkAPI) => {
        const appState = thunkAPI.getState();
        if (!appState) {
            throw new Error('appState is undefined');
        }
        if (!appState.identity.isAuthenticated) {
            throw new Error('identity is not authenticated');
        }

        const messageInput = { userId: appState.identity.userId, text: text, created: new Date().toISOString() } as ApiMessage;//TODO: no need to send userId and date created, as backend can figure it out
        const message = await fetchPost<ApiMessage>(`/api/conversations/${conversationId}/messages`, messageInput)
            .then(transformMessageCreateResponse)
        thunkAPI.dispatch(messageAddedActionCreator(message));
        return message;
    }),
    updateWritingActivity: (writingActivity: ApiType<WritingActivityData>): ThunkAction<Promise<void>, ApplicationState, undefined, HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            const conversationState = getState().conversation;
            if (!conversationState || !conversationState.detail) {
                return Promise.reject('Conversation must be loaded in order to notify about it');
            }
            const conversationId = conversationState.detail.id;
            return fetchPut(`/api/conversations/${conversationId}/writingactivity`, writingActivity);
        },
    startListeningConversation: (connectionId: ApiType<string>, conversationId: string): ThunkAction<Promise<void>, ApplicationState, undefined, HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            return fetchPost(`/api/notifications/conversations/${conversationId}`, connectionId)
        },
    stopListeningConversation: (connectionId: string, conversationId: string): ThunkAction<Promise<void>, ApplicationState, undefined, HttpFailStatusReceivedAction> =>
        (dispatch, getState, extraArgument) => {
            return fetchDelete(`/api/notifications/conversations/${conversationId}`, connectionId)
        },
    requestUsers: createAsyncThunk<ReduxType<ConversationUser>[], void, { state: ApplicationState }>('users/requestUsers', async (_, thunkAPI) => {
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = thunkAPI.getState();
        if (!appState || !appState.conversation || !appState.conversation.detail) {
            throw Error('appState or its conversation is undefined');
        }

        const conversationId = appState.conversation.detail.id;
        return await fetchGet<ApiType<ConversationUser>[]>(`/api/conversations/${conversationId}/users`)
            .then(transformConversationUsers)
    })
};

const conversationSlice = createSlice({
    name: 'conversation',
    initialState: null as ConversationDetail | null,
    reducers: {
        request: () => { },
        received: (_state, action: PayloadAction<ConversationDetail>) => {
            return {
                id: action.payload.id,
                title: action.payload.title,
                isPublic: action.payload.isPublic
            }
        }
    },
    extraReducers: (builder) => {
        builder.addCase(
            actionCreators.patchConversation.fulfilled, (_state, action) => {
                return {
                    id: action.payload.id,
                    title: action.payload.title,
                    isPublic: action.payload.isPublic
                }
            })
            .addCase(identityChangedActionCreator, (_state) => {
                return null
            })
    }
})

export const { actions: conversationActions } = conversationSlice

//TODO: make sure all the messages are related to the conversation
// Note that items in state are not sorted. UI component manages sorting instead.
const messagesSlice: Slice<Message[], {}, 'messages'> = createSlice({
    name: 'messages',
    initialState: [] as Message[],
    reducers: {},
    extraReducers: (builder) => builder
        .addCase(messageAddedActionCreator, (state, action: PayloadAction<Message>) => {
            // don't change state, when the message already exists in the state
            const existingMessage = state.find(x => x.id === action.payload.id);
            if (existingMessage) {
                const equals = JSON.stringify(existingMessage) === JSON.stringify(action.payload);
                if (equals) {
                    return;
                }
            }

            //TODO: can be probably simplyfied with immer
            return [
                ...state.filter(x => x.id !== action.payload.id), //TODO: handle read/sent flags
                {
                    ...action.payload
                }
            ];
        })
        .addCase(requestMessages.fulfilled, (state, action) => {
            return [...unionArray<Message>(action.payload, state)]
        })
        .addCase(identityChangedActionCreator, () => {
            return []
        })
})

export const { actions: messagesActions } = messagesSlice

const usersSlice = createSlice({
    name: 'users',
    initialState: [] as ReduxConversationUser[],
    reducers: {
        added: (state, action: PayloadAction<ReduxConversationUser>) => {
            //TODO: replace if such combination of {userId, conversationId} already exists
            state.push(action.payload)
        },
        userStatusChanged: (state, action: PayloadAction<{ userId: string, status: UserStatus }>) => {
            // TODO: maybe it can be simplified with immer
            return state.map(x => x.userId === action.payload.userId ? {
                ...x,
                status: action.payload.status
            } as ReduxType<ConversationUser> : x)
        },
        // this is probably duplicate of added
        conversationUserAdded: (state, action: PayloadAction<ReduxConversationUser>) => {
            const foundUserArrayIndex = state.findIndex(x => x.userId === action.payload.userId && x.conversationId === action.payload.conversationId);
            if (foundUserArrayIndex === -1) {
                state.push(action.payload)
            } else {
                state[foundUserArrayIndex] = action.payload
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(actionCreators.requestUsers.fulfilled, (state, action) => {
                //TODO: keep users of other conversationIds
                return action.payload
            })
            .addCase(identityChangedActionCreator, () => {
                return []
            })
    }
})

export const { actions: usersActions } = usersSlice

const uiSlice = createSlice({
    name: 'ui',
    initialState: initialUi,
    reducers: {
        enableLoadingMoreMessages: (state) => {
            if (!state.canLoadMoreMessages) {
                state.canLoadMoreMessages = true
            }
        },
        disableLoadingMoreMessages: (state) => {
            if (state.canLoadMoreMessages) {
                state.canLoadMoreMessages = false
            }
        },
        leftPanelDisplayConversationInvite: (state) => {
            state.leftPanel.contentKind = LeftPanelContentKind.ConversationInvite
        },
        leftPanelDisplayConversationUsers: (state) => {
            state.leftPanel.contentKind = LeftPanelContentKind.ConversationUsers
        },
        leftPanelDisplayConversations: (state) => {
            state.leftPanel.contentKind = LeftPanelContentKind.Conversations
        }
    },
    extraReducers: (builder) => {
        builder.addCase(
            conversationActions.request, (state) => {
                if (!state.isConversationLoading) {
                    state.isConversationLoading = true
                }
            })
            .addCase(
                conversationActions.received, (state) => {
                    if (state.isConversationLoading) {
                        state.isConversationLoading = false
                    }
                })
    }
})

export const { actions: conversationUiActions } = uiSlice

const writingActivitiesSlice = createSlice({
    name: 'writingActivities',
    initialState: [] as ReceivedWritingActivityStateItem[],
    reducers: {
        received: (state, action: PayloadAction<ReceivedWritingActivityStateItem>) => {
            const itemOfUser = state.find(x => x.userId === action.payload.userId);
            // update state only if there's no data for the user yet, or if action contains newer change than the one already in store for the user
            if (!itemOfUser || (itemOfUser && itemOfUser.lastChange < action.payload.lastChange)) {
                const itemsOfOtherUsers = state.filter(x => x.userId !== action.payload.userId);
                return [
                    ...itemsOfOtherUsers,
                    {
                        ...action.payload
                    }
                ];
            }
        }
    }
})

export const { actions: writingActivitiesActions } = writingActivitiesSlice

export const reducer = combineReducers<ConversationState>({
    detail: conversationSlice.reducer,
    messages: messagesSlice.reducer,
    users: usersSlice.reducer,
    ui: uiSlice.reducer,
    writingActivities: writingActivitiesSlice.reducer,
    invitations: invitationsReducer
});