import { NewInvitation, Invitation, INVITATION_ADDED, INVITATION_ADD, INVITATIONS_REQUEST_LIST, INVITATIONS_RECEIVE_LIST } from './invitationTypes'

export interface InvitationAddAction {
    type: typeof INVITATION_ADD;
    newInvitation: NewInvitation;
}

export interface InvitationAddedAction {
    type: typeof INVITATION_ADDED;
    invitation: Invitation;
}

export interface InvitationsRequestListAction {
    type: typeof INVITATIONS_REQUEST_LIST;
}

export interface InvitationsReceiveListAction {
    type: typeof INVITATIONS_RECEIVE_LIST;
    invitations: Invitation[];
}

export type InvitationKnownAction = InvitationAddAction | InvitationAddedAction | InvitationsRequestListAction | InvitationsReceiveListAction;