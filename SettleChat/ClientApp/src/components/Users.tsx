import * as React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { ApplicationState } from '../store/index';
import { UserStatus, User } from '../types/userTypes';
import UserAvatarBadge from './UserAvatarBadge';
import { makeStyles } from '@material-ui/core/styles';
import { List, ListItem, ListItemAvatar, ListItemText, Divider, ListItemSecondaryAction } from '@material-ui/core';
import { requestConversationUsers } from '../store/common'
import { conversationUsersByConversationIdSelector, selectAllConversationUsers } from "../store/conversationUsers";
import { selectUsersByConversationId, allUsersSelector } from '../store/users';
import _union from 'lodash/union'
import { ConversationUserMeta } from '../types/conversationUserTypes';

export interface UsersState {
    conversationId: string,
    users: User[];
}

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

const getHighlightedText = (text: string, highlight: string) => {
    // Split on highlight term and include term into parts, ignore case
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return <span> {parts.map((part, i) =>
        <span key={i} style={part.toLowerCase() === highlight.toLowerCase() ? { fontWeight: 'bold' } : {}}>
            {part}
        </span>)
    } </span>;
}

const Users = (props: ConnectedProps<typeof connector>) => {
    const classes = useStyles();
    const { conversationId, users, conversationUsers, userNameFilter, requestConversationUsers, listItemSecondaryActionContent, listItemSecondaryActionHandler } = props;

    React.useEffect(() => {
        if (conversationId) {
            requestConversationUsers(conversationId);
        }//TODO: abort promise when identity changes
    }, [conversationId, requestConversationUsers]);

    return <>
        <h1>Users ({users.length})</h1>
        <List className={classes.root}>
            {
                (users).map((user, index) => {
                    const conversationUser = conversationUsers.find(x => x.userId == user.id)
                    const name = conversationUser && conversationUser.nickname || user.userName
                    const highlightedName = userNameFilter && userNameFilter.length > 0 ? getHighlightedText(name, userNameFilter) : name
                    return <React.Fragment key={user.id}>
                        <ListItem alignItems="flex-start" key={user.id}>
                            <ListItemAvatar>
                                <UserAvatarBadge name={name} status={user.status} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={highlightedName}
                                secondary={WriteStatus(user.status)}
                                primaryTypographyProps={{ noWrap: true }}
                            />
                            {
                                listItemSecondaryActionContent &&
                                <ListItemSecondaryAction onClick={() => listItemSecondaryActionHandler && listItemSecondaryActionHandler(user.id, name)}>
                                    {listItemSecondaryActionContent}
                                </ListItemSecondaryAction>
                            }
                        </ListItem>
                        {index < users.length - 1 ? <Divider component="li" key={`${user.id}_divider`} /> : ''}
                    </React.Fragment>
                })
            }
        </List>
    </>;
}

interface OwnProps {
    conversationId?: string,
    userNameFilter?: string,
    listItemSecondaryActionContent?: React.ReactNode,
    listItemSecondaryActionHandler?: (userId: string, name: string) => void,
    excludedUserIds?: string[]
}

// TODO: make it work with multiple words in input
const getFilteredUsersIds = (nameFilter: string, users: User[], conversationUsers: ConversationUserMeta[]) => {
    const upperCasedNameFilter = nameFilter.toUpperCase()
    const usersIdsFilteredByName = users
        .filter((user) => user.userName.toUpperCase().includes(upperCasedNameFilter)).map((user) => user.id)
    const conversationUsersUserIdsFilteredByNickname = conversationUsers
        .filter((conversationUser) => conversationUser.nickname && conversationUser.nickname.toUpperCase().includes(upperCasedNameFilter))
        .map((conversationUser) => conversationUser.userId)
    return _union(usersIdsFilteredByName, conversationUsersUserIdsFilteredByNickname)
}

const mapStateToProps = (state: ApplicationState, { conversationId, userNameFilter, listItemSecondaryActionContent, listItemSecondaryActionHandler, excludedUserIds }: OwnProps) => {
    // either all or filtered by conversationId
    let users = conversationId ? selectUsersByConversationId(state, { conversationId }) : allUsersSelector(state)
    let conversationUsers = conversationId ? conversationUsersByConversationIdSelector(state, { conversationId }) : selectAllConversationUsers(state)

    // excludes if needed
    if (excludedUserIds && excludedUserIds.length > 0) {
        users = users.filter(x => !excludedUserIds.includes(x.id))
        conversationUsers = conversationUsers.filter(x => !excludedUserIds.includes(x.userId))
    }

    // filtering by name
    if (userNameFilter !== undefined && userNameFilter.length > 0) {
        const filteredUsersIds = getFilteredUsersIds(userNameFilter, users, conversationUsers)
        users = users.filter((user) => filteredUsersIds.includes(user.id))
        conversationUsers = conversationUsers.filter((conversationUser) => filteredUsersIds.includes(conversationUser.userId))
    }

    return {
        users,
        conversationUsers,
        conversationId,
        userNameFilter,
        listItemSecondaryActionContent,
        listItemSecondaryActionHandler
    }
}

const connector = connect(
    mapStateToProps,
    {
        requestConversationUsers
    }
)

export default connector(Users)