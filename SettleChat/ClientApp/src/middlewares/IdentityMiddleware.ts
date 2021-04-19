import { Middleware, Dispatch, AnyAction } from 'redux'
import authService from '../components/api-authorization/AuthorizeService'
import { Profile } from 'oidc-client'
import { ApplicationState } from '../store'
import { identityChangedActionCreator } from '../store/common'

//TODO: convert this middleware into composited component (similar to what was done to SignalRMiddleware->SignalRContainer)
export const createIdentityMiddleware = <S extends ApplicationState>(): Middleware<
    {},
    S
> /*: Middleware<any, ApplicationState, AppDispatch>*/ => {
    const populateState = (
        userProfile: Profile | null,
        dispatch: Dispatch<AnyAction>,
        getState: () => S
    ): void => {
        const isAuthenticated = !!userProfile
        const storeUserId = getState().identity.userId
        if ((!userProfile && !storeUserId) || (userProfile && userProfile.sub === storeUserId)) {
            return
        }
        dispatch(
            identityChangedActionCreator({
                isAuthenticated: isAuthenticated,
                userId: userProfile && userProfile.sub,
                userName: (userProfile && userProfile.name) || null,
            })
        )
    }

    return (api) => {
        authService.subscribe((user) =>
            populateState(user && user.profile, api.dispatch, api.getState)
        )
        authService.getUser().then((userProfile) => {
            populateState(userProfile, api.dispatch, api.getState)
        })

        return (next) => (action) => {
            return next(action)
        }
    }
}
