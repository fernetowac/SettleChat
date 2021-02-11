import * as React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import { Messages } from './Messages'

export interface MessagesContainerState {
    messages: ConversationStore.Message[];
    users: ConversationStore.ConversationUser[];
    me: {
        userId: string
    };
    ui: {
        canLoadMoreMessages: boolean
    };
    conversationId: string;
}

type MessagesContainerProps =
    MessagesContainerState
    & MapDispatchToPropsType & { isLoading: boolean, loadMoreButtonEnabled: boolean, onLoadMoreClicked: () => void };

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

    const getOldestMessage = (messages: ConversationStore.Message[]): ConversationStore.Message | undefined => {
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

const messageCompareByCreatedAsc = (a: ConversationStore.Message, b: ConversationStore.Message): number => {
    if (a.created < b.created) {
        return -1;
    }
    else if (a.created > b.created) {
        return 1;
    }
    return 0;
}

const getMessages = (state: ApplicationState, conversationId: string): ConversationStore.Message[] => (
    state.conversation === undefined ?
        undefined :
        state.conversation.messages
            .filter(message => message.conversationId === conversationId)
) || [];
const getSortedMessages = (messages: ConversationStore.Message[]): ConversationStore.Message[] => messages.sort(messageCompareByCreatedAsc);

/**
 * Memoized sorting of messages
 */
const sortedMessagesSelector = createSelector([getMessages], getSortedMessages);

type MapDispatchToPropsType = {
    actions: {
        requestMessages: (conversationId: string, beforeId?: string, amount?: number) => Promise<ConversationStore.Message[]>;
        enableLoadingMoreMessages: () => void;
        disableLoadingMoreMessages: () => void;
    }
};
const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationStore.KnownAction>): MapDispatchToPropsType => ({
    actions: {
        requestMessages: (conversationId: string, beforeId?: string, amount = 30) => dispatch(ConversationStore.actionCreators.requestMessages(conversationId, beforeId, amount)),
        enableLoadingMoreMessages: () => dispatch(ConversationStore.actionCreators.enableLoadingMoreMessages()),
        disableLoadingMoreMessages: () => dispatch(ConversationStore.actionCreators.disableLoadingMoreMessages())
    }
});

interface OwnProps {
    conversationId: string;
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps): MessagesContainerState => {
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
    } as MessagesContainerState;
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(MessagesContainer as any);