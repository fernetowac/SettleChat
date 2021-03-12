import * as React from 'react';
import MessagesContainer from "./MessagesContainer"
import MessageInput from './MessageInput';
import OthersWritingActivity from './OthersWritingActivity';
import { RouteComponentProps } from 'react-router';
import { connect, ConnectedProps } from 'react-redux';
import { ApplicationState } from '../store/index';
import { startListeningConversation, stopListeningConversation } from "../store/Conversation";
import { requestConversationDetail } from "../store/conversationDetails";
import { requestConversationUsers } from "../store/common";
import ConversationDetail from './ConversationDetail';
import { Box, IconButton, Grid, Hidden } from '@material-ui/core';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import { useIsMounted } from '../hooks/useIsMounted'
import { enableLoadingMoreMessages, leftPanelContentPush, ContentType } from '../store/ui';
import SlidingStackContainer from './SlidingStackContainer';
import { LeftPanelConversations } from './LeftPanelConversations'

const MessagesPanel = (props: ConnectedProps<typeof connector> & RouteComponentProps<{ conversationId: string }>) => {
    const { requestConversationDetail, requestConversationUsers, startListeningConversation, stopListeningConversation } = props;
    const { connectionId, reconnected } = props;
    const { conversationId } = props.match.params;
    const isMounted = useIsMounted();

    const slideInLeftPanelConversations = () => {
        props.leftPanelContentPush({
            type: ContentType.Conversations,
            hiddenAtBreakpoints: ['sm', 'md', 'lg', 'xl'] /*no need to display conversations in slider in these screen sizes as they will be displayed anyway*/,
            payload: { conversationId }
        })
    }

    React.useEffect(() => {
        requestConversationDetail(conversationId)
            .then(() => {
                if (isMounted()) {
                    return requestConversationUsers(conversationId)
                }
            }) //TODO: when user is connected, we need to update his UserStatus in users list somehow
            .catch(x => console.error(`MessagesPanel catch alert ${x}`));//TODO: can we take some recovery action?
        return () => {
            // cleanup
            //TODO: abort promises for requestConversationDetail and requestConversationUsers
        };
    }, [requestConversationDetail, requestConversationUsers, conversationId, isMounted]);

    React.useEffect(() => {
        // It is always needed to restart listening to conversation when there's new connectionId (even when only reconnected), because new connectionId might be issued also due to server restart
        startListeningConversation({ connectionId, conversationId })
            .catch(x => console.error(`MessagesPanel catch alert ${x}`));//TODO: let user know we're not listening to some conversation updates
        return () => {
            // cleanup
            //TODO: abort promise for startListeningConversation so that it doesn't get finished after stopListeningConversation
            stopListeningConversation({ connectionId, conversationId });
        };
    }, [startListeningConversation, stopListeningConversation, connectionId, reconnected, conversationId]);//TODO: do we need 'reconnected' here?

    return <Grid container direction="row" style={{
        minHeight: 0,
        flexWrap: 'initial',
        flexGrow: 1,
        maxWidth: 1400,
        border: 'solid',
        borderWidth: 1,
        borderColor: 'black',
        alignSelf: 'center',
        position: 'relative' /* needed for SlidingStackContainer (when in xs screen size) which sets its dimensions based on its first relative parent */
    }}>
        <Hidden xsDown={true}>
            <Grid item xs={4} style={{ display: 'flex', flexDirection: 'column', padding: 0, borderRight: '1px solid black', position: 'relative' /* needed for SlidingStackContainer*/, overflow: 'hidden' }}>
                <SlidingStackContainer conversationId={conversationId} />
                <LeftPanelConversations currentConversationId={conversationId} />
            </Grid>
        </Hidden>
        <Hidden smUp>
            <SlidingStackContainer conversationId={conversationId} />
        </Hidden>
        <Grid item xs={12} sm={8} style={{ display: 'flex', padding: 0 }}>
            <Grid container direction="column" style={{ flexWrap: 'initial' }}>
                <Grid item xs={12} style={{ flexBasis: 'initial' }}>
                    <ConversationDetail id={conversationId} />
                    <Hidden smUp>
                        <Box style={{ display: 'flex' }}>
                            <IconButton style={{ marginLeft: 'auto' }} onClick={slideInLeftPanelConversations}><PersonAddIcon /></IconButton>
                        </Box>
                    </Hidden>
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
        connectionId: state.signalR.connectionId,
        reconnected: state.signalR.reconnected
    });
}

const mapDispatchToProps = {
    requestConversationDetail,
    requestConversationUsers,
    startListeningConversation,
    stopListeningConversation,
    enableLoadingMoreMessages,
    leftPanelContentPush
}

const connector = connect(
    mapStateToProps,
    mapDispatchToProps
)

export default connector(MessagesPanel);