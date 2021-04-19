import * as React from 'react'
import { Component } from 'react'
import { RouteProps } from 'react-router'
import { Route, Redirect } from 'react-router-dom'
import { ApplicationPaths, QueryParameterNames } from './ApiAuthorizationConstants'
import authService from './AuthorizeService'
import { RouteComponentProps, match } from 'react-router'

type AuthorizeRouteComputedProps = RouteProps & {
    path: string
    render?: (props: RouteComponentProps<any>) => React.ReactNode //typeof PropTypes.func;
    computedMatch?: match
}

interface AuthorizeRouteState {
    ready: boolean
    authenticated: boolean
}

export default class AuthorizeRoute extends Component<
    AuthorizeRouteComputedProps,
    AuthorizeRouteState
> {
    constructor(
        props: AuthorizeRouteComputedProps & RouteComponentProps<{ startDateIndex: string }>
    ) {
        super(props)

        this.state = {
            ready: false,
            authenticated: false,
        }
    }

    private subscription: number | undefined = undefined

    componentDidMount() {
        this.subscription = authService.subscribe(() => this.authenticationChanged())
        this.populateAuthenticationState()
    }

    componentWillUnmount() {
        authService.unsubscribe(this.subscription as number)
    }

    render() {
        console.debug(`AuthorizeRoute.Render() path:${this.props.path}`)
        const { ready, authenticated } = this.state
        if (!ready) {
            return <div>Loading..</div>
        }

        const { component: Component, ...rest } = this.props
        const render = (props: RouteComponentProps<any>): React.ReactNode => {
            if (authenticated) {
                if (!this.props.render === !Component) {
                    throw new Error(
                        'Either render or component props must be provided. Not both, not none.'
                    )
                }
                if (this.props.render) {
                    return this.props.render(props)
                }
                if (Component) {
                    return <Component {...props} />
                }
                throw new Error('unreachable')
            } else {
                const link = document.createElement('a')
                link.href = this.props.path
                //const returnUrl = `${link.protocol}//${link.host}${link.pathname}${link.search}${link.hash}`;
                const authorizeRouteProps = this.props as AuthorizeRouteComputedProps
                if (!authorizeRouteProps.computedMatch) {
                    throw new Error(`Switch didn't compute match for us`)
                }
                const returnUrl = `${link.protocol}//${link.host}${authorizeRouteProps.computedMatch.url}`
                const redirectUrl = `${ApplicationPaths.Login}?${
                    QueryParameterNames.ReturnUrl
                }=${encodeURI(returnUrl)}`
                console.debug(`AuthorizeRoute.Render() redirect:${redirectUrl}`)
                return <Redirect to={redirectUrl} />
            }
        }
        console.debug(`AuthorizeRoute.Render() route render`)
        return <Route {...rest} render={render} />
    }

    private async populateAuthenticationState() {
        const authenticated: boolean = await authService.isAuthenticated()
        this.setState({ ready: true, authenticated })
    }

    private async authenticationChanged() {
        console.debug('AuthorizeRoute authenticationChanged')
        this.setState({ ready: false, authenticated: false })
        await this.populateAuthenticationState()
    }
}
