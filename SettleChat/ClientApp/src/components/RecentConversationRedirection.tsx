import * as React from 'react';
import { Redirect } from 'react-router-dom'
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import { ConversationListItem, actionCreators as ConversationsActionCreators, ReceiveListAction, RequestListAction } from '../store/Conversations';

type RecentConversationRedirectionComponentState = { conversation?: ConversationListItem, userId: string | null, isAuthenticated: boolean };
type RecentConversationRedirectionProps = RecentConversationRedirectionComponentState & MapDispatchToPropsType;

const RecentConversationRedirection = (props: RecentConversationRedirectionProps) => {
    const { requestConversations, clearConversations, userId, isAuthenticated, conversation } = props;
    React.useEffect(() => {
        if (!isAuthenticated) {
            clearConversations();
        } else {
            requestConversations();
        }
        return () => {
            clearConversations();
        }
    }, [requestConversations, clearConversations, userId, isAuthenticated]);

    if (!conversation) {
        return 'Loading most recent conversation..';
    }

    return <Redirect to={`/conversation/${conversation.id}`} />
}

const conversationCompareByLastActivityDesc = (a: ConversationListItem, b: ConversationListItem): number => {
    if (a.lastActivityTimestamp < b.lastActivityTimestamp) {
        return 1;
    }
    else if (a.lastActivityTimestamp > b.lastActivityTimestamp) {
        return -1;
    }
    return 0;
}

const mostRecentConversationReducer = (previousValue: ConversationListItem, currentValue: ConversationListItem): ConversationListItem => conversationCompareByLastActivityDesc(previousValue, currentValue) > 0 ? currentValue : previousValue;

const getConversations = (state: ApplicationState): ConversationListItem[] => state.conversations.conversations;
const getMostRecentConversation = (conversations: ConversationListItem[]): ConversationListItem | undefined =>
    conversations.length > 0 ?
        conversations.reduce(mostRecentConversationReducer) :
        undefined;

/**
 * Memoized sorting of conversations
 */
const mostRecentConversationSelector = createSelector([getConversations], getMostRecentConversation);


type MapDispatchToPropsType = {
    requestConversations: () => Promise<ConversationListItem[]>;
    clearConversations: () => void;
};

const mapStateToProps = (state: ApplicationState): RecentConversationRedirectionComponentState => ({
    userId: state.identity.userId,
    isAuthenticated: !!state.identity.userId,
    conversation: mostRecentConversationSelector(state)
});

const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ReceiveListAction | RequestListAction>): MapDispatchToPropsType => ({
    requestConversations: () => (dispatch as ThunkDispatch<ApplicationState, undefined, ReceiveListAction | RequestListAction>)(ConversationsActionCreators.requestConversations()),
    clearConversations: ConversationsActionCreators.clearConversations
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(RecentConversationRedirection as any);
