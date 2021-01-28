import * as React from 'react';
import { Button, Typography } from '@material-ui/core';

interface InvitationAcceptanceAccountProps {
    isAuthenticated: boolean;
    userName: string | null;
    signIn: () => void;
    handleCreateAccountButtonOnClick: () => void;
}

export const InvitationAcceptanceAccount = (props: InvitationAcceptanceAccountProps) => {
    if (props.isAuthenticated) {
        return <p>
            You're signed in as <b>{props.userName}</b>.
                Feel free to continue with the next step.
                However, if you'd like to switch account, it's the right moment.
            </p>
    }
    return <div>
        <Typography variant="body1" gutterBottom>
            Please <Button variant="contained" onClick={() => props.signIn()}>log in</Button> or <Button variant="contained" onClick={props.handleCreateAccountButtonOnClick}>register</Button>.
                </Typography>
        <Typography variant="body2" gutterBottom>
            It takes just a minute. You can also skip this step and an anonymous one-time account will be created automatically.
            </Typography>
    </div>
}