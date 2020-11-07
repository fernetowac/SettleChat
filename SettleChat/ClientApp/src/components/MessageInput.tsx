﻿import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import * as ConversationStore from "../store/Conversation";
import { ApplicationState } from '../store/index';
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions';
import { usePrevious } from '../hooks/usePrevious';
import Button from '@material-ui/core/Button';
import { Send } from '@material-ui/icons';

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

    const handleWritingActivity = (inputValue: string): void => {
        if (timer) {
            window.clearTimeout(timer);
        }
        if (inputValue === '') {
            const newWritingActivity = { activity: ConversationStore.WritingActivity.StoppedWriting, lastChange: new Date() } as ConversationStore.WritingActivityData;
            setWritingActivity(newWritingActivity);
            props.actions.updateWritingActivity(newWritingActivity);
        } else {
            const previousWritingActivity = writingActivity;
            const newWritingActivity = { activity: ConversationStore.WritingActivity.IsWriting, lastChange: new Date() } as ConversationStore.WritingActivityData;
            setWritingActivity(newWritingActivity);
            if (previousWritingActivity.activity != ConversationStore.WritingActivity.IsWriting || new Date().getTime() - previousWritingActivity.lastChange.getTime() > writingActivityNotificationThresholdMiliseconds) {
                props.actions.updateWritingActivity(newWritingActivity);
            }
            setTimer(setTimeout(() => {
                const newWritingActivity = { activity: ConversationStore.WritingActivity.StoppedWriting, lastChange: new Date() } as ConversationStore.WritingActivityData;
                setWritingActivity(newWritingActivity);
                props.actions.updateWritingActivity(newWritingActivity);
            }, writingActivityNotificationThresholdMiliseconds));
        }
    }

    const inputMessageOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputMessage(e.target.value);
    }

    React.useEffect(() => {
        if (previousInputMessage !== undefined) {
            handleWritingActivity(inputMessage);
        }
    }, [inputMessage]);

    return (
        <React.Fragment>
            <form onSubmit={handleSubmit}>
                <div>writing activity: {writingActivity.activity}</div>
                <label>
                    Message:
                    <input type="text" value={inputMessage} onChange={inputMessageOnChange} />
                </label>
                <Button type="submit" variant="contained" color="primary" size="small" startIcon={<Send />}>
                    Send
                </Button>
            </form>
        </React.Fragment>
    );
}

type MapDispatchToPropsType = {
    actions: {
        updateWritingActivity: (writingActivity: ConversationStore.WritingActivityData) => Promise<void>;
        addMessage: (text: string) => Promise<ConversationStore.MessageCreateResponse>;
    }
};

const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationStore.ConversationSendWritingActivity | HttpFailStatusReceivedAction>): MapDispatchToPropsType => ({
    actions: {
        updateWritingActivity: (writingActivity: ConversationStore.WritingActivityData): Promise<void> =>
            (dispatch as ThunkDispatch<ApplicationState, undefined, HttpFailStatusReceivedAction>)(
                ConversationStore.actionCreators.updateWritingActivity(writingActivity)),
        addMessage: (text: string): Promise<ConversationStore.MessageCreateResponse> =>
            (dispatch as ThunkDispatch<ApplicationState, undefined, ConversationStore.ConversationSendWritingActivity>)(
                ConversationStore.actionCreators.addMessage(text))
    }
});

export default connect(
    undefined,
    mapDispatchToProps
)(MessageInput as any);