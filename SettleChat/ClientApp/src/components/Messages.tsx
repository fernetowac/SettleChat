import * as React from 'react';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";

export interface MessagesState {
    messages: ConversationStore.Message[];
    users: ConversationStore.User[];
}

// At runtime, Redux will merge together...
type MessagesProps =
    MessagesState // ... state we've requested from the Redux store
    & typeof ConversationStore.actionCreators; // ... plus action creators we've requested
//& RouteComponentProps<{ startDateIndex: string }>; // ... plus incoming routing parameters

const Messages = (props: MessagesProps) => {
    const userNameById = new Map<string, string>();
    props.users.forEach((user) => {
        userNameById.set(user.id, user.userName);
    });

    return <React.Fragment>
        <h1>Messages ({props.messages.length})</h1>
        <ul>{
            (props.messages as ConversationStore.Message[]).map(item =>
                <li key={item.id}>({userNameById.get(item.userId)}: {item.text})</li>
            )
        }
        </ul>
    </React.Fragment>;
}

export default connect(
    (state: ApplicationState): MessagesState => {
        return {
            messages: ((state.conversation === undefined ? undefined : state.conversation.messages) || []),
            users: state.conversation && state.conversation.users ? state.conversation.users : [],
        } as MessagesState;
    },
    ConversationStore.actionCreators
)(Messages as any);
