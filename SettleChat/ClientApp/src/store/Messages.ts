import { Reducer, Action } from 'redux';
import { AppThunkAction } from './index';

export interface MessagesState {
    messages: Message[];
    inputMessage: Message;
}

export interface Message {
    id: string;
    text: string;
    userFrom: string;
}

export interface AddAction {
    type: 'MESSAGE_ADD';
    newMessage: Message;
}

export interface AddedAction {
    type: 'MESSAGE_ADDED';
}

export interface ReceiveListAction {
    type: 'MESSAGE_RECEIVE_LIST';
    messages: Message[];
}

export interface RequestListAction {
    type: 'MESSAGE_REQUEST_LIST';
}

type KnownAction = MessageAddPipelineAction | ReceiveListAction | RequestListAction
type MessageAddPipelineAction = AddAction | AddedAction

//export const actionCreators = {
//    add: () => ({ type: 'MESSAGES_ADD' } as AddAction)
//}

export const actionCreators = {
    requestMessages: (): AppThunkAction<KnownAction> => (dispatch, getState) => {
        console.log('MessagesStore.actionCreators.requestMessages called')
        // Only load data if it's something we don't already have (and are not already loading)
        const appState = getState();
        if (appState && appState.messages) {
            fetch(`message`, { cache: "no-cache" })
                .then(response => response.json() as Promise<Message[]>)
                .then(data => {
                    dispatch({ type: 'MESSAGE_RECEIVE_LIST', messages: data });
                });

            dispatch({ type: 'MESSAGE_REQUEST_LIST' });
        }
    },
    addMessage: (messageInput: Message): AppThunkAction<MessageAddPipelineAction> => (dispatch, getState) => {
        console.log('MessagesStore.actionCreators.addMessage called');
        console.log('messageInput1:' + JSON.stringify(messageInput));
        const appState = getState();
        if (appState && appState.messages) {
            fetch('message', { method: 'POST', body: JSON.stringify(messageInput) })
                .then(data => { console.log(data); })
                .then(data => {
                    dispatch({ type: 'MESSAGE_ADDED' })
                })
            console.log('messageInput2:' + JSON.stringify(messageInput));
            dispatch({ type: 'MESSAGE_ADD', newMessage: messageInput });
        }
    }
};

export const reducer: Reducer<MessagesState> = (state: MessagesState | undefined, incomingAction: Action): MessagesState => {
    if (!state) {
        state = {
            messages: [], inputMessage: <Message>{}
        }
    }

    const action = incomingAction as KnownAction;

    switch (action.type) {
        case 'MESSAGE_ADD':
            return {
                messages: [
                    ...state.messages,
                    {
                        ...action.newMessage
                    }],
                inputMessage: { ...action.newMessage }
            };
        case 'MESSAGE_ADDED':
            return {
                messages: [...state.messages],
                inputMessage: <Message>{}
            };
        case 'MESSAGE_RECEIVE_LIST':
            return {
                messages: [...action.messages],
                inputMessage: {
                    ...state.inputMessage
                }
            };
        case 'MESSAGE_REQUEST_LIST':
            return {
                messages: [...state.messages],
                inputMessage: {
                    ...state.inputMessage
                }
            };
        default:
            return state;
    };
}