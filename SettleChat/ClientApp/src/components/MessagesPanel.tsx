import * as React from 'react';
import Messages from "./Messages"
import MessageInput from './MessageInput';
import OthersWritingActivity from './OthersWritingActivity';
import { RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import * as ConversationStore from "../store/Conversation";
import ConversationDetail from './ConversationDetail';
import UsersPanel from './UsersPanel';
import { Grid } from '@material-ui/core';

type ConversationPropsStateType = {
    conversation: ConversationStore.ConversationState | undefined;
    connectionId: string;
    reconnected: boolean;
};
// At runtime, Redux will merge together...
type ConversationProps =
    // ... state we've requested from the Redux store
    ConversationPropsStateType
    & MapDispatchToPropsType // ... plus action creators we've requested
    & RouteComponentProps<{ conversationId: string }>; // ... plus incoming routing parameters

const MessagesPanel = (props: ConversationProps) => {
    const { requestConversation, requestMessages, requestUsers, startListeningConversation, stopListeningConversation } = props.actions;
    const { connectionId, reconnected } = props;
    const { conversationId } = props.match.params;

    React.useEffect(() => {
        requestConversation(conversationId)
            .then(() => requestMessages())
            .then(() => requestUsers()) //TODO: when user is connected, we need to update his UserStatus in users list somehow
            .catch(x => console.error(`MessagesPanel catch alert ${x}`));
    }, [requestConversation, requestMessages, requestUsers, conversationId]);

    React.useEffect(() => {
        // It is always needed to restart listening to conversation when there's new connectionId (even when only reconnected), because new connectionId might be issued also due to server restart
        startListeningConversation(connectionId, conversationId)
            .catch(x => console.error(`MessagesPanel catch alert ${x}`));
        return () => stopListeningConversation(connectionId, conversationId);
    }, [startListeningConversation, stopListeningConversation, connectionId, reconnected, conversationId]);

    return <React.Fragment>
        {(props.conversation &&
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <ConversationDetail />
                </Grid>
                <Grid item xs={2}>
                    <UsersPanel />
                </Grid>
                <Grid container xs={10}>
                    <Grid item xs={12}>
                        <Messages />
                    </Grid>
                    <Grid item xs={12}>
                        <OthersWritingActivity />
                        <MessageInput />
                    </Grid>
                </Grid>
            </Grid>
        ) ||
            (
                <div>Conversation not loaded</div>
            )}
    </React.Fragment>;
}

type MapDispatchToPropsType = {
    actions: {
        requestConversation: (conversationId: string) => Promise<ConversationStore.ConversationDetail | never>;
        requestMessages: () => Promise<ConversationStore.Message[] | void>;
        requestUsers: () => Promise<ConversationStore.User[] | void>;
        startListeningConversation: (connectionId: string, conversationId: string) => Promise<void>;
        stopListeningConversation: (connectionId: string, conversationId: string) => void;
    }
};
const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationStore.ConversationKnownAction>): MapDispatchToPropsType => ({
    actions: {
        requestConversation: (conversationId: string) => dispatch(
            ConversationStore.actionCreators.requestConversation1(conversationId)),
        requestMessages: () => dispatch(ConversationStore.actionCreators.requestMessages()),
        requestUsers: () => dispatch(ConversationStore.actionCreators.requestUsers()),
        startListeningConversation: (connectionId: string, conversationId: string) => dispatch(ConversationStore.actionCreators.startListeningConversation(connectionId, conversationId)),
        stopListeningConversation: async (connectionId: string, conversationId: string) => await dispatch(ConversationStore.actionCreators.stopListeningConversation(connectionId, conversationId))
    }
});

export default connect(
    (state: ApplicationState): ConversationPropsStateType => {
        if (!state.signalR.connectionId) {
            throw new Error('ConnectionId must be set.');
        }
        return ({
            conversation: state.conversation,
            connectionId: state.signalR.connectionId,
            reconnected: state.signalR.reconnected
        });
    }, // Selects which state properties are merged into the component's props
    mapDispatchToProps
)(MessagesPanel as any);