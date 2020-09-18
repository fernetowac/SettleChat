import React from 'react';
import { connect } from 'react-redux';
import AddUser from './AddUser';
import Users from './Users';
import { ApplicationState } from '../store/index';

const UsersPanel = () => {
    return <React.Fragment>
        <AddUser />
        <Users />
    </React.Fragment>;
}

export default connect(
    (state: ApplicationState) => {
        return { conversationId: state.conversation && state.conversation.conversation ? state.conversation.conversation.id : undefined }
    }
)(UsersPanel as any);