import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { requestConversationsWithUsers } from './common'

export enum LeftPanelContentKind {
    Conversations,
    ConversationUsers,
    ConversationInvite,
}

export enum ContentType {
    Conversations,
    ConversationDetail,
    Invitation,
    GroupCreation,
    UserDetail,
    ConversationUserDetail,
}

export type ContentStackItem = { hiddenAtBreakpoints?: ('xs' | 'sm' | 'md' | 'lg' | 'xl')[] } & (
    | ConversationsContentStackItem
    | ConversationDetailContentStackItem
    | InvitationContentStackItem
    | GroupCreationContentStackItem
    | UserDetailContentStackItem
    | ConversationUserDetailContentStackItem
)

interface ConversationsContentStackItem {
    type: ContentType.Conversations
    payload: { conversationId: string }
}

interface ConversationDetailContentStackItem {
    type: ContentType.ConversationDetail
    payload: { conversationId: string }
}

interface InvitationContentStackItem {
    type: ContentType.Invitation
    payload: { conversationId: string }
}

interface GroupCreationContentStackItem {
    type: ContentType.GroupCreation
}

interface UserDetailContentStackItem {
    type: ContentType.UserDetail
    payload: { userId: string }
}

interface ConversationUserDetailContentStackItem {
    type: ContentType.UserDetail
    payload: { conversationUserId: string }
}

export interface Ui {
    isConversationLoading: boolean
    canLoadMoreMessages: boolean
    leftPanelContentStack: ContentStackItem[]
}

const initialUi: Ui = {
    isConversationLoading: false,
    canLoadMoreMessages: false,
    leftPanelContentStack: [],
}

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
        leftPanelContentPush: (state, action: PayloadAction<ContentStackItem>) => {
            state.leftPanelContentStack.push(action.payload)
        },
        leftPanelContentPop: (state) => {
            state.leftPanelContentStack.pop()
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(requestConversationsWithUsers.pending, (state) => {
                if (!state.isConversationLoading) {
                    state.isConversationLoading = true
                }
            })
            .addCase(requestConversationsWithUsers.fulfilled, (state) => {
                if (state.isConversationLoading) {
                    state.isConversationLoading = false
                }
            })
    },
})

export const {
    enableLoadingMoreMessages,
    disableLoadingMoreMessages,
    leftPanelContentPush,
    leftPanelContentPop,
} = uiSlice.actions
export const { reducer: uiReducer } = uiSlice
