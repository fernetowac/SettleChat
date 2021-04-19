import { ConversationUserMeta } from './conversationUserTypes'
import { User } from './userTypes'

export type ConversationDetail = {
    id: string
    title?: string
    isPublic: boolean
    /** ISO 8601 date string */
    created: string
}

export type ConversationWithUsersResponse = ConversationDetail & {
    conversationUsers: (ConversationUserMeta & { user: User })[]
}
export type ConversationsWithUsersResponse = ConversationWithUsersResponse[]
