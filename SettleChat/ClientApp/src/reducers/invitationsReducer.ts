import { Reducer, Action } from 'redux';
import { Invitation } from '../types/invitationTypes'
import { InvitationKnownAction, InvitationAddedAction } from '../types/invitationActionTypes'
import { IdentityChangedAction } from '../store/Identity';
import { unionArray } from '../helpers/arrayHelper'

export const invitationsReducer: Reducer<Invitation[]> = (state: Invitation[] = [], incomingAction: Action): Invitation[] => {
    // Note that items in state are not sorted. UI component manages sorting instead.
    const action = incomingAction as InvitationKnownAction | IdentityChangedAction;

    switch (action.type) {
        case 'INVITATION_ADDED':
            const actionInvitation = (action as InvitationAddedAction).invitation;
            // don't change state, when the invitation already exists in the state
            const existingInvitation = state.find(x => x.id === actionInvitation.id);
            if (existingInvitation) {
                const equals = JSON.stringify(existingInvitation) === JSON.stringify(action.invitation);
                if (equals) {
                    return state;
                }
            }

            return [
                ...state.filter(x => x.id !== actionInvitation.id),
                {
                    ...actionInvitation
                }
            ];
        case 'INVITATIONS_RECEIVE_LIST':
            return [...unionArray<Invitation>(action.invitations, state)];
        case 'IDENTITY_CHANGED'://TODO: clearing list of messages should be maybe called from component. Store should not be aware of logic when user identity is changed.
            return [];
        case 'INVITATION_ADD':
        case 'INVITATIONS_REQUEST_LIST':
        default:
            return state;
    };
}