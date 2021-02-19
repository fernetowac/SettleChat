import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { ApplicationState } from './index';
import { fetchGet, fetchPost } from '../services/FetchService';
import { conversationActions } from './Conversation';
import { identityChangedActionCreator, messageAddedActionCreator } from './common'
import { AppDispatch } from '..';
import { ReduxType, ApiType } from '../types/commonTypes'

export type ConversationsState = ReduxType<{
    conversations: ConversationListItem[];
}>

export const InitialConversationsState: ConversationsState = {
    conversations: []
};

export interface ConversationListItem {
    id: string;
    title?: string;
    lastMessageText?: string;
    lastMessageUserId?: string;
    users: ConversationListItemUser[];
    lastActivityTimestamp: Date;
}

export interface ConversationListItemUser {
    id: string;
    userName: string;
    userNickName?: string;
}

export interface NewConversation {
    title: string;
    creator: ConversationUser;
    invitedUsers: ConversationUser[];
}

export interface ConversationUser {
    name: string;
    email: string;
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

const toReduxConversation = (conversationsResponseItem: ApiType<ConversationListItem>): ReduxType<ConversationListItem> => ({
    id: conversationsResponseItem.id,
    title: conversationsResponseItem.title,
    lastMessageText: conversationsResponseItem.lastMessageText,
    lastMessageUserId: conversationsResponseItem.lastMessageUserId,
    lastActivityTimestamp: new Date(conversationsResponseItem.lastActivityTimestamp).getTime(),
    users: conversationsResponseItem.users.map((conversationsResponseItemUser) => ({
        id: conversationsResponseItemUser.id,
        userName: conversationsResponseItemUser.userName,
        userNickName: conversationsResponseItemUser.userNickName
    }))
});

const toReduxConversations = (response: ApiType<ConversationListItem>[]): ReduxType<ConversationListItem>[] => response.map(toReduxConversation);

export const actionCreators = {
    addConversation: createAsyncThunk('conversations/addThunk', async (conversationInput: ApiType<NewConversation>) => {
        return await fetchPost<ApiType<ConversationListItem>>('/api/Conversations', conversationInput)
            .then(toReduxConversation)
    }),
    requestConversations: createAsyncThunk<ReduxType<ConversationListItem>[], void, { state: ApplicationState, dispatch: AppDispatch }>('conversations/requestConversations', (_, thunkAPI) => {
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = thunkAPI.getState();
        if (appState && appState.conversations) {
            return fetchGet<ApiType<ConversationListItem>[]>(`/api/conversations`)
                .then(toReduxConversations)
        } else {
            //TODO: maybe we should call some redux toolkit wrapper with error message here?
            return Promise.reject();
        }
    })
};

const conversationsSlice = createSlice({
    name: 'conversations',
    initialState: InitialConversationsState,
    reducers: {
        added: (state, action: PayloadAction<ReduxType<ConversationListItem>>) => {
            state.conversations.push(action.payload)
        },
        clear: (state) => {
            state.conversations = []
        }
    },
    extraReducers: (builder) => {
        //TODO: handle also adding new user to conversation
        builder
            .addCase(
                messageAddedActionCreator,
                (state, action) => {
                    const actionMessage = action.payload;
                    const conversation =
                        state.conversations.find(
                            (conversation) => conversation.id === actionMessage.conversationId);
                    if (!conversation) {
                        throw Error("Conversation for added message not found");
                    }
                    if (conversation.lastActivityTimestamp >= actionMessage.created) {
                        return state;
                    }
                    const otherConversations = state.conversations.filter(
                        (conversation) => conversation.id !== actionMessage.conversationId);
                    state.conversations = [
                        ...otherConversations,
                        {
                            ...conversation,
                            lastMessageText: actionMessage.text,
                            lastMessageUserId: actionMessage.userId,
                            lastActivityTimestamp: actionMessage.created
                        }
                    ]
                })
            .addCase(
                actionCreators.addConversation.fulfilled, (state, action) => {
                    state.conversations.push(action.payload)
                }
            )
            .addCase(
                actionCreators.requestConversations.fulfilled, (state, action) => {
                    state.conversations = action.payload
                }
            )
            .addCase(
                conversationActions.received, (state, action) => {
                    const actionConversation = action.payload;
                    const conversation =
                        state.conversations.find(
                            (conversation) => conversation.id === actionConversation.id);
                    if (!conversation) {
                        // we don't need to handle conversation update here when received single conversation is not in the list (yet)
                        return;
                    }

                    const otherConversations =
                        state.conversations.filter(
                            (conversation) => conversation.id !== actionConversation.id);
                    //TODO: update whole conversation including users list

                    state.conversations = [
                        ...otherConversations,
                        {
                            ...conversation,
                            title: actionConversation.title
                        }
                    ]
                }
            )
            .addCase(identityChangedActionCreator, (state) => {
                state.conversations = []
            })
    }
})

export const { actions, reducer: conversationsReducer } = conversationsSlice