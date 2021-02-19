import * as React from 'react';
import { connect } from 'react-redux';
import * as ConversationsStore from '../store/Conversations';
import { AppDispatch } from '../index'

const initialState = {
    title: '',
    creator: {
        name: '',
        email: ''
    }
} as ConversationsStore.NewConversation;

function NewConversation(props: ReturnType<typeof mapDispatchToProps>) {
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

    return <form onSubmit={handleSubmit}>
        <div>
            <label>
                Email:</label>
            <input type="text" value={inputConversation.creator.email} onChange={inputConversationCreatorEmailOnChange} />
        </div>
        <div>
            <input type="submit" value="Submit" />
        </div>
    </form>
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    addConversation: (conversationInput: ConversationsStore.NewConversation) => dispatch(ConversationsStore.actionCreators.addConversation(conversationInput))
});

export default connect(
    null,
    mapDispatchToProps
)(NewConversation as any);