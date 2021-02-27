import * as React from 'react';
import { Redirect } from 'react-router-dom'
import { connect } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { ApplicationState } from '../store/index';
import { actionCreators as ConversationsActionCreators, actions as conversationsActions } from '../store/Conversations';
import { AppDispatch } from '../'
import { unwrapResult } from '@reduxjs/toolkit'
import { getHighestBy } from '../helpers/sortHelper'

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

/**
 * Memoized sorting of conversations
 */
const mostRecentConversationSelector = createSelector([(state: ApplicationState) => state.conversations.conversations], getHighestBy((x) => x.lastActivityTimestamp));

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