import { Invitation, InvitationResponse } from '../types/invitationTypes'

export const transformInvitationResponse = (response: InvitationResponse): Invitation => (
    {
        ...response,
        created: new Date(response.created as string)
    });

export const transformInvitationsResponse = (response: InvitationResponse[]): Invitation[] => response.map(transformInvitationResponse);