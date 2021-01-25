import { Identifiable } from './commonTypes'

export const INVITATION_ADDED = 'INVITATION_ADDED'
export const INVITATION_ADD = 'INVITATION_ADD'
export const INVITATIONS_REQUEST_LIST = 'INVITATIONS_REQUEST_LIST'
export const INVITATIONS_RECEIVE_LIST = 'INVITATIONS_RECEIVE_LIST'

export interface NewInvitation {
    conversationId: string;
    isPermanent: boolean;
}

export interface InvitationResponse extends Identifiable {
    id: string;
    conversationId: string;
    conversationTitle?: string;
    isActive: boolean;
    isPermanent: boolean;
    invitedByUserName: string;
    invitedByUserId: string;
    conversationUserNames: string[];
    token: string;
    created: string;
}

export type Invitation = Omit<InvitationResponse, "created"> &
{
    created: Date;
}