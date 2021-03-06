import { User } from './userTypes'

export type ConversationUserMeta = {
    id: string
    userId: string,
    conversationId: string
    nickname: string | null
}
export type ConversationUserResponse = (ConversationUserMeta & { user: User })
export type ConversationUsersResponse = ConversationUserResponse[]