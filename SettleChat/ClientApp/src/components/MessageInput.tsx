import * as React from 'react';
import { connect } from 'react-redux';
import * as ConversationStore from "../store/Conversation";

type MessageInputProps = typeof ConversationStore.actionCreators & ConversationStore.Message;

function MessageInput(props: MessageInputProps) {
    console.log('data:' + JSON.stringify(props));
    const [inputMessage, setInputMessage] = React.useState('');
    console.log('inputMessage:' + JSON.stringify(inputMessage));

    const handleSubmit = (evt: React.SyntheticEvent<EventTarget>) => {
        evt.preventDefault();
        props.addMessage(inputMessage);
        setInputMessage('');
    };

    const inputMessageOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputMessage(e.target.value);
    }

    return (
        <React.Fragment>
            <form onSubmit={handleSubmit}>
                <label>
                    Message:
                    <input type="text" value={inputMessage} onChange={inputMessageOnChange} />
                </label>
                <input type="submit" value="Submit" />
            </form>
        </React.Fragment>
    );
}

export default connect(
    null,
    ConversationStore.actionCreators
)(MessageInput as any);