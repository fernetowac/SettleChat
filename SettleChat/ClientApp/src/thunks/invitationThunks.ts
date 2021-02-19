import { createAsyncThunk } from '@reduxjs/toolkit'
import { InvitationResponse, NewInvitation } from '../types/invitationTypes'
import { fetchGet, fetchPost } from '../services/FetchService'
import SchemaKind from '../schemas/SchemaKind'
import { transformInvitationResponse, transformInvitationsResponse } from '../mappers/invitationMapper'

export const createInvitation = createAsyncThunk('invitations/create', async (newInvitation: NewInvitation) => {
    const url = `/api/conversations/${newInvitation.conversationId}/invitations`;
    const payload = {
        isPermanent: newInvitation.isPermanent
    };
    return await fetchPost<InvitationResponse>(url, payload, true, SchemaKind.InvitationPostResponse)
        .then(transformInvitationResponse)
})

/**
* Retrieve invitations from backend
* @returns array of Invitation
*/
export const requestInvitations = createAsyncThunk('invitations/requestList', async (conversationId: string) => {
    const url = `/api/conversations/${conversationId}/invitations`;
    return await fetchGet<InvitationResponse[]>(url, true, SchemaKind.InvitationsGetResponse)
        .then(transformInvitationsResponse)
})