import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import * as ConversationStore from "../store/Conversation";
import { ApplicationState } from '../store/index';
import { HttpFailStatusReceivedAction } from '../actions/HttpStatusActions';
import { usePrevious } from '../hooks/usePrevious';

type MessageInputPropsStateType = {
    userNamesCurrentlyWriting: string[]
}
type MessageInputProps = MessageInputPropsStateType & MapDispatchToPropsType & ConversationStore.Message;
const writingActivityNotificationThresholdMiliseconds = 10 * 1000;

function MessageInput(props: MessageInputProps) {
    const [inputMessage, setInputMessage] = React.useState('');
    const previousInputMessage = usePrevious(inputMessage);
    const [writingActivity, setWritingActivity] = React.useState({ activity: ConversationStore.WritingActivity.StoppedWriting, lastChange: new Date() } as ConversationStore.WritingActivityData);
    const [timer, setTimer] = React.useState<ReturnType<typeof setTimeout>>();

    const handleSubmit = (evt: React.SyntheticEvent<EventTarget>) => {
        evt.preventDefault();
        props.actions.addMessage(inputMessage);
        setInputMessage('');
    };
    //TODO: if writing, post writing activity regularly to server (to notify people who opened conversation after my start of writing)
    //TODO: display only when writing activity of other people is new enough (to prevent being stuck in "John is writing.." status when there are connection problems on my side or other people's side)
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

    const renderUsersCurrentlyWriting = (userNamesCurrentlyWriting: string[]) => {
        switch (userNamesCurrentlyWriting.length) {
            case 0:
                return '';
            case 1:
                return `${userNamesCurrentlyWriting[0]} is writing..`;
            default:
                return `${userNamesCurrentlyWriting.join(', ')} are writing..`;
        }
    }

    return (
        <React.Fragment>
            <form onSubmit={handleSubmit}>
                <div>writing activity: {writingActivity.activity}</div>
                <div>{renderUsersCurrentlyWriting(props.userNamesCurrentlyWriting)}</div>
                <label>
                    Message:
                    <input type="text" value={inputMessage} onChange={inputMessageOnChange} />
                </label>
                <input type="submit" value="Submit" />
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

// Selects which state properties are merged into the component's props
const mapStateToProps = (state: ApplicationState): MessageInputPropsStateType => {
    if (!state.identity) {
        throw new Error('Identity not initialized');
    }
    if (!state.identity.userId) {
        throw new Error('UserId not initialized');
    }
    if (!state.conversation) {
        throw new Error('Conversation not initialized');
    }
    const getUserById = (
        (conversationUsers: ConversationStore.User[]) =>
            (userId: string) => conversationUsers.find(user => user.id === userId)
    )
        (state.conversation.users);
    return {
        userNamesCurrentlyWriting: state.conversation.writingActivities
            .filter(writingActivity => writingActivity.userId !== state.identity.userId && writingActivity.activity === ConversationStore.WritingActivity.IsWriting)
            .map(
                writingActivity => {
                    const writingActivityUser =
                        getUserById(writingActivity.userId);
                    return writingActivityUser ? writingActivityUser.userName : '';
                })
    };
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
    mapStateToProps,
    mapDispatchToProps
)(MessageInput as any);