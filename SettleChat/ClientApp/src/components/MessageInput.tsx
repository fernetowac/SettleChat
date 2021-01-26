import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import * as ConversationStore from "../store/Conversation";
import { ApplicationState } from '../store/index';
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions';
import { usePrevious } from '../hooks/usePrevious';
import { TextField } from '@material-ui/core';

const writingActivityNotificationThresholdMiliseconds = 10 * 1000;

function MessageInput(props: MapDispatchToPropsType) {
    const [inputMessage, setInputMessage] = React.useState('');
    const previousInputMessage = usePrevious(inputMessage);
    const [writingActivity, setWritingActivity] = React.useState({ activity: ConversationStore.WritingActivity.StoppedWriting, lastChange: new Date() } as ConversationStore.WritingActivityData);
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
                const newWritingActivity = { activity: ConversationStore.WritingActivity.StoppedWriting, lastChange: new Date() } as ConversationStore.WritingActivityData;
                setWritingActivity(newWritingActivity);
                props.actions.updateWritingActivity(newWritingActivity);
            } else {
                // set isWriting writing activity
                const previousWritingActivity = writingActivity;
                const newWritingActivity = { activity: ConversationStore.WritingActivity.IsWriting, lastChange: new Date() } as ConversationStore.WritingActivityData;
                setWritingActivity(newWritingActivity);
                // and send it if time threshold reached
                if (previousWritingActivity.activity != ConversationStore.WritingActivity.IsWriting || new Date().getTime() - previousWritingActivity.lastChange.getTime() > writingActivityNotificationThresholdMiliseconds) {
                    props.actions.updateWritingActivity(newWritingActivity);
                }
                // and plan setting and sending stopped writing activity after some time
                setTimer(setTimeout(() => {
                    const newWritingActivity = { activity: ConversationStore.WritingActivity.StoppedWriting, lastChange: new Date() } as ConversationStore.WritingActivityData;
                    setWritingActivity(newWritingActivity);
                    props.actions.updateWritingActivity(newWritingActivity);
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

type MapDispatchToPropsType = {
    actions: {
        updateWritingActivity: (writingActivity: ConversationStore.WritingActivityData) => Promise<void>;
        addMessage: (text: string) => Promise<ConversationStore.Message>;
    }
};

const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationStore.ConversationSendWritingActivity | HttpFailStatusReceivedAction>, ownProps: OwnProps): MapDispatchToPropsType => ({
    actions: {
        updateWritingActivity: (writingActivity: ConversationStore.WritingActivityData): Promise<void> =>
            (dispatch as ThunkDispatch<ApplicationState, undefined, HttpFailStatusReceivedAction>)(
                ConversationStore.actionCreators.updateWritingActivity(writingActivity)),
        addMessage: (text: string): Promise<ConversationStore.Message> =>
            (dispatch as ThunkDispatch<ApplicationState, undefined, ConversationStore.ConversationSendWritingActivity>)(
                ConversationStore.actionCreators.addMessage(text, ownProps.conversationId))
    }
});

export default connect(
    undefined,
    mapDispatchToProps
)(MessageInput as any);