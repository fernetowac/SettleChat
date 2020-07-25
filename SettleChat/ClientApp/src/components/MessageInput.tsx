import * as React from 'react';
import { connect } from 'react-redux';
import * as MessagesStore from '../store/Messages';
import Messages from './Messages';
import { ApplicationState } from '../store/index';

type MessageInputProps = typeof MessagesStore.actionCreators & MessagesStore.Message;

function MessageInput(data: MessageInputProps) {
    console.log('data:' + JSON.stringify(data))
    const [inputMessage, setInputMessage] = React.useState({ id: '', text: 'fero test init useState', userFrom: '' });
    console.log('inputMessage:' + JSON.stringify(inputMessage))

    const handleSubmit = (evt: React.SyntheticEvent<EventTarget>) => {
        evt.preventDefault();
        data.addMessage(inputMessage);
        setInputMessage({ id: '', text: '', userFrom: '' })
    };

    const inputMessageOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputMessage({ id: '1000', text: e.target.value, userFrom: 'Johny' });
    }

    return (
        <React.Fragment>
            <form onSubmit={handleSubmit}>
                <label>
                    Message:
                    <input type="text" value={inputMessage.text} onChange={inputMessageOnChange} />
                </label>
                <input type="submit" value="Submit" />
            </form>
        </React.Fragment>
    );
}

export default connect(
    (state: ApplicationState) => {
        console.log("MessageInput.tsx connect state:" + JSON.stringify(state))
        return state.messages && state.messages.inputMessage ? state.messages.inputMessage : { id: '2000', text: 'dummy message input', userFrom: 'dummy user' } as MessagesStore.Message
    },
    MessagesStore.actionCreators
)(MessageInput as any);