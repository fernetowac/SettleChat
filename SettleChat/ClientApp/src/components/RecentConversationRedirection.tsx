import * as React from 'react';
import { Redirect } from 'react-router-dom'
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import { AppDispatch } from '../'
import { sortedConversationsSelector } from '../store/Conversation';
import { requestMessagesForAllConversations } from '../store/messages'
import { useIsMounted } from '../hooks/useIsMounted';
import { requestConversationsWithUsers } from '../store/common';

type RecentConversationRedirectionProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>

const RecentConversationRedirection = (props: RecentConversationRedirectionProps) => {
    const { requestConversationsWithUsers, requestMessagesForAllConversations, conversations } = props;
    const [dataLoaded, setDataLoaded] = React.useState(false)
    const isMounted = useIsMounted();

    React.useEffect(() => {
        requestConversationsWithUsers()
            .then(() => requestMessagesForAllConversations(1))
            .then(() => {
                if (isMounted()) {
                    setDataLoaded(true)
                }
            });
    }, [requestConversationsWithUsers, requestMessagesForAllConversations]);

    if (!dataLoaded) {
        return 'Loading most recent conversation..';
    }

    if (conversations.length === 0) {
        return 'No conversation exist yet. [TODO]' //TODO: decide if we'll allow redirect to display MessagesPanel or to brand new welcome screen
    }

    return <Redirect to={`/conversation/${conversations[0].id}`} />
}

const mapStateToProps = (state: ApplicationState) => ({
    conversations: sortedConversationsSelector(state)
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    requestConversationsWithUsers: () => dispatch(requestConversationsWithUsers()),
    requestMessagesForAllConversations: (amountPerConversation: number) => dispatch(requestMessagesForAllConversations(amountPerConversation))
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(RecentConversationRedirection as any);