import { unwrapResult } from '@reduxjs/toolkit'
import * as React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import { Messages } from './Messages'
import { AppDispatch } from '../'
import { Message } from '../types/messageTypes'

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

    const getOldestMessage = (messages: Message[]): Message | undefined => {
        if (messages.length === 0) {
            return undefined;
        }
        let oldestMessage = messages[0];
        for (var i = 1; i < messages.length; i++) {
            if (oldestMessage.created > messages[i].created) {
                oldestMessage = messages[i];
            }
        }
        return oldestMessage;
    }

    const onLoadMoreClicked = () => {
        const oldestMessage = getOldestMessage(props.messages);
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

const messageCompareByCreatedAsc = (a: Message, b: Message): number => {
    if (a.created < b.created) {
        return -1;
    }
    else if (a.created > b.created) {
        return 1;
    }
    return 0;
}

const getMessages = (state: ApplicationState, conversationId: string): Message[] => (
    state.conversation === undefined ?
        undefined :
        state.conversation.messages
            .filter(message => message.conversationId === conversationId)
) || [];
const getSortedMessages = (messages: Message[]): Message[] => messages.sort(messageCompareByCreatedAsc);

/**
 * Memoized sorting of messages
 */
const sortedMessagesSelector = createSelector([getMessages], getSortedMessages);

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
        messages: sortedMessagesSelector(state, ownProps.conversationId),
        users: state.conversation && state.conversation.users ? state.conversation.users : [],
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