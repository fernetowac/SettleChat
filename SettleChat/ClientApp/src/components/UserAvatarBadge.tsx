import * as React from 'react'
import { UserStatus } from '../types/userTypes'
import UserAvatar from './UserAvatar'
import { makeStyles, Theme } from '@material-ui/core/styles'
import { Badge } from '@material-ui/core'
import clsx from 'clsx'

const useBadgeStyles = makeStyles((theme: Theme) => ({
    badge: {
        boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
        '&::after': {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            //animation: '$ripple 1.2s infinite ease-in-out',
            border: '1px solid currentColor',
            content: '""',
        },
    },
    badgeOnline: {
        backgroundColor: '#44b700',
        color: '#44b700',
    },
    badgeOffline: {
        backgroundColor: '#EF443A',
        color: '#EF443A',
    } /*,
    '@keyframes ripple': {
        '0%': {
            transform: 'scale(.8)',
            opacity: 1,
        },
        '100%': {
            transform: 'scale(2.4)',
            opacity: 0,
        },
    }*/,
}))

const UserAvatarBadge = React.memo((props: { name: string; status: UserStatus }) => {
    const badgeClasses = useBadgeStyles()

    return (
        <Badge
            classes={{
                badge: clsx(
                    badgeClasses.badge,
                    props.status === UserStatus.Online
                        ? badgeClasses.badgeOnline
                        : badgeClasses.badgeOffline
                ),
            }}
            overlap="circle"
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            variant="dot"
        >
            <UserAvatar userName={props.name} />
        </Badge>
    )
})

export default UserAvatarBadge
