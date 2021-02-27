import { configureStore as toolkitConfigureStore, combineReducers } from '@reduxjs/toolkit'
import { connectRouter, routerMiddleware } from 'connected-react-router';
import { History } from 'history';
import { reducers } from './index';
import { createIdentityMiddleware as createOIDCMiddleware } from '../middlewares/IdentityMiddleware';
import { createConversationMiddleware } from '../middlewares/ConversationMiddleware';

export default function configureStore(history: History) {
    const middlewares = [
        routerMiddleware(history),
        createOIDCMiddleware(),
        createConversationMiddleware()
    ];

    const rootReducer = combineReducers({
        ...reducers,
        router: connectRouter(history)
    });

    return toolkitConfigureStore({
        reducer: rootReducer,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(middlewares),
        devTools: { traceLimit: 25 }
    });
}
