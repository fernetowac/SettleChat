import { createSlice, PayloadAction } from '@reduxjs/toolkit'
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
    leftPanel: UiLeftPanel;
    isSmallScreen: boolean;
}

const initialUi: Ui = {
    isConversationLoading: false,
    canLoadMoreMessages: false,
    leftPanel: {
        contentKind: LeftPanelContentKind.Conversations
    },
    isSmallScreen: false
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
        },
        setSmallScreen: (state, action: PayloadAction<boolean>) => {
            state.isSmallScreen = action.payload
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
    leftPanelDisplayConversations,
    setSmallScreen
} = uiSlice.actions
export const { reducer: uiReducer } = uiSlice