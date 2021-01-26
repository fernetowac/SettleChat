import * as React from 'react';
import * as signalR from '@microsoft/signalr';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import { ThunkDispatch } from 'redux-thunk';
import { actionCreators as signalRActionCreators, KnownActions as signalRKnownActions } from '../actions/SignalRActions';
import authService from '../components/api-authorization/AuthorizeService'
import { useIsMounted } from '../hooks/useIsMounted'

const signalRHubUrl = `${document.location.origin}/conversationHub`;//TODO: take url from some config

export interface ReceivedWritingActivityData {
    conversationId: string;
    userId: string;
    activity: number;
    lastChange: string;
}

//TODO: make sure there is only one SignalRContainer component at the same time. Otherwise it can overwrite redux store connectionId of another one.
const SignalRContainer = (props: SignalRContainerState & MapDispatchToPropsType & { children: React.ReactNode }) => {
    const { identityUserId } = props.data;
    const { connectionEstablished, reconnected, disconnected, messageAdded, writingActivityReceived, userStatusChanged, conversationUpdated } = props.actions;
    const [hubConnection, setHubConnection] = React.useState<signalR.HubConnection>();
    const isMounted = useIsMounted()


    const accessTokenFactory = (): Promise<string> => {
        if (!isMounted()) {
            return Promise.reject('SignalRContainer is already unloaded');
        }
        return authService.getAccessToken().then(token => {
            if (!token) {
                throw new Error('Access token should never be null here');
            }
            return token;
        });
    }

    //TODO: log only when development (it logs also url containing access_token!)
    const buildHubConnection = async (signalRHubUrl: string): Promise<signalR.HubConnection | undefined> => {
        const hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(signalRHubUrl, { accessTokenFactory: accessTokenFactory } as signalR.IHttpConnectionOptions)
            .configureLogging(signalR.LogLevel.Trace)
            .withAutomaticReconnect()
            .build();

        hubConnection.start()
            .then(() => {
                console.log(`SignalRContainer: HUB connected; connectionId: ${hubConnection.connectionId}`);
                connectionEstablished(hubConnection.connectionId as string);
            })
            .catch(err => console.error(err));

        hubConnection.onreconnecting(error => { console.error(`SignalRMiddleware: HUB reconnecting; error: ${error}`) });

        hubConnection.onreconnected((connectionId: string | undefined) => {
            console.log(`SignalRContainer: HUB reconnected. ConnectionId: ${connectionId}`);
            if (!connectionId) {
                console.error('SignalRContainer: HUB reconnected with undefined connectionId');
                return;
            }
            reconnected(connectionId);
        });

        hubConnection.onclose(error => {
            if (error) {
                console.error(`SignalRContainer: connection closed. Error: ${error}`);
            }
            else {
                console.debug('SignalRContainer: connection closed');
            }
            disconnected();
        });

        hubConnection.on("NewMessage", messageAdded);

        hubConnection.on("ConversationWritingActivity", (writingActivity: ReceivedWritingActivityData) => {

            writingActivityReceived({
                ...writingActivity,
                lastChange: (new Date(writingActivity.lastChange) as Date),
                activity: (writingActivity.activity as ConversationStore.WritingActivity)
            });
        });

        hubConnection.on("UserStatusChanged", userStatusChanged);

        hubConnection.on("ConversationUpdated", conversationUpdated);

        return hubConnection;
    }

    React.useEffect(() => {
        // cleanup of hubConnection
        return () => {
            if (!isMounted()) {
                if (hubConnection) {
                    // Note: We must handle stopping hubConnection in useEffect that listens to hubConnection. Otherwise (in other useEffect), hubConnection woult be undefined.
                    hubConnection.stop()
                        .then(() => console.debug('SignalRContainer hubConnection gracefully stopped'))
                        .catch(() => console.debug('SignalRContainer hubConnection stopped ugly'))
                }
            }
        };
    }, [hubConnection]);

    React.useEffect(() => {
        // initialize hubConnection
        buildHubConnection(signalRHubUrl)
            .then(connection => {
                console.debug('SignalRContainer built connection', connection)
                if (connection !== undefined) {
                    setHubConnection(connection)
                }
            });
        return () => {
            console.debug('SignalRContainer cleanup')
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
        conversationUpdated: (conversation: ConversationStore.ConversationDetail) => void;
    }
};
const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, (signalRKnownActions | ConversationStore.MessageAddedAction | ConversationStore.ConversationWritingActivityReceived | ConversationStore.ConversationUserStatusChanged | ConversationStore.ConversationReceivedAction)>): MapDispatchToPropsType => ({
    actions: {
        connectionEstablished: (connectionId: string) => dispatch(signalRActionCreators.connectionEstablished(connectionId)),
        reconnected: (connectionId: string) => dispatch(signalRActionCreators.reconnected(connectionId)),
        disconnected: () => dispatch(signalRActionCreators.disconnected()),
        messageAdded: (message: ConversationStore.MessageCreateResponse) => dispatch(ConversationStore.actionCreators.messageAdded(ConversationStore.transformMessageCreateResponse(message))),
        writingActivityReceived: (writingActivity: ConversationStore.ReceivedWritingActivityData) => dispatch(ConversationStore.actionCreators.writingActivityReceived(writingActivity)),
        userStatusChanged: (userId: string, status: ConversationStore.UserStatus) => dispatch(ConversationStore.actionCreators.userStatusChanged(userId, status)),
        conversationUpdated: (conversation: ConversationStore.ConversationDetail) => dispatch(ConversationStore.actionCreators.conversationReceived(conversation))
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
