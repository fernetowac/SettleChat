import { createSlice } from '@reduxjs/toolkit'
import { requestConversationsWithUsers } from './common'

export enum LeftPanelContentKind {
    Conversations,
    ConversationUsers,
    ConversationInvite
}

interface UiLeftPanel {
    contentKind: LeftPanelContentKind
}
export interface Ui {
    isConversationLoading: boolean;
    canLoadMoreMessages: boolean;
    leftPanel: UiLeftPanel
}

const initialUi: Ui = {
    isConversationLoading: false,
    canLoadMoreMessages: false,
    leftPanel: {
        contentKind: LeftPanelContentKind.Conversations
    }
};

const uiSlice = createSlice({
    name: 'ui',
    initialState: initialUi,
    reducers: {
        enableLoadingMoreMessages: (state) => {
            if (!state.canLoadMoreMessages) {
                state.canLoadMoreMessages = true
            }
        },
        disableLoadingMoreMessages: (state) => {
            if (state.canLoadMoreMessages) {
                state.canLoadMoreMessages = false
            }
        },
        leftPanelDisplayConversationInvite: (state) => {
            state.leftPanel.contentKind = LeftPanelContentKind.ConversationInvite
        },
        leftPanelDisplayConversationUsers: (state) => {
            state.leftPanel.contentKind = LeftPanelContentKind.ConversationUsers
        },
        leftPanelDisplayConversations: (state) => {
            state.leftPanel.contentKind = LeftPanelContentKind.Conversations
        }
    },
    extraReducers: (builder) => {
        builder.addCase(
            requestConversationsWithUsers.pending, (state) => {
                if (!state.isConversationLoading) {
                    state.isConversationLoading = true
                }
            })
            .addCase(
                requestConversationsWithUsers.fulfilled, (state) => {
                    if (state.isConversationLoading) {
                        state.isConversationLoading = false
                    }
                })
    }
})

export const {
    enableLoadingMoreMessages,
    disableLoadingMoreMessages,
    leftPanelDisplayConversationInvite,
    leftPanelDisplayConversationUsers,
    leftPanelDisplayConversations
} = uiSlice.actions
export const { reducer: uiReducer } = uiSlice