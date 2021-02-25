import * as Conversations from './Conversations';
import * as Conversation from './Conversation';
import * as Identity from './Identity';
import * as SignalR from './SignalR';
import { notificationsReducer } from '../reducers/notificationsReducer'
import { Notification } from '../types/notificationTypes'

// The top-level state object
export interface ApplicationState {
    conversations: Conversations.ConversationsState;
    conversation: Conversation.ConversationState;
    identity: Identity.IdentityState;
    signalR: SignalR.SignalRState;
    notifications: Notification[]
}

export const InitialApplicationState: ApplicationState = {
    conversation: Conversation.initialConversationState,
    conversations: Conversations.InitialConversationsState,
    identity: Identity.unloadedState,
    signalR: SignalR.initialSignalRState,
    notifications: []
}

// Whenever an action is dispatched, Redux will update each top-level application state property using
// the reducer with the matching name. It's important that the names match exactly, and that the reducer
// acts on the corresponding ApplicationState property type.
export const reducers = {
    conversations: Conversations.conversationsReducer,
    conversation: Conversation.reducer,
    identity: Identity.identityReducer,
    signalR: SignalR.signalRReducer,
    notifications: notificationsReducer
};