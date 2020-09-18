import * as React from 'react';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from '../store/Conversation';
import { User, UserStatus } from '../store/Conversation';

export interface UsersState {
    conversationId: string,
    users: ConversationStore.User[];
}

// At runtime, Redux will merge together...
type UsersProps =
    UsersState // ... state we've requested from the Redux store
    & typeof ConversationStore.actionCreators; // ... plus action creators we've requested
//& RouteComponentProps<{ startDateIndex: string }>; // ... plus incoming routing parameters

function WriteStatus(status: UserStatus): string {
    switch (status) {
        case ConversationStore.UserStatus.Offline:
            return '[offline]';
        case UserStatus.Online:
            return '[online]';
        case UserStatus.Inactive:
            return '[inactive]';
        default:
            throw new Error('Undefined status:' + status);
    }
}

const Users = (props: UsersProps) => {
    const { conversationId, requestUsers } = props;
    React.useEffect(() => {
        if (conversationId) {
            requestUsers();
        }
    }, [conversationId, requestUsers]);

    return <React.Fragment>
        <h1>Users ({props.users.length})</h1>
        <ul>{
            (props.users as User[]).map(item =>
                <li key={item.id}>({item.userName}: {WriteStatus(item.status)})</li>
            )
        }
        </ul>
    </React.Fragment>;
}

export default connect(
    (state: ApplicationState): UsersState => {
        return {
            conversationId: state.conversation === undefined ? undefined : state.conversation.conversation.id,
            users: ((state.conversation === undefined ? undefined : state.conversation.users) || [])
        } as UsersState;
    },
    ConversationStore.actionCreators
)(Users as any);
