import { createAsyncThunk, createSlice, PayloadAction, createEntityAdapter } from '@reduxjs/toolkit'
import { ApplicationState } from './index'
import { fetchGet, fetchPatch, fetchPost } from '../services/FetchService'
import { AppDispatch } from '../'
import {
    identityChangedActionCreator,
    problemDetailsThunkOptions,
    requestConversationsWithUsers,
} from './common'
import { AppThunkApiConfig } from '../types/commonTypes'
import { ConversationDetail, ConversationWithUsersResponse } from '../types/conversationTypes'
import omit from 'lodash/omit'
import flatten from 'lodash/flatten'
import { ConversationUserMeta } from '../types/conversationUserTypes'
import { User } from '../types/userTypes'

export type ConversationPatch = {
    title?: string
    isPublic?: boolean
}

export type NewConversation = {
    title?: string
}

const normalizeConversationWithUsersResponse = (
    response: ConversationWithUsersResponse
): {
    conversation: ConversationDetail
    conversationUsers: ConversationUserMeta[]
    users: User[]
} => {
    return {
        conversation: omit(response, 'conversationUsers'),
        conversationUsers: response.conversationUsers.map((conversationUser) =>
            omit(conversationUser, 'user')
        ),
        users: flatten(response.conversationUsers.map((conversationUser) => conversationUser.user)),
    }
}

const thunks = {
    requestConversationDetail: createAsyncThunk<
        ConversationDetail | never,
        string,
        AppThunkApiConfig
    >(
        'conversation/request',
        async (conversationId, thunkAPI) => {
            const conversation = await fetchGet<ConversationDetail>(
                `/api/conversations/${conversationId}`
            )
            thunkAPI.dispatch(conversationDetailsActions.received(conversation))
            return conversation
        },
        problemDetailsThunkOptions
    ),
    patchConversationDetail: createAsyncThunk<
        ConversationDetail,
        { conversationId: string; updatedProperties: ConversationPatch },
        AppThunkApiConfig
    >(
        'conversation/patch',
        async ({ conversationId, updatedProperties }, thunkAPI) => {
            const data = await fetchPatch<ConversationDetail>(
                `/api/conversations/${conversationId}`,
                updatedProperties
            )
            thunkAPI.dispatch(conversationDetailsActions.received(data))
            return data
        },
        problemDetailsThunkOptions
    ),
    addConversation: createAsyncThunk<
        ReturnType<typeof normalizeConversationWithUsersResponse>,
        NewConversation,
        AppThunkApiConfig
    >(
        'conversations/addThunk',
        async (conversationInput) => {
            return await fetchPost<ConversationWithUsersResponse>(
                '/api/Conversations',
                conversationInput
            ).then(normalizeConversationWithUsersResponse)
        },
        problemDetailsThunkOptions
    ),
}
export const conversationDetailsAdapter = createEntityAdapter<ConversationDetail>()
export const allConversationsSelector = conversationDetailsAdapter.getSelectors<ApplicationState>(
    (state) => state.conversation.detail
).selectAll
export const conversationByIdSelector = conversationDetailsAdapter.getSelectors<ApplicationState>(
    (state) => state.conversation.detail
).selectById

const conversationDetailsSlice = createSlice({
    name: 'conversationDetails',
    initialState: conversationDetailsAdapter.getInitialState(),
    reducers: {
        received: conversationDetailsAdapter.upsertOne,
    },
    extraReducers: (builder) => {
        builder
            .addCase(thunks.patchConversationDetail.fulfilled, conversationDetailsAdapter.upsertOne)
            .addCase(requestConversationsWithUsers.fulfilled, (state, action) =>
                conversationDetailsAdapter.upsertMany(state, action.payload.conversations)
            )
            .addCase(thunks.addConversation.fulfilled, (state, action) =>
                conversationDetailsAdapter.addOne(state, action.payload.conversation)
            )
            .addCase(identityChangedActionCreator, conversationDetailsAdapter.getInitialState)
    },
})

export const {
    actions: conversationDetailsActions,
    reducer: conversationDetailsReducer,
} = conversationDetailsSlice
export const { requestConversationDetail, patchConversationDetail, addConversation } = thunks
