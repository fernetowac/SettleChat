import * as React from 'react';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from '../store/Conversation';
import { User, UserStatus } from '../store/Conversation';
import UserAvatarBadge from './UserAvatarBadge';
import { makeStyles } from '@material-ui/core/styles';
import { List, ListItem, ListItemAvatar, ListItemText, Divider } from '@material-ui/core';

export interface UsersState {
    conversationId: string,
    users: ConversationStore.User[];
}

// At runtime, Redux will merge together...
type UsersProps =
    UsersState // ... state we've requested from the Redux store
    & typeof ConversationStore.actionCreators; // ... plus action creators we've requested
//& RouteComponentProps<{ startDateIndex: string }>; // ... plus incoming routing parameters

function WriteStatus(status: UserStatus): string {
    switch (status) {
        case ConversationStore.UserStatus.Offline:
            return '[offline]';
        case UserStatus.Online:
            return '[online]';
        case UserStatus.Inactive:
            return '[inactive]';
        default:
            throw new Error('Undefined status:' + status);
    }
}

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        overflowY: 'auto'
    }
}));

const Users = (props: UsersProps) => {
    const classes = useStyles();
    const { conversationId, requestUsers } = props;

    React.useEffect(() => {
        if (conversationId) {
            requestUsers();
        }
    }, [conversationId, requestUsers]);

    return <React.Fragment>
        <h1>Users ({props.users.length})</h1>
        <List className={classes.root}>
            {
                (props.users as User[]).map((user, index) => (
                    <React.Fragment key={user.id}>
                        <ListItem alignItems="flex-start" key={user.id}>
                            <ListItemAvatar>
                                <UserAvatarBadge {...user} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={user.userName}
                                secondary={WriteStatus(user.status)}
                                primaryTypographyProps={{ noWrap: true }}
                            />
                        </ListItem>
                        {index < props.users.length - 1 ? <Divider component="li" key={`${user.id}_divider`} /> : ''}
                    </React.Fragment>)
                )
            }
        </List>
    </React.Fragment>;
}

export default connect(
    (state: ApplicationState): UsersState => {
        return {
            users: ((state.conversation === undefined ? undefined : state.conversation.users) || []),
            conversationId: state.conversation && state.conversation.detail ? state.conversation.detail.id : undefined
        } as UsersState;
    },
    ConversationStore.actionCreators
)(Users as any);
