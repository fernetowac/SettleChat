import * as React from 'react'
import { List, ListItem, ListItemAvatar, ListItemText, Typography } from '@material-ui/core'
import UserAvatar from './UserAvatar'
import { Invitation } from '../types/invitationTypes'

export const InvitationAcceptanceDetail = (props: { invitation: Invitation }) => {
    return (
        <React.Fragment>
            <Typography variant="body1" gutterBottom>
                Great, <strong>{props.invitation.invitedByUserName}</strong> has invited you to
                conversation <strong>{props.invitation.conversationTitle}</strong>
            </Typography>
            <Typography variant="h2">Members:</Typography>
            <List>
                {props.invitation.conversationUsers.map((user, index) => (
                    <ListItem alignItems="flex-start" key={index}>
                        <ListItemAvatar>
                            <UserAvatar userName={user.nickname} />
                        </ListItemAvatar>
                        <ListItemText
                            primary={user.nickname}
                            primaryTypographyProps={{ noWrap: true }}
                        />
                    </ListItem>
                ))}
            </List>
        </React.Fragment>
    )
}
