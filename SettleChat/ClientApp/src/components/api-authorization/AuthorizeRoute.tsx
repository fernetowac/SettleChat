import * as React from 'react'
import { Component } from 'react'
import { Route, Redirect } from 'react-router-dom'
import { ApplicationPaths, QueryParameterNames } from './ApiAuthorizationConstants'
import authService from './AuthorizeService'
import { RouteComponentProps, match } from 'react-router';

interface AuthorizeRouteProps {
    path: string;
    component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}
interface AuthorizeRouteComputedProps extends AuthorizeRouteProps {
    computedMatch: match;
}

interface AuthorizeRouteState {
    ready: boolean;
    authenticated: boolean;
}

export default class AuthorizeRoute extends Component<AuthorizeRouteProps, AuthorizeRouteState> {
    constructor(props: AuthorizeRouteProps & RouteComponentProps<{ startDateIndex: string }>) {
        super(props);

        this.state = {
            ready: false,
            authenticated: false
        };
    }

    private subscription: number | undefined = undefined;

    componentDidMount() {
        this.subscription = authService.subscribe(() => this.authenticationChanged());
        this.populateAuthenticationState();
    }

    componentWillUnmount() {
        authService.unsubscribe(this.subscription as number);
    }

    render() {
        console.log(`AuthorizeRoute.Render() path:${this.props.path}`)
        const { ready, authenticated } = this.state;
        var link = document.createElement("a");
        link.href = this.props.path;
        //const returnUrl = `${link.protocol}//${link.host}${link.pathname}${link.search}${link.hash}`;
        const authorizeRouteProps = this.props as AuthorizeRouteComputedProps;
        const returnUrl = `${link.protocol}//${link.host}${authorizeRouteProps.computedMatch.url}`;
        const redirectUrl = `${ApplicationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURI(returnUrl)}`;
        if (!ready) {
            return <div></div>;
        } else {
            const { component: Component, ...rest } = this.props;
            const render = (props: RouteComponentProps<any>): React.ReactNode => {
                if (authenticated) {
                    return <Component {...props} />;
                } else {
                    console.log(`AuthorizeRoute.Render() redirect:${redirectUrl}`)
                    return <Redirect to={redirectUrl} />;
                }
            };
            console.log(`AuthorizeRoute.Render() route render`)
            return <Route {...rest} render={render} />;
        };
    }

    private async populateAuthenticationState() {
        const authenticated: boolean = await authService.isAuthenticated();
        this.setState({ ready: true, authenticated });
    }

    private async authenticationChanged() {
        this.setState({ ready: false, authenticated: false });
        await this.populateAuthenticationState();
    }
}
