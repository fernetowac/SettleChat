import * as React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import UserAvatar from './UserAvatar';
import { ListItem, ListItemAvatar, ListItemText, Tooltip, Button } from '@material-ui/core';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import { ListWithScrollDownButton } from './ListWithScrollDownButton';

export interface MessagesState {
    messages: ConversationStore.Message[];
    users: ConversationStore.User[];
    me: {
        userId: string
    };
    ui: {
        canLoadMoreMessages: boolean
    };
    conversationId: string;
}

// At runtime, Redux will merge together...
type MessagesProps =
    MessagesState // ... state we've requested from the Redux store
    & MapDispatchToPropsType;

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        width: '100%',
        //maxWidth: 360,
        backgroundColor: theme.palette.background.paper,
        position: 'relative',
        overflow: 'auto'
    },
    listItemTextRight: {
        backgroundColor: '#696969',
        color: '#fff',
        'box-shadow': '0 0.46875rem 2.1875rem rgba(59,62,102,.03), 0 0.9375rem 1.40625rem rgba(59,62,102,.03), 0 0.25rem 0.53125rem rgba(59,62,102,.05), 0 0.125rem 0.1875rem rgba(59,62,102,.03)',
        'border-radius': '0.2rem 1.3rem 1.3rem 1.3rem',
        padding: '9px 21px',
        margin: '0 5px 0 0',
        'white-space': 'pre-wrap',
        wordWrap: 'break-word'
    },
    listItemTextLeft: {
        backgroundColor: '#b1b1b1',
        'box-shadow': '0 0.46875rem 2.1875rem rgba(59,62,102,.03), 0 0.9375rem 1.40625rem rgba(59,62,102,.03), 0 0.25rem 0.53125rem rgba(59,62,102,.05), 0 0.125rem 0.1875rem rgba(59,62,102,.03)',
        'border-radius': '1.3rem 0.2rem 1.3rem 1.3rem',
        padding: '9px 21px',
        margin: '0 5px 0 0',
        'white-space': 'pre-wrap',
        wordWrap: 'break-word'
    }
}));

export interface GetTriggerOptions<TTarget extends HTMLElement | Window> {
    disableHysteresis?: boolean;
    target: TTarget;
    threshold?: number;
}

export interface UseScrollTriggerOptions<TTarget extends HTMLElement | Window> {
    disableHysteresis?: boolean;
    target?: TTarget;
    threshold?: number;
    getTrigger?: (store: React.MutableRefObject<any>, options: GetTriggerOptions<TTarget>, threshold?: number) => boolean;
}

const Messages = (props: MessagesProps) => {
    const { requestMessages, enableLoadingMoreMessages, disableLoadingMoreMessages } = props.actions;
    const { conversationId } = props;
    const [loadMoreButtonEnabled, setLoadMoreButtonActive] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(true);

    const classes = useStyles();
    const userNameById = new Map<string, string>();
    props.users.forEach((user) => {
        userNameById.set(user.id, user.userName);
    });

    const getOldestMessage = (messages: ConversationStore.Message[]): ConversationStore.Message | undefined => {
        if (messages.length === 0) {
            return undefined;
        }
        let oldestMessage = messages[0];
        for (var i = 1; i < messages.length; i++) {
            if (oldestMessage.created > messages[i].created) {
                oldestMessage = messages[i];
            }
        }
        return oldestMessage;
    }

    const onLoadMoreClicked = () => {
        const oldestMessage = getOldestMessage(props.messages);
        setLoadMoreButtonActive(false);
        const amountOfMessagesToLoad = 2;
        props.actions.requestMessages(conversationId, (oldestMessage && oldestMessage.id) || undefined, amountOfMessagesToLoad)
            .then(messages => {
                if (messages.length < amountOfMessagesToLoad) {
                    disableLoadingMoreMessages();
                }
            })
            .finally(() => setLoadMoreButtonActive(true));
    }

    React.useEffect(() => {
        let isMounted = true;
        const amountOfMessagesToLoad = 2;
        requestMessages(conversationId, undefined, amountOfMessagesToLoad)
            .then(messages => {
                if (messages.length >= amountOfMessagesToLoad) {
                    enableLoadingMoreMessages();
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [requestMessages, enableLoadingMoreMessages, conversationId]);


    return <React.Fragment>
        <h1 style={{ display: 'flex', flexGrow: 1 }}>Messages ({props.messages.length})</h1>
        {
            isLoading ?
                'Loading..' :
                (props.messages.length === 0 ? 'No messages yet' :
                    <ListWithScrollDownButton className={classes.root}>
                        <ListItem key="scroll-bottom-button" style={{ display: 'flex', justifyContent: 'center' }}>
                            {
                                props.ui.canLoadMoreMessages ?
                                    <Button variant="contained" onClick={onLoadMoreClicked} disabled={!loadMoreButtonEnabled}>Load more</Button>
                                    : 'No more messages.'
                            }
                        </ListItem>
                        {
                            (props.messages as ConversationStore.Message[]).map(item => {
                                var userName = userNameById.get(item.userId) || 'Loading..';

                                if (item.userId !== props.me.userId) {
                                    return <ListItem key={item.id} alignItems="flex-start">
                                        <ListItemAvatar>
                                            <Tooltip title={userName} arrow placement="right">
                                                <UserAvatar userName={userName} />
                                            </Tooltip>
                                        </ListItemAvatar>
                                        <ListItemText classes={{ root: classes.listItemTextRight }}>{item.text}</ListItemText>
                                    </ListItem>;
                                } else {
                                    return <ListItem key={item.id} alignItems="flex-start">
                                        <ListItemText classes={{ root: classes.listItemTextLeft }}>{item.text}</ListItemText>
                                        <ListItemAvatar>
                                            <Tooltip title={userName} arrow placement="left">
                                                <UserAvatar userName={userName} />
                                            </Tooltip>
                                        </ListItemAvatar>
                                    </ListItem>;
                                }
                            })
                        }
                    </ListWithScrollDownButton>
                )
        }
    </React.Fragment>;
}

const messageCompareByCreatedAsc = (a: ConversationStore.Message, b: ConversationStore.Message): number => {
    if (a.created < b.created) {
        return -1;
    }
    else if (a.created > b.created) {
        return 1;
    }
    return 0;
}

const getMessages = (state: ApplicationState): ConversationStore.Message[] => (state.conversation === undefined ? undefined : state.conversation.messages) || [];
const getSortedMessages = (messages: ConversationStore.Message[]): ConversationStore.Message[] => messages.sort(messageCompareByCreatedAsc);

/**
 * Memoized sorting of messages
 */
const sortedMessagesSelector = createSelector([getMessages], getSortedMessages);

type MapDispatchToPropsType = {
    actions: {
        requestMessages: (conversationId: string, beforeId?: string, amount?: number) => Promise<ConversationStore.Message[]>;
        enableLoadingMoreMessages: () => void;
        disableLoadingMoreMessages: () => void;
    }
};
const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationStore.KnownAction>): MapDispatchToPropsType => ({
    actions: {
        requestMessages: (conversationId, beforeId, amount = 30) => dispatch(ConversationStore.actionCreators.requestMessages(conversationId, beforeId, amount)),
        enableLoadingMoreMessages: () => dispatch(ConversationStore.actionCreators.enableLoadingMoreMessages()),
        disableLoadingMoreMessages: () => dispatch(ConversationStore.actionCreators.disableLoadingMoreMessages())
    }
});

interface OwnProps {
    conversationId: string;
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps): MessagesState => {
    return {
        messages: sortedMessagesSelector(state),
        users: state.conversation && state.conversation.users ? state.conversation.users : [],
        me: {
            userId: state.identity.userId
        },
        ui: {
            canLoadMoreMessages: state.conversation ? state.conversation.ui.canLoadMoreMessages : false
        },
        conversationId: ownProps.conversationId
    } as MessagesState;
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Messages as any);