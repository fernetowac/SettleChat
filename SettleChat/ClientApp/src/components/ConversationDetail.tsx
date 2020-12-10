import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import { Switch, FormControl, FormLabel, FormGroup, FormControlLabel, FormHelperText } from '@material-ui/core';

type ConversationDetailsState = {
    conversation: ConversationStore.ConversationDetail | null,
    isLoading: boolean,
};
type ConversationDetailProps = ConversationDetailsState & MapDispatchToPropsType;

const ConversationDetail = (props: ConversationDetailProps) => {
    const [isPublicDisabled, setIsPublicDisabled] = React.useState(false);

    const handleIsPublicChange = (event: React.ChangeEvent<{}>, checked: boolean): void => {
        if (!props.conversation) {
            return;
        }
        setIsPublicDisabled(true);
        props.actions.patchConversation(props.conversation.id, { isPublic: checked })
            .finally(() => setIsPublicDisabled(false));
    }

    if (props.isLoading) {
        return <p>loading..</p>;
    }
    else if (!props.conversation) {
        return <p>No conversation details loaded..</p>;
    } else {
        return <React.Fragment>
            <h1>Conversation {props.conversation.title}</h1>
            <FormControl component="fieldset">
                <FormLabel component="legend">Conversation details</FormLabel>
                <FormGroup>
                    <FormControlLabel
                        control={<Switch checked={props.conversation.isPublic} onChange={handleIsPublicChange} disabled={isPublicDisabled} name="isPublic" />}
                        label="Public (anyone can join)" />
                </FormGroup>
                <FormHelperText>Changes are saved immediately</FormHelperText>
            </FormControl>
        </React.Fragment>;
    }
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

type MapDispatchToPropsType = {
    actions: {
        patchConversation: (conversationId: string, updatedProperties: ConversationStore.ConversationPatch) => Promise<ConversationStore.ConversationDetail>;
    }
};
const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationStore.KnownAction>): MapDispatchToPropsType => ({
    actions: {
        patchConversation: (conversationId: string, updatedProperties: ConversationStore.ConversationPatch) => dispatch(ConversationStore.actionCreators.patchConversation(conversationId, updatedProperties))
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ConversationDetail as any);
