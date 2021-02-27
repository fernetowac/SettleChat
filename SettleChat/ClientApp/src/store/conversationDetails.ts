import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ApplicationState } from './index';
import { fetchGet, fetchPatch } from '../services/FetchService';
import { AppDispatch } from '../'
import { identityChangedActionCreator } from './common'
import { AppThunkApiConfig } from '../types/commonTypes';

export type ConversationDetail = {
    id: string;
    title: string;
    isPublic: boolean;
}

export type ConversationPatch = {
    title?: string;
    isPublic?: boolean;
}

const thunks = {
    requestConversationDetail: createAsyncThunk<ConversationDetail | never, string, AppThunkApiConfig>('conversation/request', async (conversationId, thunkAPI) => {
        thunkAPI.dispatch(conversationDetailsActions.request());
        const conversation = await fetchGet<ConversationDetail>(`/api/conversations/${conversationId}`)
        thunkAPI.dispatch(conversationDetailsActions.received(conversation));
        return conversation;
    }),
    patchConversationDetail: createAsyncThunk<ConversationDetail, { conversationId: string, updatedProperties: ConversationPatch }, { state: ApplicationState, dispatch: AppDispatch }>('conversation/patch', async ({ conversationId, updatedProperties }, thunkAPI) => {
        const data = await fetchPatch<ConversationDetail>(`/api/conversations/${conversationId}`, updatedProperties)
        thunkAPI.dispatch(conversationDetailsActions.received(data));
        return data;

    })
}

const conversationDetailsSlice = createSlice({
    name: 'conversationDetails',
    initialState: null as ConversationDetail | null,
    reducers: {
        request: () => { },
        received: (_state, action: PayloadAction<ConversationDetail>) => {
            return {
                id: action.payload.id,
                title: action.payload.title,
                isPublic: action.payload.isPublic
            }
        }
    },
    extraReducers: (builder) => {
        builder.addCase(
            thunks.patchConversationDetail.fulfilled, (_state, action) => {
                return {
                    id: action.payload.id,
                    title: action.payload.title,
                    isPublic: action.payload.isPublic
                }
            })
            .addCase(identityChangedActionCreator, (_state) => {
                return null
            })
    }
})

export const { actions: conversationDetailsActions, reducer: conversationDetailsReducer } = conversationDetailsSlice
export const { requestConversationDetail, patchConversationDetail } = thunks