import { Identifiable, ApiType, ReduxType } from '../types/commonTypes'

interface MessageBase extends Identifiable {
    id: string;
    conversationId: string;
    text: string;
    userId: string;
    created: Date;
}

export type ApiMessage = ApiType<MessageBase>

export type Message = ReduxType<MessageBase>