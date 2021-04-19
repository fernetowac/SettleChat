import * as React from 'react'
import { RouteComponentProps } from 'react-router'
import { connect, ConnectedProps } from 'react-redux'
import { ApplicationState } from '../store/index'
import { startListeningConversation, stopListeningConversation } from '../store/Conversation'
import { requestConversationDetail } from '../store/conversationDetails'
import { requestConversationUsers } from '../store/common'
import { useIsMounted } from '../hooks/useIsMounted'
import { enableLoadingMoreMessages, leftPanelContentPush, ContentType } from '../store/ui'
import MessagesPanel from './MessagesPanel'

const MessagesPanelContainer = (
    props: ConnectedProps<typeof connector> & RouteComponentProps<{ conversationId: string }>
) => {
    const {
        requestConversationDetail,
        requestConversationUsers,
        startListeningConversation,
        stopListeningConversation,
    } = props
    const { connectionId, reconnected } = props
    const { conversationId } = props.match.params
    const isMounted = useIsMounted()

    const slideInLeftPanelConversations = () => {
        props.leftPanelContentPush({
            type: ContentType.Conversations,
            hiddenAtBreakpoints: [
                'sm',
                'md',
                'lg',
                'xl',
            ] /*no need to display conversations in slider in these screen sizes as they will be displayed anyway*/,
            payload: { conversationId },
        })
    }

    React.useEffect(() => {
        requestConversationDetail(conversationId)
            .then(() => {
                if (isMounted()) {
                    return requestConversationUsers(conversationId)
                }
            }) //TODO: when user is connected, we need to update his UserStatus in users list somehow
            .catch((x) => console.error(`MessagesPanel catch alert ${x}`)) //TODO: can we take some recovery action?
        return () => {
            // cleanup
            //TODO: abort promises for requestConversationDetail and requestConversationUsers
        }
    }, [requestConversationDetail, requestConversationUsers, conversationId, isMounted])

    React.useEffect(() => {
        // It is always needed to restart listening to conversation when there's new connectionId (even when only reconnected), because new connectionId might be issued also due to server restart
        startListeningConversation({ connectionId, conversationId }).catch((x) =>
            console.error(`MessagesPanel catch alert ${x}`)
        ) //TODO: let user know we're not listening to some conversation updates
        return () => {
            // cleanup
            //TODO: abort promise for startListeningConversation so that it doesn't get finished after stopListeningConversation
            stopListeningConversation({ connectionId, conversationId })
        }
    }, [
        startListeningConversation,
        stopListeningConversation,
        connectionId,
        reconnected,
        conversationId,
    ]) //TODO: do we need 'reconnected' here?

    return (
        <MessagesPanel
            conversationId={conversationId}
            slideInLeftPanelConversations={slideInLeftPanelConversations}
        />
    )
}

const mapStateToProps = (state: ApplicationState) => {
    if (!state.signalR.connectionId) {
        throw new Error('ConnectionId must be set.')
    }
    return {
        connectionId: state.signalR.connectionId,
        reconnected: state.signalR.reconnected,
    }
}

const mapDispatchToProps = {
    requestConversationDetail,
    requestConversationUsers,
    startListeningConversation,
    stopListeningConversation,
    enableLoadingMoreMessages,
    leftPanelContentPush,
}

const connector = connect(mapStateToProps, mapDispatchToProps)

export default connector(MessagesPanelContainer)
