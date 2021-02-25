import { unwrapResult } from '@reduxjs/toolkit'
import * as React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import { Messages } from './Messages'
import { AppDispatch } from '../'
import { Message } from '../types/messageTypes'
import { Ascending, lowestBy } from '../helpers/sortHelper'

type MessagesContainerProps =
    ReturnType<typeof mapStateToProps>
    & ReturnType<typeof mapDispatchToProps> & { isLoading: boolean, loadMoreButtonEnabled: boolean, onLoadMoreClicked: () => void };

export interface GetTriggerOptions<TTarget extends HTMLElement | Window> {
    disableHysteresis?: boolean;
    target: TTarget;
    threshold?: number;
}

const MessagesContainer = (props: MessagesContainerProps) => {
    const { requestMessages, enableLoadingMoreMessages, disableLoadingMoreMessages } = props.actions;
    const { conversationId } = props;
    const [loadMoreButtonEnabled, setLoadMoreButtonActive] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(true);

    const onLoadMoreClicked = () => {
        const oldestMessage = lowestBy(props.messages, (x) => x.created)
        setLoadMoreButtonActive(false);
        const amountOfMessagesToLoad = 2;
        props.actions.requestMessages(conversationId, (oldestMessage && oldestMessage.id) || undefined, amountOfMessagesToLoad)
            .then(unwrapResult)
            .then(messages => {
                if (messages.length < amountOfMessagesToLoad) {
                    disableLoadingMoreMessages();
                }
            })
            .finally(() => setLoadMoreButtonActive(true));
    }

    React.useEffect(() => {
        let isMounted = true;
        const amountOfMessagesToLoad = 2;
        requestMessages(conversationId, undefined, amountOfMessagesToLoad)
            .then(unwrapResult)
            .then(messages => {
                if (messages.length >= amountOfMessagesToLoad) {
                    enableLoadingMoreMessages();
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [requestMessages, enableLoadingMoreMessages, conversationId]);

    return <Messages
        isLoading={isLoading}
        onLoadMoreClicked={onLoadMoreClicked}
        loadMoreButtonEnabled={loadMoreButtonEnabled}
        messages={props.messages}
        users={props.users}
        ui={props.ui}
        me={props.me}
        conversationId={props.conversationId}
    />
}

const getMessages = (state: ApplicationState, conversationId: string): Message[] =>
    state.conversation.messages
        .filter(message => message.conversationId === conversationId)

const getSortedMessages = (messages: Message[]): Message[] => messages.sort(Ascending.by((message) => message.created));
const getTypedMessages = (messages: Message[]): (Omit<Message, 'created'> & { created: Date })[] => {
    return messages.map(message => ({
        ...message,
        created: new Date(message.created)
    }))
}

/**
 * Memoized sorting of messages
 */
const sortedTypedMessagesSelector = createSelector([getMessages], (messages) => getTypedMessages(getSortedMessages(messages)));

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    actions: {
        requestMessages: (conversationId: string, beforeId?: string, amount = 30) => dispatch(ConversationStore.requestMessages({ conversationId, beforeId, amount })),
        enableLoadingMoreMessages: () => dispatch(ConversationStore.conversationUiActions.enableLoadingMoreMessages()),
        disableLoadingMoreMessages: () => dispatch(ConversationStore.conversationUiActions.disableLoadingMoreMessages())
    }
});

interface OwnProps {
    conversationId: string;
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps) => {
    return {
        messages: sortedTypedMessagesSelector(state, ownProps.conversationId),
        users: ConversationStore.selectUsersByConversationId(state, ownProps),
        me: {
            userId: state.identity.userId
        },
        ui: {
            canLoadMoreMessages: state.conversation ? state.conversation.ui.canLoadMoreMessages : false
        },
        conversationId: ownProps.conversationId
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(MessagesContainer as any);