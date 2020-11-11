import * as React from 'react';
import { Route, Switch, RouteComponentProps } from 'react-router';
import Layout from './components/Layout';
import Home from './components/Home';
import Counter from './components/Counter';
import FetchData from './components/FetchData';
import MessagesPanel from './components/MessagesPanel';
import NewConversation from './components/NewConversation';
import Token from './components/Token';
import AuthorizeRoute from './components/api-authorization/AuthorizeRoute';
import ApiAuthorizationRoutes from './components/api-authorization/ApiAuthorizationRoutes';
import { ApplicationPaths } from './components/api-authorization/ApiAuthorizationConstants';
import PageNotFound from './components/PageNotFound';
import * as Sentry from "@sentry/react";
import ErrorBoundaryFallback from './components/ErrorBoundaryFallback';
import SignalRContainer from './components/SignalRContainer';
import CssBaseline from '@material-ui/core/CssBaseline';

import './custom.css'

export default () => (
    <React.Fragment>
        <CssBaseline />
        <Switch>
            <Route path='/token/:token' component={Token} />
            <Route path={ApplicationPaths.ApiAuthorizationPrefix} component={ApiAuthorizationRoutes} />
            <Layout>
                <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                    <Switch>
                        <Route exact path='/' component={Home} />
                        <Route path='/counter' component={Counter} />
                        <AuthorizeRoute path='/fetch-data/:startDateIndex?' component={FetchData} />
                        <AuthorizeRoute path='/conversation/:conversationId' render={(props: RouteComponentProps<any>) => (
                            <SignalRContainer>
                                <MessagesPanel {...props} />
                            </SignalRContainer>)} />
                        <Route path='/start-conversation' component={NewConversation} />
                        <Route path='*' component={PageNotFound} />
                    </Switch>
                </Sentry.ErrorBoundary>
            </Layout>
        </Switch>
    </React.Fragment>
);
