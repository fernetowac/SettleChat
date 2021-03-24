import { createEntityAdapter, createSlice, createSelector } from '@reduxjs/toolkit'
import { ApplicationState } from './index';
import { conversationUsersByConversationIdSelector } from './conversationUsers'
import { User } from '../types/userTypes'
import { conversationUserAdded, addUserToConversation, identityChangedActionCreator, requestConversationsWithUsers, requestConversationUsers } from './common'
import { addConversation } from './conversationDetails'

export const usersAdapter = createEntityAdapter<User>()

export const { selectById: selectUserById } = usersAdapter.getSelectors((state: ApplicationState) => state.conversation.users)
export const userByIdSelector = usersAdapter.getSelectors<ApplicationState>((state) => state.conversation.users).selectById
export const allUsersSelector = usersAdapter.getSelectors<ApplicationState>((state) => state.conversation.users).selectAll
export const selectUsersByConversationId = createSelector(
    allUsersSelector,
    conversationUsersByConversationIdSelector,
    (users, conversationUsers) =>
        !conversationUsers ?
            [] :
            users.filter((user) =>
                conversationUsers.some((conversationUser) => conversationUser.userId === user.id)
            )
)

const usersSlice = createSlice({
    name: 'users',
    initialState: usersAdapter.getInitialState(),
    reducers: {
        addOne: usersAdapter.addOne,
        updateOne: usersAdapter.updateOne,
    },
    extraReducers: builder => {
        builder
            .addCase(
                requestConversationUsers.fulfilled,
                (state, action) => usersAdapter.upsertMany(state, action.payload.users)
            )
            .addCase(
                conversationUserAdded,
                (state, action) => usersAdapter.addOne(state, action.payload.user)
            )
            .addCase(
                addUserToConversation.fulfilled,
                (state, action) => usersAdapter.addOne(state, action.payload.user)
            )
            .addCase(
                requestConversationsWithUsers.fulfilled,
                (state, action) => usersAdapter.upsertMany(state, action.payload.users)
            )
            .addCase(
                addConversation.fulfilled,
                (state, action) => usersAdapter.upsertMany(state, action.payload.users)
            )
            .addCase(
                identityChangedActionCreator,
                usersAdapter.getInitialState
            )
    }

})

export const { reducer: usersReducer } = usersSlice
export const { updateOne: updateOneUser } = usersSlice.actions