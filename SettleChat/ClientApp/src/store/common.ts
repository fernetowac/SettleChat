import { createAction } from '@reduxjs/toolkit'
import { Message } from '../types/messageTypes'
import { IdentityState } from './Identity'

export const messageAddedActionCreator = createAction<Message>('common/messageAdded')
export const identityChangedActionCreator = createAction<IdentityState>('common/identityChanged')