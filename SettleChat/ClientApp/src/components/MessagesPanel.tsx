import * as React from 'react';
import MessagesContainer from "./MessagesContainer"
import MessageInput from './MessageInput';
import OthersWritingActivity from './OthersWritingActivity';
import { RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as ConversationStore from "../store/Conversation";
import { requestConversationDetail } from "../store/conversationDetails";
import { requestConversationUsers } from "../store/common";
import ConversationDetail from './ConversationDetail';
import Users from './Users';
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
import {
    enableLoadingMoreMessages,
    leftPanelDisplayConversationInvite,
    leftPanelDisplayConversationUsers,
    leftPanelDisplayConversations,
    LeftPanelContentKind
} from '../store/ui';

// At runtime, Redux will merge together...
type ConversationProps =
    // ... state we've requested from the Redux store
    ReturnType<typeof mapStateToProps>
    & ReturnType<typeof mapDispatchToProps> // ... plus action creators we've requested
    & RouteComponentProps<{ conversationId: string }>; // ... plus incoming routing parameters

const MessagesPanel = (props: ConversationProps) => {
    const { requestConversationDetail, requestConversationUsers, startListeningConversation, stopListeningConversation } = props.actions;
    const { connectionId, reconnected } = props;
    const { conversationId } = props.match.params;
    const isMounted = useIsMounted();

    React.useEffect(() => {
        requestConversationDetail(conversationId)
            .then(() => {
                if (isMounted()) {
                    return requestConversationUsers(conversationId)
                }
            }) //TODO: when user is connected, we need to update his UserStatus in users list somehow
            .catch(x => console.error(`MessagesPanel catch alert ${x}`));
        return () => {
            // cleanup
            //TODO: abort promises for requestConversationDetail and requestConversationUsers
        };
    }, [requestConversationDetail, requestConversationUsers, conversationId, isMounted]);

    React.useEffect(() => {
        // It is always needed to restart listening to conversation when there's new connectionId (even when only reconnected), because new connectionId might be issued also due to server restart
        startListeningConversation(connectionId, conversationId)
            .catch(x => console.error(`MessagesPanel catch alert ${x}`));
        return () => {
            // cleanup
            //TODO: abort promise for startListeningConversation so that it doesn't get finished after stopListeningConversation
            stopListeningConversation(connectionId, conversationId);
        };
    }, [startListeningConversation, stopListeningConversation, connectionId, reconnected, conversationId]);//TODO: do we need 'reconnected' here?

    return <Grid container spacing={3} direction="row" style={{ minHeight: 0, flexWrap: 'initial', flexGrow: 1 }}>
        <Grid item xs={3} style={{ display: 'flex', flexDirection: 'column' }}>
            <Box style={{ display: 'flex' }}>
                <IconButton style={{ marginLeft: 'auto' }} onClick={props.actions.leftPanelDisplayConversationInvite}><PersonAddIcon /></IconButton>
                <IconButton onClick={props.actions.leftPanelDisplayConversationUsers}><PeopleIcon /></IconButton>
            </Box>
            <Box style={{ position: 'relative', display: 'flex', flexGrow: 1, flexDirection: 'column', minHeight: '0px' }}>
                <Slide direction="right" in={props.uiLeftPanelContentKind === LeftPanelContentKind.ConversationInvite} mountOnEnter unmountOnExit>
                    <Box style={{ flexGrow: 1, backgroundColor: '#dfdfdf', position: 'absolute', width: '100%', height: '100%', zIndex: 2, overflowY: 'auto' }}>
                        <IconButton style={{ marginLeft: 'auto' }} onClick={props.actions.leftPanelDisplayConversations}><ArrowBackIcon /></IconButton>
                                Conversation invite
                                <Box marginBottom={2} padding={2} style={{ backgroundColor: '#fff' }}>
                            <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                                <CreateInvitationPanel conversationId={conversationId} />
                            </Sentry.ErrorBoundary>
                        </Box>
                        <Box marginBottom={2} padding={2} style={{ backgroundColor: '#fff' }}>
                            <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                                <Users conversationId={conversationId} />
                            </Sentry.ErrorBoundary>
                        </Box>
                    </Box>
                </Slide>
                <Slide direction="right" in={props.uiLeftPanelContentKind === LeftPanelContentKind.ConversationUsers} mountOnEnter unmountOnExit>
                    <Box style={{ flexGrow: 1, position: 'absolute', width: '100%', height: '100%', zIndex: 2 }}>
                        <IconButton style={{ marginLeft: 'auto' }} onClick={props.actions.leftPanelDisplayConversations}>
                            <ArrowBackIcon />
                        </IconButton>
                                Conversation users
                            </Box>
                </Slide>
                <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                    <Conversations />
                </Sentry.ErrorBoundary>
            </Box>
        </Grid>
        <Grid item xs={9} style={{ display: 'flex' }}>
            <Grid container direction="column" style={{ flexWrap: 'initial' }}>
                <Grid item xs={12} style={{ flexBasis: 'initial' }}>
                    <ConversationDetail id={conversationId} />
                </Grid>
                <Grid item xs={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 0 }}>
                    <MessagesContainer conversationId={conversationId} />
                </Grid>
                <Grid item xs={12} style={{ flexBasis: 'initial' }}>
                    <OthersWritingActivity conversationId={conversationId} />
                    <MessageInput conversationId={conversationId} />
                </Grid>
            </Grid>
        </Grid>
    </Grid>
}

const mapStateToProps = (state: ApplicationState) => {
    if (!state.signalR.connectionId) {
        throw new Error('ConnectionId must be set.');
    }
    return ({
        uiLeftPanelContentKind: state.conversation.ui.leftPanel.contentKind,
        connectionId: state.signalR.connectionId,
        reconnected: state.signalR.reconnected
    });
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    actions: {
        requestConversationDetail: (conversationId: string) => dispatch(requestConversationDetail(conversationId)),
        requestConversationUsers: (conversationId: string) => dispatch(requestConversationUsers(conversationId)),
        startListeningConversation: (connectionId: string, conversationId: string) => dispatch(ConversationStore.actionCreators.startListeningConversation({ connectionId, conversationId })),
        stopListeningConversation: (connectionId: string, conversationId: string) => dispatch(ConversationStore.actionCreators.stopListeningConversation({ connectionId, conversationId })),
        enableLoadingMoreMessages: () => dispatch(enableLoadingMoreMessages()),
        leftPanelDisplayConversationInvite: () => dispatch(leftPanelDisplayConversationInvite()),
        leftPanelDisplayConversationUsers: () => dispatch(leftPanelDisplayConversationUsers()),
        leftPanelDisplayConversations: () => dispatch(leftPanelDisplayConversations())
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(MessagesPanel as any);