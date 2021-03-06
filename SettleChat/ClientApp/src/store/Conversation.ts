import { createEntityAdapter, EntityState, Slice, combineReducers, createAsyncThunk, createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit'
import { ApplicationState } from './index';
import { fetchGet, fetchPost, fetchPut, fetchDelete } from '../services/FetchService';
import { Invitation } from '../types/invitationTypes'
import { invitationsReducer } from '../reducers/invitationsReducer'
import SchemaKind from '../schemas/SchemaKind'
import { Message } from '../types/messageTypes'
import { ConversationUserResponse, ConversationUserMeta } from '../types/conversationUserTypes'
import { User, UserStatus } from '../types/userTypes'
import { conversationUserAdded, identityChangedActionCreator, messageAddedActionCreator, requestConversationsWithUsers } from './common'
import { omit, groupBy, mapValues } from 'lodash'
import { AppThunkApiConfig } from '../types/commonTypes';
import { conversationDetailsReducer, addConversation, allConversationsSelector } from './conversationDetails'
import { ConversationDetail } from '../types/conversationTypes';
import { requestMessages as requestMessagesForAllConversations } from './messages'
import { Descending, highestBy } from '../helpers/sortHelper';

export interface ConversationState {
    detail: EntityState<ConversationDetail>;
    messages: EntityState<Message>;
    conversationUsers: EntityState<ConversationUserMeta>,
    users: EntityState<User>,
    ui: Ui;
    writingActivities: ReceivedWritingActivityStateItem[];
    invitations: Invitation[];
}

export type ConversationUsersResponse = ConversationUserResponse[]

const normalizeConversationUsersResponse = (response: ConversationUsersResponse): { conversationUsers: ConversationUserMeta[], users: User[] } => {
    return {
        conversationUsers: response.map(x => omit(x, 'user')),
        users: response.map((x) => x.user)
    }
}

export type ConversationUser = {
    userId: string;
    conversationId: string;
    userName: string;
    nickname: string | null;
    email: string | undefined;
    status: UserStatus;
    lastActivityTimestamp: string | null;
}

export interface NewUser {
    userName: string | undefined;
    email: string | undefined;
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

export type WritingActivityData = {
    activity: WritingActivity;
}

export enum WritingActivity {
    IsWriting = 1,
    StoppedWriting = 2
}

export interface ReceivedWritingActivityData {
    conversationId: string;
    userId: string;
    activity: WritingActivity;
}

export interface ReceivedWritingActivity {
    userId: string;
    activity: WritingActivity;
}

export interface ReceivedWritingActivityStateItem extends ReceivedWritingActivityData {
    lastChangeClientUnixTimeInMs: number;
}

interface RequestMessagesInput {
    conversationId: string,
    beforeId?: string,
    amount?: number
}

export type NewMessageRequest = {
    text: string
}

/**
* Retrieve messages from backend
* @param beforeId ID of message based on which only older messages will be retrieved
* @param amount Maximal number of messages to retrieve.
* @returns {} 
*/
export const requestMessages = createAsyncThunk('messages/requestList', async ({ conversationId, beforeId, amount = 30 }: RequestMessagesInput) => {
    let url = `/api/conversations/${conversationId}/messages?amount=${amount}`;
    if (beforeId) {
        url += `&beforeId=${encodeURIComponent(beforeId)}`;
    }
    return await fetchGet<Message[]>(url, true, SchemaKind.MessagesGetResponse)
})

export const actionCreators = {
    addMessage: createAsyncThunk<Message, { text: string, conversationId: string }, AppThunkApiConfig>('messages/add', async ({ text, conversationId }, thunkAPI) => {
        const appState = thunkAPI.getState();
        if (!appState) {
            throw new Error('appState is undefined');
        }
        if (!appState.identity.isAuthenticated || !appState.identity.userId) {
            throw new Error('identity is not authenticated');
        }

        const messageInput: NewMessageRequest = { text: text }
        const message = await fetchPost<Message>(`/api/conversations/${conversationId}/messages`, messageInput)
        thunkAPI.dispatch(messageAddedActionCreator(message));
        return message;
    }),
    updateWritingActivity: createAsyncThunk<void, { conversationId: string, writingActivity: WritingActivityData }, AppThunkApiConfig>('writingActivity/update', async ({ conversationId, writingActivity }, thunkAPI) => {
        const conversationState = thunkAPI.getState().conversation;
        if (!conversationState || !conversationState.detail) {
            throw Error('Conversation must be loaded in order to notify about it');
        }
        return await fetchPut<void>(`/api/conversations/${conversationId}/writingactivity`, writingActivity);
    }),
    startListeningConversation: createAsyncThunk<void, { connectionId: string, conversationId: string }>('conversation/startListening', ({ connectionId, conversationId }) =>
        fetchPost<void>(`/api/notifications/conversations/${conversationId}`, connectionId)
    ),
    stopListeningConversation: createAsyncThunk<void, { connectionId: string, conversationId: string }>('conversation/stopListening', async ({ connectionId, conversationId }) =>
        await fetchDelete<void>(`/api/notifications/conversations/${conversationId}`, connectionId)
    ),
    requestConversationUsers: createAsyncThunk<{ conversationUsers: ConversationUserMeta[], users: User[] }, string, AppThunkApiConfig>('users/requestUsers', async (conversationId, thunkAPI) => {
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = thunkAPI.getState();
        if (!appState || !appState.conversation || !appState.conversation.detail) {
            throw Error('appState or its conversation is undefined');
        }

        return await fetchGet<ConversationUsersResponse>(`/api/conversations/${conversationId}/users`)
            .then(normalizeConversationUsersResponse)
    })
};

const messagesEntityAdapter = createEntityAdapter<Message>()

//TODO: make sure all the messages are related to the conversation
// Note that items in state are not sorted. UI component manages sorting instead.
const messagesSlice = createSlice({
    name: 'messages',
    initialState: messagesEntityAdapter.getInitialState(),
    reducers: {},
    extraReducers: (builder) => builder
        .addCase(messageAddedActionCreator, messagesEntityAdapter.upsertOne)
        .addCase(requestMessages.fulfilled, messagesEntityAdapter.upsertMany)
        .addCase(identityChangedActionCreator, messagesEntityAdapter.getInitialState)
        .addCase(requestMessagesForAllConversations.fulfilled, messagesEntityAdapter.upsertMany)
})

export const allMessagesSelector = messagesEntityAdapter.getSelectors<ApplicationState>((state) => state.conversation.messages).selectAll
export const messagesOfConversationSelector = (state: ApplicationState, { conversationId }: { conversationId: string }) =>
    allMessagesSelector(state).filter((message) => message.conversationId === conversationId)

/**
 * Selector returning dictionary of last message by conversation id
 * */
export const selectLastMessagePerConversation = createSelector(
    allMessagesSelector,
    (messages) => mapValues(
        groupBy(messages, (message) => message.conversationId),
        (value) => {
            const mostRecentMessagePerConversation = highestBy(value, (x) => x.created)
            if (!mostRecentMessagePerConversation) {
                throw new Error('Each group should contain at least one message')
            }
            return mostRecentMessagePerConversation
        }
    )
)

export const { actions: messagesActions } = messagesSlice

export const usersAdapter = createEntityAdapter<User>()
export const { selectById: selectUserById } = usersAdapter.getSelectors((state: ApplicationState) => state.conversation.users)

const usersSlice = createSlice({
    name: 'users',
    initialState: usersAdapter.getInitialState(),
    reducers: {
        addOne: usersAdapter.addOne,
        updateOne: usersAdapter.updateOne,
    },
    extraReducers: builder => {
        builder
            .addCase(
                actionCreators.requestConversationUsers.fulfilled,
                (state, action) => usersAdapter.upsertMany(state, action.payload.users)
            )
            .addCase(
                conversationUserAdded,
                (state, action) => usersAdapter.addOne(state, action.payload.user)
            )
            .addCase(
                requestConversationsWithUsers.fulfilled,
                (state, action) => usersAdapter.upsertMany(state, action.payload.users)
            )
            .addCase(
                addConversation.fulfilled,
                (state, action) => usersAdapter.upsertMany(state, action.payload.users)
            )
            .addCase(
                identityChangedActionCreator,
                usersAdapter.getInitialState
            )
    }

})

export const { updateOne: updateOneUser } = usersSlice.actions

export const conversationUsersAdapter = createEntityAdapter<ConversationUserMeta>()
export const { selectAll: selectAllConversationUsers } = conversationUsersAdapter.getSelectors((state: ApplicationState) => state.conversation.conversationUsers)

const conversationUsersSlice = createSlice({
    name: 'conversationUsers',
    initialState: conversationUsersAdapter.getInitialState(),
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(
                actionCreators.requestConversationUsers.fulfilled,
                (state, action) => conversationUsersAdapter.upsertMany(state, action.payload.conversationUsers)
            )
            .addCase(
                conversationUserAdded,
                (state, action) => conversationUsersAdapter.addOne(state, action.payload.conversationUser)
            )
            .addCase(
                requestConversationsWithUsers.fulfilled,
                (state, action) => conversationUsersAdapter.upsertMany(state, action.payload.conversationUsers)
            )
            .addCase(
                addConversation.fulfilled,
                (state, action) => conversationUsersAdapter.upsertMany(state, action.payload.conversationUsers)
            )
            .addCase(
                identityChangedActionCreator,
                conversationUsersAdapter.getInitialState
            )
    }
})

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
            requestConversationsWithUsers.pending, (state) => {
                if (!state.isConversationLoading) {
                    state.isConversationLoading = true
                }
            })
            .addCase(
                requestConversationsWithUsers.fulfilled, (state) => {
                    if (state.isConversationLoading) {
                        state.isConversationLoading = false
                    }
                })
    }
})

export const { actions: conversationUiActions } = uiSlice
//Note: We should never compare client time with server time, there can be precission errors and we cannot guarantee the client time is correctly set.
const writingActivitiesSlice = createSlice({
    name: 'writingActivities',
    initialState: [] as ReceivedWritingActivityStateItem[],
    reducers: {
        received: {
            reducer: (state, action: PayloadAction<ReceivedWritingActivityStateItem>) => {
                const itemOfUserConversation = state.find(x => x.userId === action.payload.userId && x.conversationId === action.payload.conversationId);
                // update state only if there's no data for the {user,conversation} combination yet, or if action contains newer change than the one already in store for the combination
                if (!itemOfUserConversation || (itemOfUserConversation && itemOfUserConversation.lastChangeClientUnixTimeInMs < action.payload.lastChangeClientUnixTimeInMs)) {
                    const itemsOfOtherUsers = state.filter(x => x.userId !== action.payload.userId || x.conversationId !== action.payload.conversationId);
                    return [
                        ...itemsOfOtherUsers,
                        {
                            ...action.payload
                        }
                    ];
                }
            },
            prepare: (writingActivity: ReceivedWritingActivityData) => ({
                payload: {
                    ...writingActivity,
                    lastChangeClientUnixTimeInMs: new Date().getTime()
                }
            })
        }
    }
})

export const { actions: writingActivitiesActions } = writingActivitiesSlice

export const reducer = combineReducers<ConversationState>({
    detail: conversationDetailsReducer,
    messages: messagesSlice.reducer,
    conversationUsers: conversationUsersSlice.reducer,
    users: usersSlice.reducer,
    ui: uiSlice.reducer,
    writingActivities: writingActivitiesSlice.reducer,
    invitations: invitationsReducer
});

export const userByIdSelector = usersAdapter.getSelectors<ApplicationState>((state) => state.conversation.users).selectById
export const allUsersSelector = usersAdapter.getSelectors<ApplicationState>((state) => state.conversation.users).selectAll
export const allConversationUsersSelector = conversationUsersAdapter.getSelectors<ApplicationState>((state) => state.conversation.conversationUsers).selectAll
export const conversationUsersByConversationIdSelector = (state: ApplicationState, { conversationId }: { conversationId: string }) =>
    allConversationUsersSelector(state).filter((conversationUser) => conversationUser.conversationId === conversationId)


export function conversationUserByIdsSelector(state: ApplicationState, { userId, conversationId }: { userId: string, conversationId: string }) {
    return allConversationUsersSelector(state)
        .find((conversationUser) =>
            conversationUser.userId === userId &&
            conversationUser.conversationId === conversationId
        )
}

export const selectUsersByConversationId = createSelector(
    allUsersSelector,
    conversationUsersByConversationIdSelector,
    (users, conversationUsers) =>
        !conversationUsers ?
            [] :
            users.filter((user) =>
                conversationUsers.some((conversationUser) => conversationUser.userId === user.id)
            )
)

const getSortedConversations = (conversations: ConversationDetail[], lastMessagePerConversation: { [conversationId: string]: Message }): (ConversationDetail & { lastActivityTimestamp: string })[] =>
    [...conversations]
        .map((conversation) => ({
            ...conversation,
            lastActivityTimestamp: lastMessagePerConversation[conversation.id] && lastMessagePerConversation[conversation.id].created || conversation.created
        })
        )
        .sort(Descending.by(conversation => conversation.lastActivityTimestamp));

/**
 * Memoized sorting of conversations by last message created date with fallback to conversation created date
 */
export const sortedConversationsSelector = createSelector([allConversationsSelector, selectLastMessagePerConversation], getSortedConversations);