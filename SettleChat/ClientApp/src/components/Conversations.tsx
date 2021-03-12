import * as React from 'react';
import { Link } from "react-router-dom";
import { connect, ConnectedProps } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit'
import { ApplicationState } from '../store/index';
import { makeStyles } from '@material-ui/core/styles';
import { List, ListItem, ListItemAvatar, ListItemText, Divider, Avatar, Typography } from '@material-ui/core';
import GroupIcon from '@material-ui/icons/Group';
import PersonIcon from '@material-ui/icons/Person';
import TimeAgo from 'react-timeago';
import timeAgoEnglishStrings from 'react-timeago/lib/language-strings/en'
import timeAgoBuildFormatter from 'react-timeago/lib/formatters/buildFormatter'
import { sortedConversationsSelector } from '../store/Conversation';
import ConversationTitle from './ConversationTitle'
import ConversationLastMessage from './ConversationLastMessage';
import { requestConversationsWithUsers } from '../store/common'
import { requestMessagesForAllConversations } from '../store/messages';
import { selectAllConversationUsers } from '../store/conversationUsers';
import { allUsersSelector } from '../store/users'
import { ConversationUserMeta } from '../types/conversationUserTypes';
import { arrayToMap, groupBy } from '../helpers/arrayHelper';

const timeAgoFormatter = timeAgoBuildFormatter(timeAgoEnglishStrings);

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        overflowY: 'auto'
    }
}));

const Conversations = (props: ConnectedProps<typeof connector>) => {
    const classes = useStyles();
    const { requestConversationsWithUsers, requestMessagesForAllConversations, userId, isAuthenticated, hasMultipleUsersByConversationId } = props;
    React.useEffect(() => {
        const requestConversationsWithUsersPromise = requestConversationsWithUsers();
        const requestMessagesPromise = requestMessagesForAllConversations(1);
        return () => {
            const promiseAbortReason = 'User changed'
            requestConversationsWithUsersPromise.abort(promiseAbortReason)//TODO: test if abort uses abortion signal in fetch; make sure it doesn't insert result into store
            requestMessagesPromise.abort(promiseAbortReason);
        }
    }, [requestConversationsWithUsers, requestMessagesForAllConversations, userId]);

    return <List className={classes.root}>
        {isAuthenticated && userId &&
            props.conversations.map((conversation, index) => {
                const title = <ConversationTitle id={conversation.id} />
                return <React.Fragment key={conversation.id}>
                    <ListItem button
                        alignItems="flex-start"
                        key={conversation.id}
                        component={Link}
                        to={"/conversation/" + conversation.id}
                    >
                        <ListItemAvatar>
                            <Avatar>{hasMultipleUsersByConversationId.get(conversation.id) === false ? <PersonIcon /> : <GroupIcon />}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                            primary={title}
                            primaryTypographyProps={{ noWrap: true }}
                            secondary={
                                <>
                                    <Typography
                                        component="div"
                                        variant="body2"
                                        color="textPrimary"
                                    >
                                        <ConversationLastMessage conversationId={conversation.id} />
                                    </Typography>
                                    <TimeAgo date={conversation.lastActivityTimestamp} minPeriod={60} formatter={timeAgoFormatter} />
                                </>
                            }
                            secondaryTypographyProps={{ component: 'div', noWrap: true }}
                        />
                    </ListItem>
                    {index < props.conversations.length - 1 ? <Divider component="li" key={`${conversation.id}_divider`} /> : ''}
                </React.Fragment>
            }
            )
        }
    </List>;
}

/**
 * Returns Map of hasMultipleUsers by conversationId, where hasMultipleUsers says whether conversation has more than one other user except of current user
 * @param conversationUsers All conversationUsers
 * @param currentUserId ID of logged in user
 */
const getMapOfHasMultipleOtherUsersByConversationId = (conversationUsers: ConversationUserMeta[], currentUserId: string | null) =>
    arrayToMap([...groupBy(conversationUsers, (item) => item.conversationId)]
        .map((conversationUsersByConversationId) => ({
            conversationId: conversationUsersByConversationId[0],
            hasMultipleUsers: (conversationUsersByConversationId[1]
                .filter(x => x.userId !== currentUserId).length > 1
            )
        })),
        item => item.conversationId,
        item => item.hasMultipleUsers)

/**
 * Memoized selector
 * */
const selectMapOfHasMultipleUsersByConversationId = createSelector(
    selectAllConversationUsers,
    (state: ApplicationState) => state.identity.userId,
    getMapOfHasMultipleOtherUsersByConversationId
)

const mapStateToProps = (state: ApplicationState) => ({
    userId: state.identity.userId,
    isAuthenticated: !!state.identity.userId,
    conversations: sortedConversationsSelector(state),
    hasMultipleUsersByConversationId: selectMapOfHasMultipleUsersByConversationId(state)
});

const mapDispatchToProps = {
    requestConversationsWithUsers,
    requestMessagesForAllConversations
}

const connector = connect(
    mapStateToProps,
    mapDispatchToProps
)

export default connector(Conversations);