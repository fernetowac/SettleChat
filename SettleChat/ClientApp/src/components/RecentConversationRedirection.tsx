import * as React from 'react';
import { Redirect } from 'react-router-dom'
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ApplicationState } from '../store/index';
import { ConversationListItem, actionCreators as ConversationsActionCreators, actions as conversationsActions } from '../store/Conversations';
import { AppDispatch } from '../'
import { ReduxType } from '../types/commonTypes'
import { unwrapResult } from '@reduxjs/toolkit'

type RecentConversationRedirectionProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>

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

const conversationCompareByLastActivityDesc = (a: ReduxType<ConversationListItem>, b: ReduxType<ConversationListItem>): number => {
    if (a.lastActivityTimestamp < b.lastActivityTimestamp) {
        return 1;
    }
    else if (a.lastActivityTimestamp > b.lastActivityTimestamp) {
        return -1;
    }
    return 0;
}

const mostRecentConversationReducer = (previousValue: ReduxType<ConversationListItem>, currentValue: ReduxType<ConversationListItem>): ReduxType<ConversationListItem> =>
    conversationCompareByLastActivityDesc(previousValue, currentValue) > 0 ? currentValue : previousValue;

const getConversations = (state: ApplicationState) => state.conversations.conversations;
const getMostRecentConversation = (conversations: ReduxType<ConversationListItem>[]) =>
    conversations.length > 0 ?
        conversations.reduce(mostRecentConversationReducer) :
        undefined;

/**
 * Memoized sorting of conversations
 */
const mostRecentConversationSelector = createSelector([getConversations], getMostRecentConversation);

const mapStateToProps = (state: ApplicationState) => ({
    userId: state.identity.userId,
    isAuthenticated: !!state.identity.userId,
    conversation: mostRecentConversationSelector(state)
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    requestConversations: () => dispatch(ConversationsActionCreators.requestConversations()).then(unwrapResult),
    clearConversations: conversationsActions.clear
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(RecentConversationRedirection as any);