import { createAsyncThunk } from '@reduxjs/toolkit'
import { fetchGet } from '../services/FetchService'
import { problemDetailsThunkOptions } from '../store/common'
import { ProblemDetails } from '../types/commonTypes'
import { Message } from '../types/messageTypes'

const thunks = {
    requestMessages: createAsyncThunk<Message[], number, { serializedErrorType: ProblemDetails }>(
        'messages/request',
        async (amountPerConversation) => {
            return await fetchGet<Message[]>(`/api/messages?amountPerConversation=${amountPerConversation}`)
        },
        problemDetailsThunkOptions)
}

export const { requestMessages } = thunks