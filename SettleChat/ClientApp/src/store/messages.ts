import { createAsyncThunk, createEntityAdapter, createSlice, createSelector } from '@reduxjs/toolkit'
import { ApplicationState } from './index';
import { fetchGet, fetchPost } from '../services/FetchService'
import { problemDetailsThunkOptions, identityChangedActionCreator, messageAddedActionCreator } from './common'
import { ProblemDetails, AppThunkApiConfig } from '../types/commonTypes'
import { Message } from '../types/messageTypes'
import groupBy from 'lodash/groupBy'
import mapValues from 'lodash/mapValues'
import { highestBy } from '../helpers/sortHelper';
import SchemaKind from '../schemas/SchemaKind'

type NewMessageRequest = {
    text: string
}

interface RequestMessagesInput {
    conversationId: string,
    beforeId?: string,
    amount?: number
}

export const addMessage = createAsyncThunk<Message, { text: string, conversationId: string }, AppThunkApiConfig>(
    'messages/add',
    async ({ text, conversationId }, thunkAPI) => {
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
    },
    problemDetailsThunkOptions)

export const requestMessagesForAllConversations = createAsyncThunk<Message[], number, { serializedErrorType: ProblemDetails }>(
    'messages/requestList',
    async (amountPerConversation) => {
        return await fetchGet<Message[]>(`/api/messages?amountPerConversation=${amountPerConversation}`)
    },
    problemDetailsThunkOptions)

/**
* Retrieve messages from backend
* @param beforeId ID of message based on which only older messages will be retrieved
* @param amount Maximal number of messages to retrieve.
* @returns {} 
*/
export const requestMessagesByConversationId = createAsyncThunk<Message[], RequestMessagesInput, { serializedErrorType: ProblemDetails }>(
    'messages/requestListByConversationId',
    async ({ conversationId, beforeId, amount = 30 }) => {
        let url = `/api/conversations/${conversationId}/messages?amount=${amount}`;
        if (beforeId) {
            url += `&beforeId=${encodeURIComponent(beforeId)}`;
        }
        return await fetchGet<Message[]>(url, true, SchemaKind.MessagesGetResponse)
    },
    problemDetailsThunkOptions)

const messagesEntityAdapter = createEntityAdapter<Message>()

// Note that items in state are not sorted. UI component manages sorting instead.
const messagesSlice = createSlice({
    name: 'messages',
    initialState: messagesEntityAdapter.getInitialState(),
    reducers: {},
    extraReducers: (builder) => builder
        .addCase(messageAddedActionCreator, messagesEntityAdapter.upsertOne)
        .addCase(requestMessagesByConversationId.fulfilled, messagesEntityAdapter.upsertMany)
        .addCase(identityChangedActionCreator, messagesEntityAdapter.getInitialState)
        .addCase(requestMessagesForAllConversations.fulfilled, messagesEntityAdapter.upsertMany)
})

export const { actions: messagesActions, reducer: messagesReducer } = messagesSlice

export const allMessagesSelector = messagesEntityAdapter.getSelectors<ApplicationState>((state) => state.conversation.messages).selectAll

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
export const messagesOfConversationSelector = (state: ApplicationState, { conversationId }: { conversationId: string }) =>
    allMessagesSelector(state).filter((message) => message.conversationId === conversationId)