import * as React from 'react';
import { Link } from "react-router-dom";
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import { ConversationListItem, ConversationsState, actionCreators as ConversationsActionCreators, ReceiveListAction, RequestListAction } from '../store/Conversations';
import { makeStyles } from '@material-ui/core/styles';
import { List, ListItem, ListItemAvatar, ListItemText, Divider, Avatar } from '@material-ui/core';

type ConversationsComponentState = ConversationsState & { userId: string | null, isAuthenticated: boolean };
type ConversationProps = ConversationsComponentState & MapDispatchToPropsType;

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        overflowY: 'auto'
    }
}));

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
            {
                (props.conversations as ConversationListItem[]).map((conversation, index) => (
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
                                primary={conversation.title}
                                primaryTypographyProps={{ noWrap: true }}
                                secondary={conversation.lastMessageText}
                            />
                        </ListItem>
                        {index < props.conversations.length - 1 ? <Divider component="li" key={`${conversation.id}_divider`} /> : ''}
                    </React.Fragment>)
                )
            }
        </List>
    </React.Fragment>;
}

const conversationCompareByLastActivityDesc = (a: ConversationListItem, b: ConversationListItem): number => {
    if (a.lastActivityTimestamp < b.lastActivityTimestamp) {
        return 1;
    }
    else if (a.lastActivityTimestamp > b.lastActivityTimestamp) {
        return -1;
    }
    return 0;
}

const getConversations = (state: ApplicationState): ConversationListItem[] => state.conversations.conversations;
const getSortedConversations = (conversations: ConversationListItem[]): ConversationListItem[] => conversations.sort(conversationCompareByLastActivityDesc);

/**
 * Memoized sorting of conversations
 */
const sortedConversationsSelector = createSelector([getConversations], getSortedConversations);


type MapDispatchToPropsType = {
    requestConversations: () => Promise<ConversationListItem[]>;
    clearConversations: () => void;
};

const mapStateToProps = (state: ApplicationState): ConversationsComponentState => ({
    userId: state.identity.userId,
    isAuthenticated: !!state.identity.userId,
    conversations: sortedConversationsSelector(state)
});

const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ReceiveListAction | RequestListAction>): MapDispatchToPropsType => ({
    requestConversations: () => (dispatch as ThunkDispatch<ApplicationState, undefined, ReceiveListAction | RequestListAction>)(ConversationsActionCreators.requestConversations()),
    clearConversations: ConversationsActionCreators.clearConversations
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(Conversations as any);
