import { Reducer, Action } from 'redux';

export interface IdentityState {
    isAuthenticated: boolean;
    userId: string | null;
    userName: string | null;
}

export interface IdentityChangedAction {
    type: 'IDENTITY_CHANGED';
    identity: IdentityState;
}

export const unloadedState: IdentityState = { isAuthenticated: false, userId: null, userName: null };

export const identityReducer: Reducer<IdentityState> = (state1: IdentityState = unloadedState, incomingAction: Action): IdentityState => {
    let state: IdentityState = state1 || unloadedState;

    const action = incomingAction as IdentityChangedAction;

    switch (action.type) {
        case 'IDENTITY_CHANGED':
            return { ...action.identity };
        default:
            return state;
    }
}