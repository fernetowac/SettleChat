import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import thunk from 'redux-thunk';
import { connectRouter, routerMiddleware } from 'connected-react-router';
import { History } from 'history';
import { ApplicationState, reducers } from './index';
import { createIdentityMiddleware as createOIDCMiddleware } from '../middlewares/IdentityMiddleware';
import { createConversationMiddleware } from '../middlewares/ConversationMiddleware';

export default function configureStore(history: History, initialState: ApplicationState) {
    const middleware = [
        thunk,
        routerMiddleware(history),
        createOIDCMiddleware(),
        createConversationMiddleware()
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
