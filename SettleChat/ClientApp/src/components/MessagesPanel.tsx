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
import { Box, Slide, IconButton, Grid, Hidden, useMediaQuery, Theme, Typography } from '@material-ui/core';
import * as Sentry from "@sentry/react";
import ErrorBoundaryFallback from './ErrorBoundaryFallback';
import Conversations from './Conversations';
import CreateInvitationPanel from './CreateInvitationPanel';
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
    LeftPanelContentKind,
    setSmallScreen
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
    const matchesSmSize = useMediaQuery<Theme>(theme => theme.breakpoints.up('sm'));

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

    const leftPanel = <Box style={{ position: 'relative', display: 'flex', flexGrow: 1, flexDirection: 'column', minHeight: '0px', overflow: 'hidden' }}>
        <Slide direction="right" in={props.uiLeftPanelContentKind === LeftPanelContentKind.ConversationInvite} mountOnEnter unmountOnExit>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, backgroundColor: '#dfdfdf', position: 'absolute', width: '100%', height: '100%', zIndex: 2 }}>
                <Box>
                    <IconButton style={{ marginLeft: 'auto' }} onClick={props.actions.leftPanelDisplayConversations}>
                        <ArrowBackIcon />
                    </IconButton>
                            Conversation invite
                        </Box>
                <Box style={{ overflowY: 'auto' }}>
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
            </div>
        </Slide>
        <Slide direction="right" in={props.uiLeftPanelContentKind === LeftPanelContentKind.ConversationUsers} mountOnEnter unmountOnExit>
            <Box style={{ flexGrow: 1, position: 'absolute', width: '100%', height: '100%', zIndex: 2 }}>
                <IconButton style={{ marginLeft: 'auto' }} onClick={props.actions.leftPanelDisplayConversations}>
                    <ArrowBackIcon />
                </IconButton>
                                Conversation users
                            </Box>
        </Slide>
        <Box style={{ display: 'flex', alignItems: 'center' }}>
            <Hidden smUp>
                <IconButton onClick={() => props.actions.setSmallScreen(true)}>
                    <ArrowBackIcon />
                </IconButton>
            </Hidden>
            <Typography>Conversations</Typography>
            <IconButton style={{ marginLeft: 'auto' }} onClick={props.actions.leftPanelDisplayConversationInvite}><PersonAddIcon /></IconButton>
            <IconButton onClick={props.actions.leftPanelDisplayConversationUsers}><PeopleIcon /></IconButton>
        </Box>
        <Box style={{ display: 'flex', overflowY: 'hidden' }}>
            <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                <Conversations />
            </Sentry.ErrorBoundary>
        </Box>
    </Box>

    return <Grid container direction="row" style={{
        minHeight: 0,
        flexWrap: 'initial',
        flexGrow: 1,
        maxWidth: 1400,
        border: 'solid',
        borderWidth: 1,
        borderColor: 'black',
        alignSelf: 'center',
        position: 'relative'
    }}>
        <Hidden xsDown={true}>
            <Grid item xs={4} style={{ display: 'flex', flexDirection: 'column', padding: 0, borderRight: '1px solid black' }}>
                {leftPanel}
            </Grid>
        </Hidden>
        <Hidden smUp>
            <Slide direction='right' in={!props.isSmallScreen} mountOnEnter unmountOnExit>
                <div style={{ display: 'flex', flexDirection: 'column', padding: 0, position: 'absolute', width: '100%', height: '100%', zIndex: 2, background: 'red' }}>
                    {leftPanel}
                </div>
            </Slide>
        </Hidden>
        <Grid item sm={8} xs={12} style={{ display: 'flex', padding: 0 }}>
            <Grid container direction="column" style={{ flexWrap: 'initial' }}>
                <Grid item xs={12} style={{ flexBasis: 'initial' }}>
                    <ConversationDetail id={conversationId} />
                    <Box style={{ display: 'flex' }}>
                        <IconButton style={{ marginLeft: 'auto' }} onClick={() => { props.actions.setSmallScreen(!props.isSmallScreen) }}><PersonAddIcon /></IconButton>
                    </Box>
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
        isSmallScreen: state.conversation.ui.isSmallScreen,
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
        leftPanelDisplayConversations: () => dispatch(leftPanelDisplayConversations()),
        setSmallScreen: (isSmallScreen: boolean) => dispatch(setSmallScreen(isSmallScreen))
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(MessagesPanel);