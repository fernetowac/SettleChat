import { createSelector } from '@reduxjs/toolkit'
import { connect } from 'react-redux'
import { conversationUserByIdsSelector } from '../store/conversationUsers'
import { ApplicationState } from '../store/index'
import { userByIdSelector } from '../store/users'

const UserName = (props: ReturnType<ReturnType<typeof makeMapStateToProps>>) => {
    const { nickname, username } = props
    return <>{nickname || username || 'someone'}</>
}

type OwnProps = {
    userId: string
    conversationId: string
}

const makeNicknameSelector = () => {
    return createSelector(
        [conversationUserByIdsSelector],
        (conversationUser) => conversationUser?.nickname
    )
}

// Inspired by: https://github.com/reduxjs/reselect#sharing-selectors-with-props-across-multiple-component-instances
const makeMapStateToProps = () => {
    const nicknameSelector = makeNicknameSelector()
    const mapStateToProps = (state: ApplicationState, ownProps: OwnProps) => ({
        nickname: nicknameSelector(state, ownProps),
        username: userByIdSelector(state, ownProps.userId)?.userName,
    })
    return mapStateToProps
}

export default connect(makeMapStateToProps)(UserName)
