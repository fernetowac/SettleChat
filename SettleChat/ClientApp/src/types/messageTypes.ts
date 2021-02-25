import { Identifiable } from '../types/commonTypes'

export type Message = Identifiable & {
    conversationId: string;
    text: string;
    userId: string;
    /**
     * ISO 8601 timestamp
     * */
    created: string;
}