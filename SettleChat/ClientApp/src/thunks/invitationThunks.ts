import { ThunkAction } from 'redux-thunk';
import { Invitation, NewInvitation, InvitationResponse } from '../types/invitationTypes'
import { InvitationKnownAction } from '../types/invitationActionTypes'
import { invitationAdded, invitationAdd, invitationsRequestList, invitationsReceiveList } from '../actions/invitationActions'
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions'
import { ApplicationState } from '../store/index';
import { fetchGet, fetchPost } from '../services/FetchService'
import SchemaKind from '../schemas/SchemaKind'

const transformInvitationResponse = (response: InvitationResponse): Invitation => (
    {
        ...response,
        created: new Date(response.created as string)
    });

const transformInvitationsResponse = (response: InvitationResponse[]): Invitation[] => response.map(transformInvitationResponse);

export const createInvitation = (newInvitation: NewInvitation): ThunkAction<Promise<Invitation>, ApplicationState, undefined, InvitationKnownAction | HttpFailStatusReceivedAction> =>
    (dispatch, getState) => {
        dispatch(invitationAdd(newInvitation));
        const url = `/api/conversations/${newInvitation.conversationId}/invitations`;
        const payload = {
            isPermanent: newInvitation.isPermanent
        };
        return fetchPost<Invitation>(url, payload, dispatch, true, transformInvitationResponse, SchemaKind.InvitationPostResponse)
            .then(invitation => {
                dispatch(invitationAdded(invitation));
                return invitation;
            });
    }

/**
 * Retrieve invitations from backend
 * @returns array of Invitation
 */
export const requestInvitations = (conversationId: string): ThunkAction<Promise<Invitation[]>, ApplicationState, undefined, InvitationKnownAction> =>
    (dispatch, getState) => {
        // Only load data if it's something we don't already have (and are not already loading)
        dispatch(invitationsRequestList());
        const url = `/api/conversations/${conversationId}/invitations`;
        return fetchGet<Invitation[]>(url, dispatch, true, transformInvitationsResponse, SchemaKind.InvitationsGetResponse)
            .then(invitations => {
                dispatch(invitationsReceiveList(invitations));
                return invitations;
            });
    }