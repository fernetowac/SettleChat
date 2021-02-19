import 'react-app-polyfill/ie11'; // this must be the first line
import 'bootstrap/dist/css/bootstrap.css';
import 'fontsource-roboto';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { ConnectedRouter } from 'connected-react-router';
import { createBrowserHistory } from 'history';
import configureStore from './store/configureStore';
import App from './App';
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";
import { InitialApplicationState } from './store/index';
import { SnackbarProvider } from 'notistack';
//import registerServiceWorker from './registerServiceWorker';

Sentry.init({
    dsn: "https://4ec687e2f4424198bf178e95a1edb5b0@o448551.ingest.sentry.io/5430062",
    integrations: [
        new Integrations.BrowserTracing(),
    ],
    tracesSampleRate: 1.0,
});

// Create browser history to use in the Redux store
const baseUrl = document.getElementsByTagName('base')[0].getAttribute('href') as string;
const history = createBrowserHistory({ basename: baseUrl });
const signalRHubUrl = `${document.location.origin}/conversationHub`;//TODO: take url from some config

// Get the application-wide store instance, prepopulating with state from the server where available.
const store = configureStore(history, InitialApplicationState);
export type AppDispatch = typeof store.dispatch

ReactDOM.render(
    <Provider store={store}>
        <ConnectedRouter history={history}>
            <SnackbarProvider maxSnack={3}>
                <App />
            </SnackbarProvider>
        </ConnectedRouter>
    </Provider>,
    document.getElementById('root'));
// Uncomment the line above that imports the registerServiceWorker function
// and the line below to register the generated service worker.
// By default create-react-app includes a service worker to improve the
// performance of the application by caching static assets. This service
// worker can interfere with the Identity UI, so it is
// disabled by default when Identity is being used.
//
//registerServiceWorker();