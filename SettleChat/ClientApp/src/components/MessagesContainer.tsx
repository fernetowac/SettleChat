import { unwrapResult } from '@reduxjs/toolkit'
import * as React from 'react'
import { connect, ConnectedProps } from 'react-redux'
import { createSelector } from '@reduxjs/toolkit'
import { ApplicationState } from '../store/index'
import { requestMessagesByConversationId, messagesOfConversationSelector } from '../store/messages'
import { enableLoadingMoreMessages, disableLoadingMoreMessages } from '../store/ui'
import { Messages } from './Messages'
import { Message } from '../types/messageTypes'
import { Ascending, lowestBy } from '../helpers/sortHelper'
import { selectUsersByConversationId } from '../store/users'

export interface GetTriggerOptions<TTarget extends HTMLElement | Window> {
    disableHysteresis?: boolean
    target: TTarget
    threshold?: number
}

const MessagesContainer = (props: ConnectedProps<typeof connector>) => {
    const {
        requestMessagesByConversationId,
        enableLoadingMoreMessages,
        disableLoadingMoreMessages,
        conversationId,
    } = props
    const [loadMoreButtonEnabled, setLoadMoreButtonActive] = React.useState(true)
    const [isLoading, setIsLoading] = React.useState(true)

    const onLoadMoreClicked = () => {
        const oldestMessage = lowestBy(props.messages, (x) => x.created)
        setLoadMoreButtonActive(false)
        const amountOfMessagesToLoad = 2
        requestMessagesByConversationId({
            conversationId,
            beforeId: (oldestMessage && oldestMessage.id) || undefined,
            amount: amountOfMessagesToLoad,
        })
            .then(unwrapResult)
            .then((messages) => {
                if (messages.length < amountOfMessagesToLoad) {
                    disableLoadingMoreMessages()
                }
            })
            .finally(() => setLoadMoreButtonActive(true))
    }

    React.useEffect(() => {
        let isMounted = true
        const amountOfMessagesToLoad = 2
        requestMessagesByConversationId({
            conversationId,
            beforeId: undefined,
            amount: amountOfMessagesToLoad,
        })
            .then(unwrapResult)
            .then((messages) => {
                if (messages.length >= amountOfMessagesToLoad) {
                    enableLoadingMoreMessages()
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false)
                }
            })
        return () => {
            isMounted = false
        }
    }, [requestMessagesByConversationId, enableLoadingMoreMessages, conversationId])

    return (
        <Messages
            isLoading={isLoading}
            onLoadMoreClicked={onLoadMoreClicked}
            loadMoreButtonEnabled={loadMoreButtonEnabled}
            messages={props.messages}
            users={props.users}
            ui={props.ui}
            me={props.me}
            conversationId={props.conversationId}
        />
    )
}

const getSortedMessages = (messages: Message[]): Message[] =>
    messages.sort(Ascending.by((message) => message.created))
const getTypedMessages = (
    messages: Message[]
): (Omit<Message, 'created'> & { created: Date })[] => {
    return messages.map((message) => ({
        ...message,
        created: new Date(message.created),
    }))
}

/**
 * Memoized sorting of messages
 */
const sortedTypedMessagesSelector = createSelector([messagesOfConversationSelector], (messages) =>
    getTypedMessages(getSortedMessages(messages))
)

const mapDispatchToProps = {
    requestMessagesByConversationId,
    enableLoadingMoreMessages,
    disableLoadingMoreMessages,
}

interface OwnProps {
    conversationId: string
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps) => {
    return {
        messages: sortedTypedMessagesSelector(state, ownProps),
        users: selectUsersByConversationId(state, ownProps),
        me: {
            userId: state.identity.userId,
        },
        ui: {
            canLoadMoreMessages: state.conversation
                ? state.conversation.ui.canLoadMoreMessages
                : false,
        },
        conversationId: ownProps.conversationId,
    }
}

const connector = connect(mapStateToProps, mapDispatchToProps)

export default connector(MessagesContainer as any)
