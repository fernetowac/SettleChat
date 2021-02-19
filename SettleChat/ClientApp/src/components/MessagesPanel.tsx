import * as React from 'react';
import MessagesContainer from "./MessagesContainer"
import MessageInput from './MessageInput';
import OthersWritingActivity from './OthersWritingActivity';
import { RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as ConversationStore from "../store/Conversation";
import ConversationDetail from './ConversationDetail';
import UsersPanel from './UsersPanel';
import { Grid } from '@material-ui/core';
import * as Sentry from "@sentry/react";
import ErrorBoundaryFallback from './ErrorBoundaryFallback';
import Conversations from './Conversations';
import CreateInvitationPanel from './CreateInvitationPanel';
import { Box, Slide, IconButton } from '@material-ui/core';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import PeopleIcon from '@material-ui/icons/People';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import { useIsMounted } from '../hooks/useIsMounted'
import { AppDispatch } from '../'

// At runtime, Redux will merge together...
type ConversationProps =
    // ... state we've requested from the Redux store
    ReturnType<typeof mapStateToProps>
    & ReturnType<typeof mapDispatchToProps> // ... plus action creators we've requested
    & RouteComponentProps<{ conversationId: string }>; // ... plus incoming routing parameters

const MessagesPanel = (props: ConversationProps) => {
    const { requestConversation, requestUsers, startListeningConversation, stopListeningConversation } = props.actions;
    const { connectionId, reconnected } = props;
    const { conversationId } = props.match.params;
    const isMounted = useIsMounted();

    React.useEffect(() => {
        requestConversation(conversationId)
            .then(() => {
                if (isMounted()) {
                    return requestUsers()
                }
            }) //TODO: when user is connected, we need to update his UserStatus in users list somehow
            .catch(x => console.error(`MessagesPanel catch alert ${x}`));
    }, [requestConversation, requestUsers, conversationId, isMounted]);

    React.useEffect(() => {
        // It is always needed to restart listening to conversation when there's new connectionId (even when only reconnected), because new connectionId might be issued also due to server restart
        startListeningConversation(connectionId, conversationId)
            .catch(x => console.error(`MessagesPanel catch alert ${x}`));
        return () => {
            // cleanup
            stopListeningConversation(connectionId, conversationId);
        };
    }, [startListeningConversation, stopListeningConversation, connectionId, reconnected, conversationId]);

    return <React.Fragment>
        {(props.conversation &&
            <Grid container spacing={3} direction="row" style={{ minHeight: 0, flexWrap: 'initial', flexGrow: 1 }}>
                <Grid item xs={3} style={{ display: 'flex', flexDirection: 'column' }}>
                    <Box style={{ display: 'flex' }}>
                        <IconButton style={{ marginLeft: 'auto' }} onClick={props.actions.displayConversationInvite}><PersonAddIcon /></IconButton>
                        <IconButton onClick={props.actions.displayConversationUsers}><PeopleIcon /></IconButton>
                    </Box>
                    <Box style={{ position: 'relative', display: 'flex', flexGrow: 1, flexDirection: 'column', minHeight: '0px' }}>
                        <Slide direction="right" in={props.conversation.ui.leftPanel.contentKind === ConversationStore.LeftPanelContentKind.ConversationInvite} mountOnEnter unmountOnExit>
                            <Box style={{ flexGrow: 1, backgroundColor: '#dfdfdf', position: 'absolute', width: '100%', height: '100%', zIndex: 2, overflowY: 'auto' }}>
                                <IconButton style={{ marginLeft: 'auto' }} onClick={props.actions.displayConversations}><ArrowBackIcon /></IconButton>
                                Conversation invite
                                <Box marginBottom={2} padding={2} style={{ backgroundColor: '#fff' }}>
                                    <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                                        <CreateInvitationPanel conversationId={conversationId} />
                                    </Sentry.ErrorBoundary>
                                </Box>
                                <Box marginBottom={2} padding={2} style={{ backgroundColor: '#fff' }}>
                                    <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                                        <UsersPanel />
                                    </Sentry.ErrorBoundary>
                                </Box>
                            </Box>
                        </Slide>
                        <Slide direction="right" in={props.conversation.ui.leftPanel.contentKind === ConversationStore.LeftPanelContentKind.ConversationUsers} mountOnEnter unmountOnExit>
                            <Box style={{ flexGrow: 1, position: 'absolute', width: '100%', height: '100%', zIndex: 2 }}>
                                <IconButton style={{ marginLeft: 'auto' }} onClick={props.actions.displayConversations}><ArrowBackIcon /></IconButton>
                            Conversation users</Box>
                        </Slide>
                        <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                            <Conversations />
                        </Sentry.ErrorBoundary>
                    </Box>
                </Grid>
                <Grid item xs={9} style={{ display: 'flex' }}>
                    <Grid container direction="column" style={{ flexWrap: 'initial' }}>
                        <Grid item xs={12} style={{ flexBasis: 'initial' }}>
                            <ConversationDetail />
                        </Grid>
                        <Grid item xs={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 0 }}>
                            <MessagesContainer conversationId={conversationId} />
                        </Grid>
                        <Grid item xs={12} style={{ flexBasis: 'initial' }}>
                            <OthersWritingActivity />
                            <MessageInput conversationId={conversationId} />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        ) ||
            (
                <div>Conversation not loaded</div>
            )}
    </React.Fragment >;
}

const mapStateToProps = (state: ApplicationState) => {
    if (!state.signalR.connectionId) {
        throw new Error('ConnectionId must be set.');
    }
    return ({
        conversation: state.conversation,
        connectionId: state.signalR.connectionId,
        reconnected: state.signalR.reconnected
    });
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    actions: {
        requestConversation: (conversationId: string) => dispatch(
            ConversationStore.actionCreators.requestConversation1(conversationId)),
        requestUsers: () => dispatch(ConversationStore.actionCreators.requestUsers()),
        startListeningConversation: (connectionId: string, conversationId: string) => dispatch(ConversationStore.actionCreators.startListeningConversation(connectionId, conversationId)),
        stopListeningConversation: (connectionId: string, conversationId: string) => dispatch(ConversationStore.actionCreators.stopListeningConversation(connectionId, conversationId)),
        enableLoadingMoreMessages: () => dispatch(ConversationStore.conversationUiActions.enableLoadingMoreMessages()),
        displayConversationInvite: () => dispatch(ConversationStore.conversationUiActions.leftPanelDisplayConversationInvite()),
        displayConversationUsers: () => dispatch(ConversationStore.conversationUiActions.leftPanelDisplayConversationUsers()),
        displayConversations: () => dispatch(ConversationStore.conversationUiActions.leftPanelDisplayConversations())
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(MessagesPanel as any);