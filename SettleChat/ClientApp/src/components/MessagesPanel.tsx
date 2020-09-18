import React from 'react';
import Messages from "./Messages"
import MessageInput from "./MessageInput";
import { RouteComponentProps } from 'react-router';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as ConversationStore from "../store/Conversation";
import ConversationDetail from './ConversationDetail';
import UsersPanel from './UsersPanel';

// At runtime, Redux will merge together...
type ConversationProps =
    ConversationStore.ConversationState // ... state we've requested from the Redux store
    & typeof ConversationStore.actionCreators // ... plus action creators we've requested
    & RouteComponentProps<{ conversationId: string }>; // ... plus incoming routing parameters

const MessagesPanel = (props: ConversationProps) => {
    const { requestConversation } = props;
    const { conversationId } = props.match.params;

    React.useEffect(() => {
        requestConversation(conversationId);
    }, [requestConversation, conversationId]);

    return <React.Fragment>
        <ConversationDetail />
        <UsersPanel />
        <Messages />
        <MessageInput />
    </React.Fragment>;
}

export default connect(
    (state: ApplicationState) => state.conversation, // Selects which state properties are merged into the component's props
    ConversationStore.actionCreators // Selects which action creators are merged into the component's props
)(MessagesPanel as any);