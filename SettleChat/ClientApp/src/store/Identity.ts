import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { identityChangedActionCreator } from './common'

export interface IdentityState {
    isAuthenticated: boolean
    userId: string | null
    userName: string | null
}

export const unloadedState: IdentityState = { isAuthenticated: false, userId: null, userName: null }

const identitySlice = createSlice({
    name: 'identity',
    initialState: unloadedState,
    reducers: {},
    extraReducers: (builder) =>
        builder.addCase(
            identityChangedActionCreator,
            (_state, action: PayloadAction<IdentityState>) => {
                return { ...action.payload }
            }
        ),
})

export const { actions: identityActions, reducer: identityReducer } = identitySlice
