import { createAction, createAsyncThunk, PrepareAction } from '@reduxjs/toolkit'
import { Message } from '../types/messageTypes'
import { IdentityState } from './Identity'
import { omit, flatten } from 'lodash'
import { User } from '../types/userTypes'
import { ConversationUserResponse, ConversationUserMeta } from '../types/conversationUserTypes'
import { ConversationDetail, ConversationsWithUsersResponse } from '../types/conversationTypes'
import { fetchGet } from '../services/FetchService'
import { ProblemDetails } from '../types/commonTypes'

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

const thunks = {
    requestConversationsWithUsers: createAsyncThunk('common/requestConversationsWithUsers', async () => {        
        const conversations = await fetchGet<ConversationsWithUsersResponse>('/api/conversations')
        return normalizeConversationsWithUsersResponse(conversations)
    })
}

export const { requestConversationsWithUsers } = thunks

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