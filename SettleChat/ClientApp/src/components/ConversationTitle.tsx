import { createSelector } from '@reduxjs/toolkit'
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import { conversationUsersByConversationIdSelector } from '../store/Conversation';
import { conversationByIdSelector } from '../store/conversationDetails';
import UserName from './UserName'

const ConversationTitle = (props: ReturnType<ReturnType<typeof makeMapStateToProps>>) => {
    const { title, userIdsSelector, conversationId } = props
    if (title) {
        return <>{title}</>
    }
    if (userIdsSelector.length > 0) {
        return <>
            {userIdsSelector.map(x => (<UserName key={x} conversationId={conversationId} userId={x} />))}
        </>
    }
    return <>Conversation</>
}

type OwnProps = {
    id: string
}

const makeUserIdsSelector = () => {
    return createSelector(
        [conversationUsersByConversationIdSelector],
        (conversationUsers) => conversationUsers.map(x => x.userId)
    )
}

// Inspired by: https://github.com/reduxjs/reselect#sharing-selectors-with-props-across-multiple-component-instances
const makeMapStateToProps = () => {
    const userIdsSelector = makeUserIdsSelector()
    const mapStateToProps = (state: ApplicationState, ownProps: OwnProps) => ({
        title: conversationByIdSelector(state, ownProps.id)?.title,
        userIdsSelector: userIdsSelector(state, { conversationId: ownProps.id }),
        conversationId: ownProps.id
    })
    return mapStateToProps
}

export default connect(
    makeMapStateToProps
)(ConversationTitle);