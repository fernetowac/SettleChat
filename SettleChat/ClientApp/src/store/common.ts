import { createAction, createAsyncThunk, PrepareAction } from '@reduxjs/toolkit'
import { Message } from '../types/messageTypes'
import { IdentityState } from './Identity'
import { omit, flatten } from 'lodash'
import { User } from '../types/userTypes'
import { ConversationUserResponse, ConversationUserMeta, ConversationUsersResponse } from '../types/conversationUserTypes'
import { ConversationDetail, ConversationsWithUsersResponse } from '../types/conversationTypes'
import { fetchGet } from '../services/FetchService'
import { ProblemDetails, AppThunkApiConfig } from '../types/commonTypes'

function toPrepareAction<TResponse>(func: ((...args: any[]) => TResponse)): PrepareAction<TResponse> {
    return (...args: any[]) => ({
        payload: func(args)
    })
}

const normalizeConversationUserResponse = (response: ConversationUserResponse): { conversationUser: ConversationUserMeta, user: User } => {
    return {
        conversationUser: omit(response, 'user'),
        user: response.user
    }
}

const normalizeConversationUsersResponse = (response: ConversationUsersResponse): { conversationUsers: ConversationUserMeta[], users: User[] } => {
    return {
        conversationUsers: response.map(x => omit(x, 'user')),
        users: response.map((x) => x.user)
    }
}

const normalizeConversationsWithUsersResponse = (response: ConversationsWithUsersResponse): { conversations: ConversationDetail[], conversationUsers: ConversationUserMeta[], users: User[] } => {
    return {
        conversations: response.map(conversation => omit(conversation, 'conversationUsers')),
        conversationUsers: flatten(response.map(conversation => conversation.conversationUsers.map(conversationUser => omit(conversationUser, 'user')))),
        users: flatten(response.map(conversation => conversation.conversationUsers.map(conversationUser => conversationUser.user)))
    }
}

export const messageAddedActionCreator = createAction<Message>('common/messageAdded')
export const identityChangedActionCreator = createAction<IdentityState>('common/identityChanged')
export const conversationUserAdded = createAction('common/conversationUserAdded', toPrepareAction(normalizeConversationUserResponse))

export const requestConversationsWithUsers = createAsyncThunk('common/requestConversationsWithUsers', async () => {
    const conversations = await fetchGet<ConversationsWithUsersResponse>('/api/conversations')
    return normalizeConversationsWithUsersResponse(conversations)
})

export const requestConversationUsers = createAsyncThunk<{ conversationUsers: ConversationUserMeta[], users: User[] }, string, AppThunkApiConfig>('users/requestUsers', async (conversationId, thunkAPI) => {
    // Only load data if it's something we don't already have (and are not already loading)
    const appState = thunkAPI.getState();
    if (!appState || !appState.conversation || !appState.conversation.detail) {
        throw Error('appState or its conversation is undefined');
    }

    return await fetchGet<ConversationUsersResponse>(`/api/conversations/${conversationId}/users`)
        .then(normalizeConversationUsersResponse)
})

export const problemDetailsThunkOptions = {
    serializeError: (error: unknown) => {
        if (typeof error === 'object') {
            if (error && error.hasOwnProperty('type') && error.hasOwnProperty('title') && error.hasOwnProperty('status') && error.hasOwnProperty('traceId')) {
                return error as ProblemDetails
            }
        }
        throw Error('Error details in wrong format')
    }
}