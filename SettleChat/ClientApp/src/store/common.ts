import { createAction, createAsyncThunk, PrepareAction } from '@reduxjs/toolkit'
import { Message } from '../types/messageTypes'
import { IdentityState } from './Identity'
import omit from 'lodash/omit'
import flatten from 'lodash/flatten'
import { User } from '../types/userTypes'
import {
    ConversationUserResponse,
    ConversationUserMeta,
    ConversationUsersResponse,
} from '../types/conversationUserTypes'
import { ConversationDetail, ConversationsWithUsersResponse } from '../types/conversationTypes'
import { fetchGet, fetchPost } from '../services/FetchService'
import { ProblemDetails, AppThunkApiConfig } from '../types/commonTypes'

export const problemDetailsThunkOptions = {
    serializeError: (error: unknown) => {
        if (typeof error === 'object') {
            if (
                error &&
                error.hasOwnProperty('type') &&
                error.hasOwnProperty('title') &&
                error.hasOwnProperty('status') &&
                error.hasOwnProperty('traceId')
            ) {
                return error as ProblemDetails
            }
        }
        console.error(error)
        throw Error('Error details in wrong format')
    },
}

function toPrepareAction<TResponse>(func: (...args: any[]) => TResponse): PrepareAction<TResponse> {
    return (...args: any[]) => ({
        payload: func(...args),
    })
}

const normalizeConversationUserResponse = (
    response: ConversationUserResponse
): { conversationUser: ConversationUserMeta; user: User } => {
    return {
        conversationUser: omit(response, 'user'),
        user: response.user,
    }
}

const normalizeConversationUsersResponse = (
    response: ConversationUsersResponse
): { conversationUsers: ConversationUserMeta[]; users: User[] } => {
    return {
        conversationUsers: response.map((x) => omit(x, 'user')),
        users: response.map((x) => x.user),
    }
}

const normalizeConversationsWithUsersResponse = (
    response: ConversationsWithUsersResponse
): {
    conversations: ConversationDetail[]
    conversationUsers: ConversationUserMeta[]
    users: User[]
} => {
    return {
        conversations: response.map((conversation) => omit(conversation, 'conversationUsers')),
        conversationUsers: flatten(
            response.map((conversation) =>
                conversation.conversationUsers.map((conversationUser) =>
                    omit(conversationUser, 'user')
                )
            )
        ),
        users: flatten(
            response.map((conversation) =>
                conversation.conversationUsers.map((conversationUser) => conversationUser.user)
            )
        ),
    }
}

export const messageAddedActionCreator = createAction<Message>('common/messageAdded')
export const identityChangedActionCreator = createAction<IdentityState>('common/identityChanged')
export const conversationUserAdded = createAction(
    'common/conversationUserAdded',
    toPrepareAction(normalizeConversationUserResponse)
)

export const requestConversationsWithUsers = createAsyncThunk(
    'common/requestConversationsWithUsers',
    async () => {
        const conversations = await fetchGet<ConversationsWithUsersResponse>('/api/conversations')
        return normalizeConversationsWithUsersResponse(conversations)
    }
)

export const requestConversationUsers = createAsyncThunk<
    { conversationUsers: ConversationUserMeta[]; users: User[] },
    string,
    AppThunkApiConfig
>(
    'users/requestUsers',
    async (conversationId) =>
        await fetchGet<ConversationUsersResponse>(
            `/api/conversations/${conversationId}/users`
        ).then(normalizeConversationUsersResponse),
    problemDetailsThunkOptions
)

export const addUserToConversation = createAsyncThunk<
    { conversationUser: ConversationUserMeta; user: User },
    { conversationId: string; userId: string },
    AppThunkApiConfig
>(
    'conversationUsers/add',
    async ({ conversationId, userId }) =>
        await fetchPost<ConversationUserResponse>(`/api/conversations/${conversationId}/users`, {
            userId,
        }).then(normalizeConversationUserResponse),
    problemDetailsThunkOptions
)
