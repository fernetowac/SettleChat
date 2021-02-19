import * as React from 'react';
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ApplicationState } from '../store/index';
import { ConversationListItem, ConversationListItemUser, actionCreators as ConversationsActionCreators, actions as conversationsActions } from '../store/Conversations';
import { makeStyles } from '@material-ui/core/styles';
import { List, ListItem, ListItemAvatar, ListItemText, Divider, Avatar, Typography } from '@material-ui/core';
import TimeAgo from 'react-timeago';
import timeAgoEnglishStrings from 'react-timeago/lib/language-strings/en'
import timeAgoBuildFormatter from 'react-timeago/lib/formatters/buildFormatter'
import { AppDispatch } from '../index'
import { ReduxType } from '../types/commonTypes';
import { Ascending } from '../helpers/sortHelper'

const timeAgoFormatter = timeAgoBuildFormatter(timeAgoEnglishStrings);

type ConversationProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        overflowY: 'auto'
    }
}));

const getUserNicknameWithFallback = (user?: ConversationListItemUser) => {
    // It can happen that user is not loaded correctly in other signalr or fetch response (e.g. due to connection issues). 
    // In such case we don't want the app to crash.
    if (!user) {
        return 'unknown'
    }
    return user.userNickName === null ? user.userName : user.userNickName;
}

//TODO: this component can go into separate file
const LastMessage = (props: { conversation: ReduxType<ConversationListItem>, myIdentityUserId: string }) => {
    const { conversation, myIdentityUserId } = props;
    if (!conversation.lastMessageText !== !conversation.lastMessageUserId) {
        throw Error();
    }

    if (!conversation.lastMessageText) {
        return <React.Fragment>No messages yet</React.Fragment>;
    }

    if (conversation.lastMessageUserId === myIdentityUserId) {
        return <React.Fragment>
            you: {conversation.lastMessageText}
        </React.Fragment>;
    }

    const user = conversation.users.find((user) => user.id === conversation.lastMessageUserId);

    return <React.Fragment>
        {getUserNicknameWithFallback(user)}: {conversation.lastMessageText}
    </React.Fragment>;
}

const Conversations = (props: ConversationProps) => {
    const classes = useStyles();
    const { requestConversations, clearConversations, userId, isAuthenticated } = props;
    React.useEffect(() => {
        if (!isAuthenticated) {
            clearConversations();
        } else {
            requestConversations();
        }
    }, [requestConversations, clearConversations, userId, isAuthenticated]);

    return <React.Fragment>
        <List className={classes.root}>
            {isAuthenticated && userId &&
                props.conversations.map((conversation, index) => (
                    <React.Fragment key={conversation.id}>
                        <ListItem button
                            alignItems="flex-start"
                            key={conversation.id}
                            component={Link}
                            to={"/conversation/" + conversation.id}
                        >
                            <ListItemAvatar>
                                <Avatar alt={conversation.title}>{conversation.title}</Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={conversation.title == null ? conversation.users.map(getUserNicknameWithFallback).join(', ') : conversation.title}
                                primaryTypographyProps={{ noWrap: true }}
                                secondary={
                                    <React.Fragment>
                                        <Typography
                                            component="div"
                                            variant="body2"
                                            color="textPrimary"
                                        >
                                            <LastMessage conversation={conversation} myIdentityUserId={userId} />
                                        </Typography>
                                        <TimeAgo date={conversation.lastActivityTimestamp} minPeriod={60} formatter={timeAgoFormatter} />
                                    </React.Fragment>}
                                secondaryTypographyProps={{ component: 'div', noWrap: true }}
                            />
                        </ListItem>
                        {index < props.conversations.length - 1 ? <Divider component="li" key={`${conversation.id}_divider`} /> : ''}
                    </React.Fragment>)
                )
            }
        </List>
    </React.Fragment>;
}

const getConversations = (state: ApplicationState): ReduxType<ConversationListItem>[] => state.conversations.conversations;
const getSortedConversations = (conversations: ReduxType<ConversationListItem>[]): ReduxType<ConversationListItem>[] =>
    [...conversations].sort(Ascending.by(x => x.lastActivityTimestamp));

/**
 * Memoized sorting of conversations
 */
const sortedConversationsSelector = createSelector([getConversations], getSortedConversations);

const mapStateToProps = (state: ApplicationState) => ({
    userId: state.identity.userId,
    isAuthenticated: !!state.identity.userId,
    conversations: sortedConversationsSelector(state)
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    requestConversations: () => dispatch(ConversationsActionCreators.requestConversations()),
    clearConversations: conversationsActions.clear
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Conversations as any);
