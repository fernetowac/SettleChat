import { createAction, PrepareAction } from '@reduxjs/toolkit'
import { Message } from '../types/messageTypes'
import { IdentityState } from './Identity'
import { omit } from 'lodash'
import { User } from '../types/userTypes'
import { ConversationUserResponse, ConversationUserMeta } from '../types/conversationUserTypes'

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

export const messageAddedActionCreator = createAction<Message>('common/messageAdded')
export const identityChangedActionCreator = createAction<IdentityState>('common/identityChanged')
export const conversationUserAdded = createAction('common/conversationUserAdded', toPrepareAction(normalizeConversationUserResponse))