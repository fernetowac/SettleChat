import * as WeatherForecasts from './WeatherForecasts';
import * as Counter from './Counter';
import * as Conversations from './Conversations';
import * as Conversation from './Conversation';
import * as Identity from './Identity';

// The top-level state object
export interface ApplicationState {
    counter: Counter.CounterState | undefined;
    weatherForecasts: WeatherForecasts.WeatherForecastsState | undefined;
    //messages: Messages.MessagesState | undefined;
    conversations: Conversations.ConversationsState;
    conversation: Conversation.ConversationState | undefined;
}

export const InitialApplicationState: ApplicationState = {
    counter: Counter.InitialCounterState,
    weatherForecasts: WeatherForecasts.InitialWeatherForecastsState,
    conversation: undefined,
    conversations: Conversations.InitialConversationsState
}

// Whenever an action is dispatched, Redux will update each top-level application state property using
// the reducer with the matching name. It's important that the names match exactly, and that the reducer
// acts on the corresponding ApplicationState property type.
export const reducers = {
    counter: Counter.reducer,
    weatherForecasts: WeatherForecasts.reducer,
    //messages: Messages.reducer,
    conversations: Conversations.reducer,
    conversation: Conversation.reducer,
    identity: Identity.identityReducer
};

// This type can be used as a hint on action creators so that its 'dispatch' and 'getState' params are
// correctly typed to match your store.
export interface AppThunkAction<TAction, TPromiseValue> {
    (dispatch: (action: TAction) => void, getState: () => ApplicationState): Promise<TPromiseValue>;
}

export interface AppThunkAction1<TAction> {
    (dispatch: (action: TAction) => void, getState: () => ApplicationState): void;
}
