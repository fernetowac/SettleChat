import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import thunk from 'redux-thunk';
import { connectRouter, routerMiddleware } from 'connected-react-router';
import { History } from 'history';
import { ApplicationState, reducers } from './';
import { createSignalRMiddleware } from '../middlewares/SignalRMiddleware';
import { createIdentityMiddleware as createOIDCMiddleware } from '../middlewares/IdentityMiddleware';

export default function configureStore(history: History, signalRHubUrl: string, initialState: ApplicationState) {
    const middleware = [
        thunk,
        routerMiddleware(history),
        createSignalRMiddleware(signalRHubUrl),
        createOIDCMiddleware()
    ];

    const rootReducer = combineReducers({
        ...reducers,
        router: connectRouter(history)
    });

    const enhancers = [];
    const windowIfDefined = typeof window === 'undefined' ? null : window as any;
    if (windowIfDefined && windowIfDefined.__REDUX_DEVTOOLS_EXTENSION__) {
        enhancers.push(windowIfDefined.__REDUX_DEVTOOLS_EXTENSION__());
    }

    return createStore(
        rootReducer,
        initialState,
        compose(applyMiddleware(...middleware), ...enhancers)
    );
}
