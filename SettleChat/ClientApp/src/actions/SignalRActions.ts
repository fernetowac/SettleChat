export interface JoinConversationGroup {
    type: 'SIGNALR_JOIN_CONVERSATION_GROUP';
    conversationId: string;
}

export interface ConnectionEstablished {
    type: 'SIGNALR_CONNECTION_ESTABLISHED';
    connectionId: string;
}

export interface Reconnected {
    type: 'SIGNALR_RECONNECTED';
    connectionId: string;
}

export interface Disconnected {
    type: 'SIGNALR_DISCONNECTED';
}

export type KnownActions = JoinConversationGroup | ConnectionEstablished | Reconnected | Disconnected;

export const actionCreators = {
    joinConversationGroup(conversationId: string): JoinConversationGroup {
        return {
            type: 'SIGNALR_JOIN_CONVERSATION_GROUP',
            conversationId: conversationId
        }
    },
    connectionEstablished(connectionId: string): ConnectionEstablished {
        return {
            type: 'SIGNALR_CONNECTION_ESTABLISHED',
            connectionId: connectionId
        }
    },
    reconnected(connectionId: string): Reconnected {
        return {
            type: 'SIGNALR_RECONNECTED',
            connectionId: connectionId
        }
    },
    disconnected(): Disconnected {
        return {
            type: 'SIGNALR_DISCONNECTED'
        }
    }
};