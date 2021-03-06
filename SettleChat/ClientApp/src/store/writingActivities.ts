import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { fetchPut } from '../services/FetchService';
import { AppThunkApiConfig } from '../types/commonTypes';

export interface ReceivedWritingActivityStateItem extends ReceivedWritingActivityData {
    lastChangeClientUnixTimeInMs: number;
}

export type WritingActivityData = {
    activity: WritingActivity;
}

export enum WritingActivity {
    IsWriting = 1,
    StoppedWriting = 2
}

export interface ReceivedWritingActivityData {
    conversationId: string;
    userId: string;
    activity: WritingActivity;
}

export interface ReceivedWritingActivity {
    userId: string;
    activity: WritingActivity;
}

export const updateWritingActivity = createAsyncThunk<void, { conversationId: string, writingActivity: WritingActivityData }, AppThunkApiConfig>('writingActivity/update', async ({ conversationId, writingActivity }, thunkAPI) => {
    const conversationState = thunkAPI.getState().conversation;
    if (!conversationState || !conversationState.detail) {
        throw Error('Conversation must be loaded in order to notify about it');
    }
    return await fetchPut<void>(`/api/conversations/${conversationId}/writingactivity`, writingActivity);
})

//Note: We should never compare client time with server time, there can be precission errors and we cannot guarantee the client time is correctly set.
const writingActivitiesSlice = createSlice({
    name: 'writingActivities',
    initialState: [] as ReceivedWritingActivityStateItem[],
    reducers: {
        received: {
            reducer: (state, action: PayloadAction<ReceivedWritingActivityStateItem>) => {
                const itemOfUserConversation = state.find(x => x.userId === action.payload.userId && x.conversationId === action.payload.conversationId);
                // update state only if there's no data for the {user,conversation} combination yet, or if action contains newer change than the one already in store for the combination
                if (!itemOfUserConversation || (itemOfUserConversation && itemOfUserConversation.lastChangeClientUnixTimeInMs < action.payload.lastChangeClientUnixTimeInMs)) {
                    const itemsOfOtherUsers = state.filter(x => x.userId !== action.payload.userId || x.conversationId !== action.payload.conversationId);
                    return [
                        ...itemsOfOtherUsers,
                        {
                            ...action.payload
                        }
                    ];
                }
            },
            prepare: (writingActivity: ReceivedWritingActivityData) => ({
                payload: {
                    ...writingActivity,
                    lastChangeClientUnixTimeInMs: new Date().getTime()
                }
            })
        }
    }
})

export const { actions: writingActivitiesActions, reducer: writingActivitiesReducer } = writingActivitiesSlice