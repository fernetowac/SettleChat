import * as React from 'react';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";

type ConversationDetailsState = {
    conversation: ConversationStore.ConversationDetail | null,
    isLoading: boolean,
};
type ConversationDetailProps =
    ConversationDetailsState & {
        actions: typeof ConversationStore.actionCreators
    };

const ConversationDetail = (props: ConversationDetailProps) => {
    return <React.Fragment>
        <h1>Conversation {props.conversation && props.conversation.title}</h1>
        {props.isLoading &&
            <p>loading..</p>
        }
    </React.Fragment>;
}

const mapStateToProps = (state: ApplicationState): ConversationDetailsState => {
    if (!state || !state.conversation) {
        return {
            conversation: null,
            isLoading: false
        };
    }
    return {
        conversation: state && state.conversation ? state.conversation.conversation : null,
        isLoading: state && state.conversation.ui.isConversationLoading
    }
};

export default connect(
    mapStateToProps
)(ConversationDetail as any);
