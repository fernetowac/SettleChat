import * as React from 'react';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";

// At runtime, Redux will merge together...
type ConversationDetailProps =
    ConversationStore.ConversationDetail // ... state we've requested from the Redux store
    & typeof ConversationStore.actionCreators; // ... plus action creators we've requested

const ConversationDetail = (props: ConversationDetailProps) => {

    return <React.Fragment>
        <h1>Conversation {props.title}</h1>
        {props.isLoading &&
            <p>loading..</p>
        }
    </React.Fragment>;
}

export default connect(
    (state: ApplicationState): ConversationStore.ConversationDetail =>
        state === undefined || state.conversation === undefined || state.conversation.conversation === undefined ?
            {
                id: undefined,
                title: 'unknown',
                isLoading: false
            } as ConversationStore.ConversationDetail :
            state.conversation.conversation,
    ConversationStore.actionCreators
)(ConversationDetail as any);
