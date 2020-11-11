import * as React from 'react';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import UserAvatar from './UserAvatar';
import { List, ListItem, ListItemAvatar, ListItemText, Tooltip } from '@material-ui/core';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';

export interface MessagesState {
    messages: ConversationStore.Message[];
    users: ConversationStore.User[];
    me: { userId: string };
}

// At runtime, Redux will merge together...
type MessagesProps =
    MessagesState // ... state we've requested from the Redux store
    & typeof ConversationStore.actionCreators; // ... plus action creators we've requested
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
    const classes = useStyles();
    const userNameById = new Map<string, string>();
    props.users.forEach((user) => {
        userNameById.set(user.id, user.userName);
    });

    return <React.Fragment>
        <h1>Messages ({props.messages.length})</h1>
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

export default connect(
    (state: ApplicationState): MessagesState => {
        return {
            messages: ((state.conversation === undefined ? undefined : state.conversation.messages) || []),
            users: state.conversation && state.conversation.users ? state.conversation.users : [],
            me: {
                userId: state.identity.userId
            }
        } as MessagesState;
    },
    ConversationStore.actionCreators
)(Messages as any);
