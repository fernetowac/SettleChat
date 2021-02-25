import { createSlice } from '@reduxjs/toolkit'
import { Invitation } from '../types/invitationTypes'
import { createInvitation, requestInvitations } from '../thunks/invitationThunks'
import { unionArray } from '../helpers/arrayHelper'
import { identityChangedActionCreator } from '../store/common'

const invitationsSlice = createSlice({
    name: 'invitations',
    initialState: [] as Invitation[],
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(
                //TODO: probably it can be simplified with immer
                createInvitation.fulfilled, (state, action) => {
                    // don't change state, when the invitation already exists in the state
                    const existingInvitation = state.find(x => x.id === action.payload.id);
                    if (existingInvitation) {
                        const equals = JSON.stringify(existingInvitation) === JSON.stringify(action.payload);
                        if (equals) {
                            return;
                        }
                    }

                    return [
                        ...state.filter(x => x.id !== action.payload.id),
                        {
                            ...action.payload
                        }
                    ];
                }
            )
            .addCase(
                requestInvitations.fulfilled, (state, action) => {
                    return [...unionArray<Invitation>(action.payload, state)];
                }
            )
            .addCase(identityChangedActionCreator, () => {
                return []
            })
    }
})

export const { actions: invitationsActions, reducer: invitationsReducer } = invitationsSlice