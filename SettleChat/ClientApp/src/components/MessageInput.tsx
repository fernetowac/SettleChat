import * as React from 'react';
import { connect } from 'react-redux';
import * as ConversationStore from "../store/Conversation";
import { usePrevious } from '../hooks/usePrevious';
import { TextField } from '@material-ui/core';
import { AppDispatch } from '../'

const writingActivityNotificationThresholdMiliseconds = 10 * 1000;

type TypedWritingActivityData = { activity: ConversationStore.WritingActivity, lastChange: Date }

function MessageInput(props: ReturnType<typeof mapDispatchToProps>) {
    const [inputMessage, setInputMessage] = React.useState('');
    const previousInputMessage = usePrevious(inputMessage);
    const [writingActivity, setWritingActivity] = React.useState<TypedWritingActivityData>({ activity: ConversationStore.WritingActivity.StoppedWriting, lastChange: new Date() });
    const [timer, setTimer] = React.useState<ReturnType<typeof setTimeout>>();

    const handleSubmit = (evt: React.SyntheticEvent<EventTarget>) => {
        evt.preventDefault();
        props.actions.addMessage(inputMessage);
        setInputMessage('');
    };

    const inputMessageOnKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.keyCode === 13 && !e.shiftKey) {
            handleSubmit(e);
        }
        if (e.keyCode === 9) {
            e.preventDefault();
            setInputMessage(inputMessage + '\t');
        }
    }

    const inputMessageOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputMessage(e.target.value);
    }

    React.useEffect(() => {
        // handle writing activity (notify others when started writing, when message's been emptied or when not writing for longer time)
        if (previousInputMessage !== undefined) {
            if (inputMessage === '') {
                // set and send stopped writing activity
                const newWritingActivity: TypedWritingActivityData = { activity: ConversationStore.WritingActivity.StoppedWriting, lastChange: new Date() };
                setWritingActivity(newWritingActivity);
                props.actions.updateWritingActivity({ activity: newWritingActivity.activity });
            } else {
                // set isWriting writing activity
                const previousWritingActivity = writingActivity;
                const newWritingActivity: TypedWritingActivityData = { activity: ConversationStore.WritingActivity.IsWriting, lastChange: new Date() };
                setWritingActivity(newWritingActivity);
                // and send it if time threshold reached
                if (previousWritingActivity.activity != ConversationStore.WritingActivity.IsWriting || new Date().getTime() - previousWritingActivity.lastChange.getTime() > writingActivityNotificationThresholdMiliseconds) {
                    props.actions.updateWritingActivity({ activity: newWritingActivity.activity });
                }
                // and plan setting and sending stopped writing activity after some time
                setTimer(setTimeout(() => {
                    const newWritingActivity: TypedWritingActivityData = { activity: ConversationStore.WritingActivity.StoppedWriting, lastChange: new Date() };
                    setWritingActivity(newWritingActivity);
                    props.actions.updateWritingActivity({ activity: newWritingActivity.activity });
                }, writingActivityNotificationThresholdMiliseconds));
            }
        }
        return () => {
            if (timer) {
                window.clearTimeout(timer);
            }
        };
    }, [inputMessage]);

    return (
        <React.Fragment>
            <form onSubmit={handleSubmit}>
                <div>writing activity: {writingActivity.activity}</div>
                <TextField type="text" value={inputMessage} onKeyDown={inputMessageOnKeyDown} onChange={inputMessageOnChange} multiline rowsMax={5} label="New message" variant="outlined" fullWidth />
            </form>
        </React.Fragment>
    );
}

interface OwnProps {
    conversationId: string;
}

const mapDispatchToProps = (dispatch: AppDispatch, ownProps: OwnProps) => ({
    actions: {
        updateWritingActivity: (writingActivity: ConversationStore.WritingActivityData) => dispatch(ConversationStore.actionCreators.updateWritingActivity({ conversationId: ownProps.conversationId, writingActivity })),
        addMessage: (text: string) => dispatch(ConversationStore.actionCreators.addMessage({ text, conversationId: ownProps.conversationId }))
    }
});

export default connect(
    undefined,
    mapDispatchToProps
)(MessageInput as any);