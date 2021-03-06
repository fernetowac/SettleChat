import { createSelector } from '@reduxjs/toolkit'
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import { allMessagesSelector } from '../store/Conversation';
import { getHighestBy } from '../helpers/sortHelper';
import UserName from './UserName'

const ConversationLastMessage = (props: ReturnType<ReturnType<typeof makeMapStateToProps>>) => {
    const { lastMessage, myIdentityUserId, conversationId } = props;

    if (!lastMessage) {
        return <>No messages yet</>;
    }

    if (lastMessage.userId === myIdentityUserId) {
        return <>
            you: {lastMessage.text}
        </>;
    }

    return <>
        <UserName conversationId={conversationId} userId={lastMessage.userId} />: {lastMessage.text}
    </>;
}

type OwnProps = {
    conversationId: string
}

// Inspired by: https://github.com/reduxjs/reselect#sharing-selectors-with-props-across-multiple-component-instances
const makeMapStateToProps = () => {
    // memoized selector per component
    const messagesOfConversationSelector = (state: ApplicationState, conversationId: string) =>
        allMessagesSelector(state).filter((message) => message.conversationId === conversationId)
    const lastMessageSelector = createSelector(messagesOfConversationSelector, getHighestBy((message) => message.created))

    const mapStateToProps = (state: ApplicationState, ownProps: OwnProps) => ({
        lastMessage: lastMessageSelector(state, ownProps.conversationId),
        conversationId: ownProps.conversationId,
        myIdentityUserId: state.identity.userId
    })
    return mapStateToProps
}

export default connect(makeMapStateToProps)(ConversationLastMessage);