import * as React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import UserAvatar from './UserAvatar';
import DividerWithChip from './DividerWithChip';
import { Box, ListItem, ListItemAvatar, ListItemText, Tooltip, Button } from '@material-ui/core';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import { ListWithScrollDownButton } from './ListWithScrollDownButton';
import TimeAgo from 'react-timeago';
import timeAgoEnglishStrings from 'react-timeago/lib/language-strings/en'
import timeAgoBuildFormatter from 'react-timeago/lib/formatters/buildFormatter'
import { format, isSameDay, differenceInMinutes } from 'date-fns'
import clsx from 'clsx';

const timeAgoFormatter = timeAgoBuildFormatter(timeAgoEnglishStrings);

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
        backgroundColor: theme.palette.background.paper,
        position: 'relative',
        overflow: 'auto'
    },
    messageBubble: {
        boxShadow: '0 0.46875rem 2.1875rem rgba(59,62,102,.03), 0 0.9375rem 1.40625rem rgba(59,62,102,.03), 0 0.25rem 0.53125rem rgba(59,62,102,.05), 0 0.125rem 0.1875rem rgba(59,62,102,.03)',
        padding: '9px 21px',
        marginBottom: '1px',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word'
    },
    otherUserMessageBubble: {
        backgroundColor: '#696969',
        color: '#fff',
        borderRadius: '0.2rem 1.2rem 1.2rem 0.2rem',
        '&:first-of-type': {
            'border-radius': '1.2rem 1.2rem 1.2rem 0.2rem'
        }
    },
    myUserMessageBubble: {
        backgroundColor: '#b1b1b1',
        boxShadow: '0 0.46875rem 2.1875rem rgba(59,62,102,.03), 0 0.9375rem 1.40625rem rgba(59,62,102,.03), 0 0.25rem 0.53125rem rgba(59,62,102,.05), 0 0.125rem 0.1875rem rgba(59,62,102,.03)',
        borderRadius: '1.2rem 0.2rem 0.2rem 1.2rem',
        '&:first-of-type': {
            'border-radius': '1.2rem 1.2rem 0.2rem 1.2rem'
        }
    }
}));

const useStylesForMyUserMessageBubbleGroup = makeStyles(() => createStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
    },
    primary: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
    },
    secondary: {
        textAlign: "end",
        fontSize: "0.75rem",
        color: "rgba(0, 0, 0, 0.54)"
    }
}));

const useStylesForOtherUserMessageBubbleGroup = makeStyles(() => createStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
    },
    primary: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
    },
    secondary: {
        textAlign: "end",
        fontSize: "0.75rem",
        color: "rgba(0, 0, 0, 0.54)"
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
    const myUserMessageBubbleGroupClasses = useStylesForMyUserMessageBubbleGroup();
    const otherUserMessageBubbleGroupClasses = useStylesForOtherUserMessageBubbleGroup();
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


    var resultListItems = [];
    let messageGroup = [];
    for (let i = 0; i < props.messages.length; i++) {
        const item = props.messages[i];
        var userName = userNameById.get(item.userId) || 'Loading..';

        if (i === 0 || !isSameDay(props.messages[i - 1].created, item.created)) {
            resultListItems.push(<DividerWithChip component="li" key={`${item.id}_divider`} label={format(item.created, 'PPP')} />);
        }

        const maxMinutesDiffInFollowUpMessages = 3;
        const thisMessageFollowsUp = (i > 0 && props.messages[i - 1].userId === item.userId && differenceInMinutes(item.created, props.messages[i - 1].created) < maxMinutesDiffInFollowUpMessages && isSameDay(item.created, props.messages[i - 1].created));
        const nextMessageFollowsUp = (i + 1 < props.messages.length && props.messages[i + 1].userId === item.userId && differenceInMinutes(props.messages[i + 1].created, item.created) < maxMinutesDiffInFollowUpMessages && isSameDay(props.messages[i + 1].created, item.created));

        if (!thisMessageFollowsUp) {
            messageGroup = [];
        }
        let listItem = null;
        if (item.userId !== props.me.userId) {
            messageGroup.push(
                <Box key={item.id} className={clsx(classes.messageBubble, classes.otherUserMessageBubble)}>
                    {item.text}
                </Box>
            );
            if (!nextMessageFollowsUp) {
                listItem = <ListItem key={item.id} style={{ alignItems: 'flex-end' }} dense>
                    <ListItemAvatar>
                        <Tooltip title={userName} arrow placement="right">
                            <UserAvatar userName={userName} />
                        </Tooltip>
                    </ListItemAvatar>
                    <ListItemText
                        classes={otherUserMessageBubbleGroupClasses}
                        primary={messageGroup}
                        secondary={
                            <React.Fragment>
                                {userName}
                                <Box marginLeft={1} component="span">
                                    <TimeAgo date={item.created} minPeriod={60} formatter={timeAgoFormatter} />
                                </Box>
                            </React.Fragment>
                        }
                    />
                </ListItem>;
            }
        } else {
            messageGroup.push(
                <Box key={item.id} className={clsx(classes.messageBubble, classes.myUserMessageBubble)}                >
                    {item.text}
                </Box>);
            if (!nextMessageFollowsUp) {
                listItem = <ListItem key={item.id} style={{ alignItems: 'flex-end' }} dense>
                    <ListItemText
                        classes={myUserMessageBubbleGroupClasses}
                        primary={messageGroup}
                        secondary={<TimeAgo date={item.created} minPeriod={60} formatter={timeAgoFormatter} />}
                    />
                </ListItem>;
            }
        }
        if (listItem != null) {
            resultListItems.push(listItem);
        }
    }

    return <React.Fragment>
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
                        {resultListItems}
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

const getMessages = (state: ApplicationState, conversationId: string): ConversationStore.Message[] => (
    state.conversation === undefined ?
        undefined :
        state.conversation.messages
            .filter(message => message.conversationId === conversationId)
) || [];
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
        requestMessages: (conversationId: string, beforeId?: string, amount = 30) => dispatch(ConversationStore.actionCreators.requestMessages(conversationId, beforeId, amount)),
        enableLoadingMoreMessages: () => dispatch(ConversationStore.actionCreators.enableLoadingMoreMessages()),
        disableLoadingMoreMessages: () => dispatch(ConversationStore.actionCreators.disableLoadingMoreMessages())
    }
});

interface OwnProps {
    conversationId: string;
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps): MessagesState => {
    return {
        messages: sortedMessagesSelector(state, ownProps.conversationId),
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