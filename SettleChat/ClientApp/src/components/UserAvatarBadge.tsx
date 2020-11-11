import * as React from 'react';
import * as  ConversationStore from '../store/Conversation';
import { User } from '../store/Conversation';
import UserAvatar from './UserAvatar';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { Badge } from '@material-ui/core';

const useBadgeStyles = makeStyles((theme: Theme) => ({
    badgeOnline: {
        backgroundColor: '#44b700',
        color: '#44b700',
        boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
        '&::after': {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            animation: '$ripple 1.2s infinite ease-in-out',
            border: '1px solid currentColor',
            content: '""',
        },
    },
    badgeOffline: {
        backgroundColor: '#EF443A',
        color: '#EF443A',
        boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
        '&::after': {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            animation: '$ripple 1.2s infinite ease-in-out',
            border: '1px solid currentColor',
            content: '""',
        },
    }/*,
    '@keyframes ripple': {
        '0%': {
            transform: 'scale(.8)',
            opacity: 1,
        },
        '100%': {
            transform: 'scale(2.4)',
            opacity: 0,
        },
    }*/
}));

const UserAvatarBadge = (props: User) => {
    const badgeClasses = useBadgeStyles();

    return <Badge classes={{
        badge: props.status === ConversationStore.UserStatus.Online
            ? badgeClasses.badgeOnline
            : badgeClasses.badgeOffline
    }}
        overlap="circle"
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
        }}
        variant="dot">
        <UserAvatar userName={props.userName} />
    </Badge>;
};

export default UserAvatarBadge;