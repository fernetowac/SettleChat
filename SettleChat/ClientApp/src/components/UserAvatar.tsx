import * as React from 'react'
import { Avatar } from '@material-ui/core'

interface UserAvatarProps {
    userName: string
}

class UserAvatar extends React.PureComponent<UserAvatarProps> {
    private getInitials = (fullName: string): string => {
        const names = fullName.split(' ').filter((x) => x)
        if (!names.length) {
            throw new Error('Empty name')
        }
        let initials = names[0].substring(0, 1).toUpperCase()

        if (names.length > 1) {
            initials += names[names.length - 1].substring(0, 1).toUpperCase()
        }
        return initials
    }

    render() {
        const { userName, ...otherProps } = this.props
        return (
            <Avatar {...otherProps} alt={userName}>
                {this.getInitials(userName)}
            </Avatar>
        )
    }
}

export default UserAvatar
