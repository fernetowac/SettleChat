import { UserManager, WebStorageStateStore, Log, User, Profile, UserManagerSettings, SignoutResponse } from 'oidc-client';
import AwaitLock from 'await-lock';
import { ApplicationPaths, ApplicationName } from './ApiAuthorizationConstants';
import { calculateSessionStateResult } from './sessionChecker'
//import { IFrameNavigator1 } from './IFrameNavigator1';

/**
 * @template TState Type of state to be propagated though authentication process and returned after successful login
 */

export enum AuthenticationResultStatus {
    Redirect = 'redirect',
    Success = 'success',
    Fail = 'fail'
}

interface Callback {
    callback: (user: User | null) => any;
    subscription: number;
}

export class AuthorizeService<TState extends SignInState> {
    private callbacks: Callback[] = [];
    private nextSubscriptionId = 0;
    private user: User | null = null;
    private _userManager: UserManager | undefined;
    private userManagerLock = new AwaitLock();

    // By default pop ups are disabled because they don't work properly on Edge.
    // If you want to enable pop up authentication simply set this flag to false.
    private static readonly popUpDisabled = true; //TODO: test in Edge and if so, make it disabled only for Edge

    public async isAuthenticated(): Promise<boolean> {
        const user = await this.getUser();
        return !!user;
    }

    public async getUser(): Promise<Profile | null> {
        if (this.user && this.user.profile) {
            return this.user.profile;
        }

        const userManager = await this.ensureUserManagerInitialized();
        const user = await userManager.getUser();
        // If user has been logged out before accessing this page, we cannot use his user profile. We have to check if idsrv.session cookie matches user session_state from local storage.
        // More: https://github.com/IdentityModel/oidc-client-js/issues/979
        if (user && user.session_state && calculateSessionStateResult(window.location.origin, `${userManager.settings.client_id} ${user.session_state}`) === 'unchanged') {
            return user && user.profile;
        }
        // remove user when calculateSessionStateResult(..) is not unchanged
        userManager.removeUser()
        return null
    }

    public async getAccessToken(): Promise<string | null> {
        const userManager = await this.ensureUserManagerInitialized();
        const user = await userManager.getUser();
        return user && user.access_token;
    }

    /**
     * Sign in
     *
     * We try to authenticate the user in three different ways:
     * 1) We try to see if we can authenticate the user silently. This happens
     *    when the user is already logged in on the IdP and is done using a hidden iframe
     *    on the client.
     * 2) We try to authenticate the user using a PopUp Window. This might fail if there is a
     *    Pop-Up blocker or the user has disabled PopUps.
     * 3) If the two methods above fail, we redirect the browser to the IdP to perform a traditional
     *    redirect flow.
     *
     * @template TState Type of state
     * @param state State to be returned after successful sign in
     */
    public async signIn(state: TState): Promise<SignInResult<TState>> {
        const userManager = await this.ensureUserManagerInitialized();
        try {
            const silentUser = await userManager.signinSilent(this.createArguments());
            this.updateState(silentUser);
            return this.success(state);
        } catch (silentError) {
            if (silentError == 'ErrorResponse: login_required') {
                console.debug('Silent authentication error: ', silentError);
            } else {
                console.error('Silent authentication error: ', silentError);
            }
        }

        // User might not be authenticated, fallback to popup authentication
        try {
            if (AuthorizeService.popUpDisabled) {
                console.debug('Popup disabled. Change \'AuthorizeService.js:AuthorizeService._popupDisabled\' to false to enable it.');
            } else {
                const popUpUser = await userManager.signinPopup(this.createArguments());
                this.updateState(popUpUser);
                return this.success(state);
            }
        } catch (popUpError) {
            if (popUpError.message === "Popup window closed") {
                // The user explicitly cancelled the login action by closing an opened popup.
                return this.error("The user closed the window.");
            } else if (!AuthorizeService.popUpDisabled) {
                console.debug("Popup authentication error: ", popUpError);
            }
        }

        // PopUps might be blocked by the user, fallback to redirect
        try {
            await userManager.signinRedirect(this.createArguments(state));
            return this.redirect();
        } catch (redirectError) {
            console.error("Redirect authentication error: ", redirectError);
            return this.error(redirectError);
        }
    }

    public async completeSignIn(url: string): Promise<SignInResult<TState>> {
        try {
            const userManager = await this.ensureUserManagerInitialized();
            const user = await userManager.signinCallback(url);
            this.updateState(user);
            return this.success(user && user.state);
        } catch (error) {
            console.log('There was an error signing in: ', error);
            return this.error('There was an error signing in.');
        }
    }

    // We try to sign out the user in two different ways:
    // 1) We try to do a sign-out using a PopUp Window. This might fail if there is a
    //    Pop-Up blocker or the user has disabled PopUps.
    // 2) If the method above fails, we redirect the browser to the IdP to perform a traditional
    //    post logout redirect flow.
    public async signOut(state: TState): Promise<SignInResult<TState>> {
        const userManager = await this.ensureUserManagerInitialized();
        try {
            if (AuthorizeService.popUpDisabled) {
                console.debug('Popup disabled. Change \'AuthorizeService.js:AuthorizeService._popupDisabled\' to false to enable it.');
            } else {
                await userManager.signoutPopup(this.createArguments());
                this.updateState(null);
                return this.success(state);
            }
        } catch (popupSignOutError) {
            console.error("Popup signOut error: ", popupSignOutError);
        }
        try {
            await userManager.signoutRedirect(this.createArguments(state));
            return this.redirect();
        } catch (redirectSignOutError) {
            console.error("Redirect signOut error: ", redirectSignOutError);
            return this.error(redirectSignOutError);
        }
    }

    public async completeSignOut(url: string) {
        const userManager = await this.ensureUserManagerInitialized();
        try {
            const response: SignoutResponse | void = await userManager.signoutCallback(url);
            this.updateState(null);
            //return this.success(response && response.data);
            return this.success(response && (response as SignoutResponse).state);
        } catch (error) {
            console.log(`There was an error trying to log out '${error}'.`);
            return this.error(error);
        }
    }

    private updateState(user: User | null): void {
        this.user = user;
        this.notifySubscribers(user);
    }

    /**
     * Subscribe for authentication notifications
     * @param callback To be executed when user is signed in or signed out
     * @return subscriptionId to be used for unsubscribing
     */
    public subscribe(callback: (user: User | null) => any): number {
        console.debug('AuthorizeService.subscribe()');
        this.callbacks.push({
            callback,
            subscription: this.nextSubscriptionId++
        });
        return this.nextSubscriptionId - 1;
    }

    /**
     * Unsubscribe callback
     * @param subscriptionId retrieved from subscribing to authentication notifications
     */
    public unsubscribe(subscriptionId: number): void {
        const subscriptionIndex = this.callbacks
            .map((element, index) => element.subscription === subscriptionId ? { found: true, index } : { found: false })
            .filter(element => element.found)
            .map(x => x as { index: number });
        if (subscriptionIndex.length !== 1) {
            throw new Error(`Found an invalid number of subscriptions ${subscriptionIndex.length}`);
        }

        this.callbacks.splice(subscriptionIndex[0].index, 1);
    }

    private notifySubscribers(user: User | null) {
        for (let i = 0; i < this.callbacks.length; i++) {
            const callback = this.callbacks[i].callback;
            callback(user);
        }
    }

    private createArguments(state?: TState) {
        return { useReplaceToNavigate: true, data: state };
    }

    private error(message: Error | string) {
        return { status: AuthenticationResultStatus.Fail, message };
    }

    private success(state: TState): SignInResult<TState> {
        return { status: AuthenticationResultStatus.Success, state };
    }

    private redirect() {
        return { status: AuthenticationResultStatus.Redirect };
    }

    private async ensureUserManagerInitialized(): Promise<UserManager> {
        await this.userManagerLock.acquireAsync();
        try {
            if (this._userManager !== undefined) {
                return this._userManager;
            }

            let response = await fetch(ApplicationPaths.ApiAuthorizationClientConfigurationUrl);
            if (!response.ok) {
                throw new Error(`Could not load settings for '${ApplicationName}'`);
            }

            let settings = await response.json();
            settings.automaticSilentRenew = true;
            settings.includeIdTokenInSilentRenew = true;
            settings.silentRequestTimeout = 20000;  // default is 10 000 ms and if reached, chrome for some reason hangs forever when it tries to remove iframe
            settings.silent_redirect_uri = `${window.location.origin}/silentLoginCallback.html`;
            settings.userStore = new WebStorageStateStore({
                prefix: ApplicationName
            });
            this._userManager = new UserManager(settings as UserManagerSettings);
            //Log.logger = console;
            //Log.level = Log.DEBUG;

            this._userManager.events.addUserSignedOut(async () => {
                await (this._userManager as UserManager).removeUser();
                this.updateState(null);
            });
            // TODO: stale state could be cleared periodically
            this._userManager.clearStaleState();
            return this._userManager;
        }
        finally {
            this.userManagerLock.release();
        }
    }
}

/**
 * Result of signIn process
 */
interface SignInResult<TState> {
    status: AuthenticationResultStatus;

    /**
     * Error message populated in case of failure
     */
    message?: any;

    /**
     * Populated in case of success
     */
    state?: TState;
}

export interface SignInState {
    returnUrl: string;
}

const authService = new AuthorizeService<SignInState>();

export default authService;
