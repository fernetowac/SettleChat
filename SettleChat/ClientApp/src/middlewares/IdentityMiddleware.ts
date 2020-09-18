import { Middleware, Dispatch, AnyAction } from 'redux';
import authService from '../components/api-authorization/AuthorizeService';
import { IdentityState, IdentityChangedAction } from '../store/Identity';

export const createIdentityMiddleware = (): Middleware => {
    const populateState = async (dispatch: Dispatch<AnyAction>) => {
        const [isAuthenticated, user] = await Promise.all([authService.isAuthenticated(), authService.getUser()]);
        dispatch({
            type: 'IDENTITY_CHANGED', isAuthenticated, identity: {
                isAuthenticated: isAuthenticated,
                userId: user && user.sub,
                userName: user && user.name,
            } as IdentityState
        } as IdentityChangedAction);
    }

    return store => {
        /*this._subscription =*/ authService.subscribe(() => populateState(store.dispatch));
        populateState(store.dispatch);

        return next => action => {
            return next(action);
        }
    }
}