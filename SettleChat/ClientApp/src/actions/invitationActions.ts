import { Invitation, NewInvitation, INVITATION_ADDED, INVITATION_ADD, INVITATIONS_REQUEST_LIST, INVITATIONS_RECEIVE_LIST } from '../types/invitationTypes'
import { InvitationAddedAction, InvitationAddAction, InvitationsRequestListAction, InvitationsReceiveListAction } from '../types/invitationActionTypes'

export function invitationAdded(invitation: Invitation): InvitationAddedAction {
    return {
        type: INVITATION_ADDED,
        invitation: invitation
    }
}

export function invitationAdd(newInvitation: NewInvitation): InvitationAddAction {
    return {
        type: INVITATION_ADD,
        newInvitation: newInvitation
    }
}

export function invitationsRequestList(): InvitationsRequestListAction {
    return {
        type: INVITATIONS_REQUEST_LIST
    }
}

export function invitationsReceiveList(invitations: Invitation[]): InvitationsReceiveListAction {
    return {
        type: INVITATIONS_RECEIVE_LIST,
        invitations: invitations
    }
}