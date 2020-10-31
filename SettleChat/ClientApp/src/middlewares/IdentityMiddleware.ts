import { Middleware, Dispatch, AnyAction } from 'redux';
import authService from '../components/api-authorization/AuthorizeService';
import { IdentityState, IdentityChangedAction } from '../store/Identity';
import { Profile } from 'oidc-client';
import { ApplicationState } from '../store';

//TODO: convert this middleware into composited component (similar to what was done to SignalRMiddleware->SignalRContainer)
export const createIdentityMiddleware = (): Middleware<any, ApplicationState, any> => {
    const populateState = (userProfile: Profile | null, dispatch: Dispatch<AnyAction>, getState: () => ApplicationState): void => {
        const isAuthenticated = !!userProfile;
        const storeUserId = getState().identity.userId;
        if ((!userProfile && !storeUserId) || (userProfile && userProfile.sub === storeUserId)) {
            return;
        }
        dispatch({
            type: 'IDENTITY_CHANGED', isAuthenticated, identity: {
                isAuthenticated: isAuthenticated,
                userId: userProfile && userProfile.sub,
                userName: userProfile && userProfile.name,
            } as IdentityState
        } as IdentityChangedAction);
    }

    return api => {
        authService.subscribe((user) => populateState(user && user.profile, api.dispatch, api.getState));
        authService.getUser().then(userProfile => {
            populateState(userProfile, api.dispatch, api.getState);
        });

        return next => action => {
            return next(action);
        }
    }
}