import * as React from 'react'
import {
    Collapse,
    Container,
    Navbar,
    NavbarBrand,
    NavbarToggler,
    NavItem,
    NavLink,
} from 'reactstrap'
import { Link } from 'react-router-dom'
import './NavMenu.css'
import { LoginMenu } from './api-authorization/LoginMenu'
import * as Sentry from '@sentry/react'
import ErrorBoundaryFallback from './ErrorBoundaryFallback'

export default class NavMenu extends React.PureComponent<{}, { isOpen: boolean }> {
    public state = {
        isOpen: false,
    }

    public render() {
        return (
            <header>
                <Navbar
                    className="navbar-expand-sm navbar-toggleable-sm border-bottom box-shadow mb-3"
                    light
                >
                    <Container>
                        <NavbarBrand tag={Link} to="/">
                            SettleChat
                        </NavbarBrand>
                        <NavbarToggler onClick={this.toggle} className="mr-2" />
                        <Collapse
                            className="d-sm-inline-flex flex-sm-row-reverse"
                            isOpen={this.state.isOpen}
                            navbar
                        >
                            <ul className="navbar-nav flex-grow">
                                <NavItem>
                                    <NavLink tag={Link} className="text-dark" to="/home">
                                        Home
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink tag={Link} className="text-dark" to="/fetch-messages">
                                        Messages
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink tag={Link} className="text-dark" to="/messages-panel">
                                        Messages panel
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        tag={Link}
                                        className="text-dark"
                                        to="/start-conversation"
                                    >
                                        Start conversation
                                    </NavLink>
                                </NavItem>
                                <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                                    <LoginMenu />
                                </Sentry.ErrorBoundary>
                            </ul>
                        </Collapse>
                    </Container>
                </Navbar>
            </header>
        )
    }

    private toggle = () => {
        this.setState({
            isOpen: !this.state.isOpen,
        })
    }
}
