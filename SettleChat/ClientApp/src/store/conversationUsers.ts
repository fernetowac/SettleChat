import { createEntityAdapter, createSlice } from '@reduxjs/toolkit'
import { ApplicationState } from './index';
import { ConversationUserMeta } from '../types/conversationUserTypes'
import { conversationUserAdded, addUserToConversation, identityChangedActionCreator, requestConversationsWithUsers, requestConversationUsers } from './common'
import { addConversation } from './conversationDetails'


export const conversationUsersAdapter = createEntityAdapter<ConversationUserMeta>()

export const { selectAll: selectAllConversationUsers } = conversationUsersAdapter.getSelectors((state: ApplicationState) => state.conversation.conversationUsers)
export const conversationUsersByConversationIdSelector = (state: ApplicationState, { conversationId }: { conversationId: string }) =>
    selectAllConversationUsers(state).filter((conversationUser) => conversationUser.conversationId === conversationId)
export function conversationUserByIdsSelector(state: ApplicationState, { userId, conversationId }: { userId: string, conversationId: string }) {
    return selectAllConversationUsers(state)
        .find((conversationUser) =>
            conversationUser.userId === userId &&
            conversationUser.conversationId === conversationId
        )
}

const conversationUsersSlice = createSlice({
    name: 'conversationUsers',
    initialState: conversationUsersAdapter.getInitialState(),
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(
                requestConversationUsers.fulfilled,
                (state, action) => conversationUsersAdapter.upsertMany(state, action.payload.conversationUsers)
            )
            .addCase(
                conversationUserAdded,
                (state, action) => conversationUsersAdapter.addOne(state, action.payload.conversationUser)
            )
            .addCase(
                addUserToConversation.fulfilled,
                (state, action) => conversationUsersAdapter.addOne(state, action.payload.conversationUser)
            )
            .addCase(
                requestConversationsWithUsers.fulfilled,
                (state, action) => conversationUsersAdapter.upsertMany(state, action.payload.conversationUsers)
            )
            .addCase(
                addConversation.fulfilled,
                (state, action) => conversationUsersAdapter.upsertMany(state, action.payload.conversationUsers)
            )
            .addCase(
                identityChangedActionCreator,
                conversationUsersAdapter.getInitialState
            )
    }
})

export const { reducer: conversationUsersReducer } = conversationUsersSlice