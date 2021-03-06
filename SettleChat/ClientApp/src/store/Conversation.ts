import { EntityState, combineReducers, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { fetchPost, fetchDelete } from '../services/FetchService';
import { Invitation } from '../types/invitationTypes'
import { invitationsReducer } from '../reducers/invitationsReducer'
import { messagesReducer, selectLastMessagePerConversation } from './messages'
import { Ui, uiReducer } from './ui'
import { conversationUsersReducer } from './conversationUsers'
import { Message } from '../types/messageTypes'
import { ConversationUserMeta } from '../types/conversationUserTypes'
import { User } from '../types/userTypes'
import { conversationDetailsReducer, allConversationsSelector } from './conversationDetails'
import { ConversationDetail } from '../types/conversationTypes';
import { Descending } from '../helpers/sortHelper';
import { ReceivedWritingActivityStateItem, writingActivitiesReducer } from './writingActivities';
import { usersReducer } from './users'

export interface ConversationState {
    detail: EntityState<ConversationDetail>;
    messages: EntityState<Message>;
    conversationUsers: EntityState<ConversationUserMeta>,
    users: EntityState<User>,
    ui: Ui;
    writingActivities: ReceivedWritingActivityStateItem[];
    invitations: Invitation[];
}

export const actionCreators = {
    startListeningConversation: createAsyncThunk<void, { connectionId: string, conversationId: string }>('conversation/startListening', ({ connectionId, conversationId }) =>
        fetchPost<void>(`/api/notifications/conversations/${conversationId}`, connectionId)
    ),
    stopListeningConversation: createAsyncThunk<void, { connectionId: string, conversationId: string }>('conversation/stopListening', async ({ connectionId, conversationId }) =>
        await fetchDelete<void>(`/api/notifications/conversations/${conversationId}`, connectionId)
    )
};

export const reducer = combineReducers<ConversationState>({
    detail: conversationDetailsReducer,
    messages: messagesReducer,
    conversationUsers: conversationUsersReducer,
    users: usersReducer,
    ui: uiReducer,
    writingActivities: writingActivitiesReducer,
    invitations: invitationsReducer
});

const getSortedConversations = (conversations: ConversationDetail[], lastMessagePerConversation: { [conversationId: string]: Message }): (ConversationDetail & { lastActivityTimestamp: string })[] =>
    [...conversations]
        .map((conversation) => ({
            ...conversation,
            lastActivityTimestamp: lastMessagePerConversation[conversation.id] && lastMessagePerConversation[conversation.id].created || conversation.created
        })
        )
        .sort(Descending.by(conversation => conversation.lastActivityTimestamp));

/**
 * Memoized sorting of conversations by last message created date with fallback to conversation created date
 */
export const sortedConversationsSelector = createSelector([allConversationsSelector, selectLastMessagePerConversation], getSortedConversations);