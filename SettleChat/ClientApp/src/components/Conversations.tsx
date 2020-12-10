import * as React from 'react'
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import { Conversation, ConversationsState, actionCreators as ConversationsActionCreators, ReceiveListAction, RequestListAction } from '../store/Conversations';

type ConversationsComponentState = ConversationsState & { userId: string | null, isAuthenticated: boolean };
type ConversationProps = ConversationsComponentState & MapDispatchToPropsType;

const Conversations = (props: ConversationProps) => {
    const { requestConversations, clearConversations, userId, isAuthenticated } = props;
    React.useEffect(() => {
        if (!isAuthenticated) {
            clearConversations();
        } else {
            requestConversations();
        }
    }, [requestConversations, clearConversations, userId, isAuthenticated]);

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

type MapDispatchToPropsType = {
    requestConversations: () => Promise<Conversation[]>;
    clearConversations: () => void;
};

const mapStateToProps = (state: ApplicationState): ConversationsComponentState => ({
    userId: state.identity.userId,
    isAuthenticated: !!state.identity.userId,
    conversations: state.conversations.conversations
});

const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ReceiveListAction | RequestListAction>): MapDispatchToPropsType => ({
    requestConversations: () => (dispatch as ThunkDispatch<ApplicationState, undefined, ReceiveListAction | RequestListAction>)(ConversationsActionCreators.requestConversations()),
    clearConversations: ConversationsActionCreators.clearConversations
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Conversations as any);
