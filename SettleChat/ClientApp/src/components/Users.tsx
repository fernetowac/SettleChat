import * as React from 'react';
import { connect } from 'react-redux';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from '../store/Conversation';
import { UserStatus, User } from '../types/userTypes';
import UserAvatarBadge from './UserAvatarBadge';
import { makeStyles } from '@material-ui/core/styles';
import { List, ListItem, ListItemAvatar, ListItemText, Divider } from '@material-ui/core';

export interface UsersState {
    conversationId: string,
    users: User[];
}

// At runtime, Redux will merge together...
type UsersProps = ReturnType<typeof mapStateToProps> & typeof ConversationStore.actionCreators & OwnProps

function WriteStatus(status: UserStatus): string {
    switch (status) {
        case UserStatus.Offline:
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
    const { conversationId, requestConversationUsers } = props;

    React.useEffect(() => {
        if (conversationId) {
            requestConversationUsers(conversationId);
        }
    }, [conversationId, requestConversationUsers]);

    return <React.Fragment>
        <h1>Users ({props.users.length})</h1>
        <List className={classes.root}>
            {
                (props.users).map((user, index) => {
                    const conversationUser = props.conversationUsers.find(x => x.userId == user.id)
                    const name = conversationUser && conversationUser.nickname || user.userName
                    return <React.Fragment key={user.id}>
                        <ListItem alignItems="flex-start" key={user.id}>
                            <ListItemAvatar>
                                <UserAvatarBadge name={name} status={user.status} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={name}
                                secondary={WriteStatus(user.status)}
                                primaryTypographyProps={{ noWrap: true }}
                            />
                        </ListItem>
                        {index < props.users.length - 1 ? <Divider component="li" key={`${user.id}_divider`} /> : ''}
                    </React.Fragment>
                })
            }
        </List>
    </React.Fragment>;
}

interface OwnProps {
    conversationId: string
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps) => {
    return {
        users: ConversationStore.selectUsersByConversationId(state, ownProps),
        conversationUsers: ConversationStore.conversationUsersByConversationIdSelector(state, ownProps)
    }
}

export default connect(
    mapStateToProps,
    ConversationStore.actionCreators
)(Users as any);
