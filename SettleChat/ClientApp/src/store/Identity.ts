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

const oidcUnloadedState: IdentityState = { isAuthenticated: false, userId: null, userName: null };

export const identityReducer: Reducer<IdentityState> = (state1: IdentityState | undefined, incomingAction: Action): IdentityState => {
    let state: IdentityState = state1 || oidcUnloadedState;

    const action = incomingAction as IdentityChangedAction;

    switch (action.type) {
        case 'IDENTITY_CHANGED':
            return { ...action.identity };
        default:
            return state;
    }
}