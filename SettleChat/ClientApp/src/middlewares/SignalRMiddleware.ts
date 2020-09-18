import * as signalR from '@microsoft/signalr';
import { actionCreators } from '../store/Conversation';
import { Middleware } from 'redux';

export const createSignalRMiddleware = (url: string): Middleware => {
    return store => {
        const hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(url)
            .configureLogging(signalR.LogLevel.Trace)
            .withAutomaticReconnect()
            .build();
        hubConnection.start()
            .then(() => {
                console.log('SignalR connection established.');
            })
            .catch(err => console.error(err));

        hubConnection.on("NewMessage", (message) => {
            store.dispatch(actionCreators.messageAdded(message));
        });

        return next => action => {
            return next(action);
        }
    }
}