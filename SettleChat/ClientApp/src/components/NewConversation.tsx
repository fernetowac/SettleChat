import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import * as ConversationsStore from '../store/Conversations';
import { ApplicationState } from '../store/index';

const initialState = {
    title: '',
    creator: {
        name: '',
        email: ''
    }
} as ConversationsStore.NewConversation;

function NewConversation(props: MapDispatchToPropsType) {
    const [inputConversation, setInputConversation] = React.useState(initialState);

    const handleSubmit = (evt: React.SyntheticEvent<EventTarget>) => {
        evt.preventDefault();
        props.addConversation(inputConversation);
        setInputConversation({ title: '', creator: { name: '', email: '' } } as ConversationsStore.NewConversation);
    };

    const inputConversationCreatorEmailOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputConversation({ ...inputConversation, creator: { ...inputConversation.creator, email: e.target.value } });
    }

    return (
        <React.Fragment>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        Email:</label>
                    <input type="text" value={inputConversation.creator.email} onChange={inputConversationCreatorEmailOnChange} />
                </div>
                <div>
                    <input type="submit" value="Submit" />
                </div>
            </form>
        </React.Fragment>
    );
}

type MapDispatchToPropsType = {
    addConversation: (conversationInput: ConversationsStore.NewConversation) => Promise<ConversationsStore.ConversationListItem>;
};

const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationsStore.ConversationAddPipelineAction>): MapDispatchToPropsType => ({
    addConversation: (conversationInput: ConversationsStore.NewConversation): Promise<ConversationsStore.ConversationListItem> => (dispatch as ThunkDispatch<ApplicationState, undefined, ConversationsStore.ConversationAddPipelineAction>)(ConversationsStore.actionCreators.addConversation(conversationInput))
});


export default connect(
    null,
    mapDispatchToProps
)(NewConversation as any);