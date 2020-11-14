import * as React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import UserAvatar from './UserAvatar';
import { List, ListItem, ListItemAvatar, ListItemText, Tooltip, Button } from '@material-ui/core';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';

export interface MessagesState {
    messages: ConversationStore.Message[];
    users: ConversationStore.User[];
    me: { userId: string };
}

// At runtime, Redux will merge together...
type MessagesProps =
    MessagesState // ... state we've requested from the Redux store
    & MapDispatchToPropsType;
//& RouteComponentProps<{ startDateIndex: string }>; // ... plus incoming routing parameters

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        width: '100%',
        //maxWidth: 360,
        backgroundColor: theme.palette.background.paper,
        position: 'relative',
        overflow: 'auto',
        maxHeight: 300,
    },
    listItemTextLeft: {
        backgroundImage: 'linear-gradient(135deg,#ffffff 10%,#f0f0f3)!important',
        'box-shadow': '0 0.46875rem 2.1875rem rgba(59,62,102,.03), 0 0.9375rem 1.40625rem rgba(59,62,102,.03), 0 0.25rem 0.53125rem rgba(59,62,102,.05), 0 0.125rem 0.1875rem rgba(59,62,102,.03)',
        'border-radius': '0.2rem 1.3rem 1.3rem 1.3rem',
        padding: '9px 21px',
        margin: '0 5px 0 0',
        'white-space': 'pre-wrap'
    },
    listItemTextRight: {
        backgroundImage: 'linear-gradient(135deg,#f0f0f3 10%,#ffffff)!important',
        'box-shadow': '0 0.46875rem 2.1875rem rgba(59,62,102,.03), 0 0.9375rem 1.40625rem rgba(59,62,102,.03), 0 0.25rem 0.53125rem rgba(59,62,102,.05), 0 0.125rem 0.1875rem rgba(59,62,102,.03)',
        'border-radius': '1.3rem 0.2rem 1.3rem 1.3rem',
        padding: '9px 21px',
        margin: '0 5px 0 0',
        'white-space': 'pre-wrap'
    }
}));

const Messages = (props: MessagesProps) => {
    const [loadMoreButtonEnabled, setLoadMoreButtonActive] = React.useState(true);

    const classes = useStyles();
    const userNameById = new Map<string, string>();
    props.users.forEach((user) => {
        userNameById.set(user.id, user.userName);
    });

    const getOldestMessage = (messages: ConversationStore.Message[]): ConversationStore.Message => {
        let oldestMessage = props.messages[0];
        for (var i = 1; i < props.messages.length; i++) {
            if (oldestMessage.created > props.messages[i].created) {
                oldestMessage = props.messages[i];
            }
        }
        return oldestMessage;
    }

    const onLoadMoreClicked = () => {
        const oldestMessage = getOldestMessage(props.messages);
        setLoadMoreButtonActive(false);
        props.actions.requestMessages(oldestMessage.id, 2)
            .then(messages => setLoadMoreButtonActive(true));
    }

    return <React.Fragment>
        <h1>Messages ({props.messages.length})</h1>
        <Button variant="contained" onClick={onLoadMoreClicked} disabled={!loadMoreButtonEnabled}>Load more</Button>
        <List className={classes.root}>{
            (props.messages as ConversationStore.Message[]).map(item => {
                var userName = userNameById.get(item.userId) || 'Loading..';

                if (item.userId !== props.me.userId) {
                    return <ListItem key={item.id}>
                        <ListItemAvatar>
                            <Tooltip title="aaaaaaaaaaaaaaaaaaaaaaaaaa" arrow>
                                <UserAvatar userName={userName} />
                            </Tooltip>
                        </ListItemAvatar>
                        <ListItemText classes={{ root: classes.listItemTextLeft }}>{item.text}</ListItemText>
                    </ListItem>;
                } else {
                    return <ListItem key={item.id}>
                        <ListItemText classes={{ root: classes.listItemTextRight }}>{item.text}</ListItemText>
                        <ListItemAvatar>
                            <UserAvatar userName={userName} />
                        </ListItemAvatar>
                    </ListItem>;
                }
            })
        }
        </List>
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
        requestMessages: (beforeId?: string, amount?: number) => Promise<ConversationStore.Message[] | void>;
    }
};
const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationStore.ConversationKnownAction>): MapDispatchToPropsType => ({
    actions: {
        requestMessages: (beforeId?: string, amount: number = 30) => dispatch(ConversationStore.actionCreators.requestMessages(beforeId, amount)),
    }
});

const mapStateToProps = (state: ApplicationState): MessagesState => {
    return {
        messages: sortedMessagesSelector(state),
        users: state.conversation && state.conversation.users ? state.conversation.users : [],
        me: {
            userId: state.identity.userId
        }
    } as MessagesState;
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Messages as any);
