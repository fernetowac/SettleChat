import * as React from 'react';
import * as signalR from '@microsoft/signalr';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import { ThunkDispatch } from 'redux-thunk';
import { actionCreators as signalRActionCreators, KnownActions as signalRKnownActions } from '../actions/SignalRActions';
import authService from '../components/api-authorization/AuthorizeService';

const signalRHubUrl = `${document.location.origin}/conversationHub`;//TODO: take url from some config

//TODO: make sure there is only one SignalRContainer component at the same time. Otherwise it can overwrite redux store connectionId of another one.
const SignalRContainer = (props: SignalRContainerState & MapDispatchToPropsType & { children: React.ReactNode }) => {
    const { identityUserId } = props.data;
    const { connectionEstablished, reconnected, disconnected, messageAdded, writingActivityReceived, userStatusChanged } = props.actions;
    const [hubConnection, setHubConnection] = React.useState<signalR.HubConnection>();

    const accessTokenFactory = (): Promise<string> => {
        return authService.getAccessToken().then(token => {
            if (!token) {
                throw new Error('Access token should never be null here');
            }
            return token;
        });
    }

    const buildHubConnection = async (signalRHubUrl: string): Promise<signalR.HubConnection | undefined> => {
        const hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(signalRHubUrl, { accessTokenFactory: accessTokenFactory } as signalR.IHttpConnectionOptions)
            .configureLogging(signalR.LogLevel.Trace)
            .withAutomaticReconnect()
            .build();

        hubConnection.start()
            .then(() => {
                console.log(`SignalRMiddleware: HUB connected; connectionId: ${hubConnection.connectionId}`);
                connectionEstablished(hubConnection.connectionId as string);
            })
            .catch(err => console.error(err));

        hubConnection.onreconnecting(error => { console.error(`SignalRMiddleware: HUB reconnecting; error: ${error}`) });

        hubConnection.onreconnected((connectionId: string | undefined) => {
            console.log(`SignalRMiddleware: HUB reconnected; connectionId: ${connectionId}`);
            if (!connectionId) {
                window.alert('SignalRMiddleware: HUB reconnected with undefined connectionId');
                return;
            }
            reconnected(connectionId);
        });
        hubConnection.onclose(error => {
            console.error(`SignalRMiddleware: HUB closed; error: ${error}`);
            disconnected();
        });

        hubConnection.on("NewMessage", (message) => {
            messageAdded(message);
        });

        hubConnection.on("ConversationWritingActivity", (writingActivity) => {
            writingActivityReceived(writingActivity);
        });

        hubConnection.on("UserStatusChanged", (userId: string, status: ConversationStore.UserStatus) => {
            userStatusChanged(userId, status);
        });

        return hubConnection;
    }

    React.useEffect(() => {
        buildHubConnection(signalRHubUrl)
            .then(setHubConnection);
        return () => {
            if (hubConnection) {
                hubConnection.stop().then(() => {
                    setHubConnection(undefined);
                });
            }
        };
    }, []);

    return (hubConnection && hubConnection.connectionId) ? (<React.Fragment>{props.children}</React.Fragment>) :
        <React.Fragment>Not connected for receiving notifications.</React.Fragment>;
}

type MapDispatchToPropsType = {
    actions: {
        connectionEstablished: (connectionId: string) => void;
        reconnected: (connectionId: string) => void;
        disconnected: () => void;
        messageAdded: (message: ConversationStore.MessageCreateResponse) => void;
        writingActivityReceived: (writingActivity: ConversationStore.ReceivedWritingActivityData) => void;
        userStatusChanged: (userId: string, status: ConversationStore.UserStatus) => void;
    }
};
const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, (signalRKnownActions | ConversationStore.MessageAddedAction | ConversationStore.ConversationWritingActivityReceived | ConversationStore.ConversationUserStatusChanged)>): MapDispatchToPropsType => ({
    actions: {
        connectionEstablished: (connectionId: string) => dispatch(signalRActionCreators.connectionEstablished(connectionId)),
        reconnected: (connectionId: string) => dispatch(signalRActionCreators.reconnected(connectionId)),
        disconnected: () => dispatch(signalRActionCreators.disconnected()),
        messageAdded: (message: ConversationStore.MessageCreateResponse) => dispatch(ConversationStore.actionCreators.messageAdded(message)),
        writingActivityReceived: (writingActivity: ConversationStore.ReceivedWritingActivityData) => dispatch(ConversationStore.actionCreators.writingActivityReceived(writingActivity)),
        userStatusChanged: (userId: string, status: ConversationStore.UserStatus) => dispatch(ConversationStore.actionCreators.userStatusChanged(userId, status))
    }
});

interface SignalRContainerState {
    data: {
        connectionId: string | null;
        identityUserId: string | null;
    }
}

//TODO: state members seems to be unused, so they might be removed
const mapStateToProps = (state: ApplicationState): SignalRContainerState => ({
    data: {
        connectionId: state.signalR.connectionId,
        identityUserId: state.identity.userId
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SignalRContainer as any);
