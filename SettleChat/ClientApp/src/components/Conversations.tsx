import * as React from 'react'
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import { Conversation, ConversationsState, actionCreators as ConversationsActionCreators } from '../store/Conversations';

type ConversationProps = ConversationsState & typeof ConversationsActionCreators;

const Conversations = (props: ConversationProps) => {
    const { requestConversations } = props;
    React.useEffect(() => {
        requestConversations();
    }, [requestConversations]);

    return <React.Fragment>
        <h1>Conversations ({props.conversations.length})</h1>
        <ul>{
            (props.conversations as Conversation[]).map(conversation =>
                <li key={conversation.id}>
                    <Link to={"/conversation/" + conversation.id}>{conversation.title}</Link>
                </li>
            )
        }
        </ul>
    </React.Fragment>;
}

export default connect(
    (state: ApplicationState): ConversationsState => state.conversations,
    ConversationsActionCreators
)(Conversations as any);
