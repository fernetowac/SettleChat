import * as React from 'react';
import { Link } from "react-router-dom";
import { connect, ConnectedProps } from 'react-redux';
import { ApplicationState } from '../store/index';
import { makeStyles } from '@material-ui/core/styles';
import { List, ListItem, ListItemAvatar, ListItemText, Divider, Avatar, Typography } from '@material-ui/core';
import TimeAgo from 'react-timeago';
import timeAgoEnglishStrings from 'react-timeago/lib/language-strings/en'
import timeAgoBuildFormatter from 'react-timeago/lib/formatters/buildFormatter'
import { allConversationUsersSelector, allUsersSelector, sortedConversationsSelector } from '../store/Conversation';
import ConversationTitle from './ConversationTitle'
import ConversationLastMessage from './ConversationLastMessage';
import { requestConversationsWithUsers } from '../store/common'
import { requestMessages } from '../store/messages';

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
    const { requestConversationsWithUsers, requestMessages, userId, isAuthenticated } = props;
    React.useEffect(() => {
        const requestConversationsWithUsersPromise = requestConversationsWithUsers();
        const requestMessagesPromise = requestMessages(1);
        return () => {
            const promiseAbortReason = 'User changed'
            requestConversationsWithUsersPromise.abort(promiseAbortReason)//TODO: test if abort uses abortion signal in fetch; make sure it doesn't insert result into store
            requestMessagesPromise.abort(promiseAbortReason);
        }
    }, [requestConversationsWithUsers, requestMessages, userId]);

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
                            <Avatar>{title}</Avatar>
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

const mapStateToProps = (state: ApplicationState) => ({
    userId: state.identity.userId,
    isAuthenticated: !!state.identity.userId,
    conversations: sortedConversationsSelector(state),
    conversationUsers: allConversationUsersSelector(state),
    users: allUsersSelector(state)
});

const mapDispatchToProps = {
    requestConversationsWithUsers,
    requestMessages
}

const connector = connect(
    mapStateToProps,
    mapDispatchToProps
)

export default connector(Conversations);