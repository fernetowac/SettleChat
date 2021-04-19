import { Identifiable } from './commonTypes'

export interface NewInvitation {
    conversationId: string
    isPermanent: boolean
}

export type InvitationResponse = Identifiable & {
    conversationId: string
    conversationTitle?: string
    isActive: boolean
    isPermanent: boolean
    invitedByUserName: string
    invitedByUserId: string
    conversationUsers: [
        {
            id: string
            nickname: string
        }
    ]
    token: string
    created: string
}

export type Invitation = InvitationResponse
