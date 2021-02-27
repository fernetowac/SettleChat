import * as React from 'react';
import { connect } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { ApplicationState } from '../store/index';
import { Divider, InputAdornment, List, Box, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Button, Checkbox, FormControl, FormControlLabel, TextField } from '@material-ui/core';
import { Invitation, NewInvitation } from '../types/invitationTypes'
import { createInvitation, requestInvitations } from '../thunks/invitationThunks'
import LinkIcon from '@material-ui/icons/Link';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import { NotificationAddActionInput } from '../types/notificationActionTypes'
import { AppDispatch } from '../'
import { notificationsActions } from '../reducers/notificationsReducer'
import { Ascending } from '../helpers/sortHelper'

type CreateInvitationPanelProps = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>

function CreateInvitationPanel(props: CreateInvitationPanelProps) {
    const [isPermanent, setIsPermanent] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(true);
    const { conversationId } = props;
    const { requestInvitations, addNotification } = props.actions;

    const handleAddInvitationSubmit = (evt: React.MouseEvent<HTMLButtonElement>) => {
        props.actions.createInvitation({ conversationId: conversationId, isPermanent: isPermanent });
    };

    const handleIsPermanentChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setIsPermanent(evt.target.checked);
    };

    const handleOnCopyLink = (link: string) => {
        navigator.clipboard.writeText(link)
        addNotification("Coppied to clipboard");
    }

    const buildTokenLink = (token: string): string => `${window.location.origin}/invitation/${token}`

    React.useEffect(() => {
        let isMounted = true;
        requestInvitations(conversationId)
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [requestInvitations, conversationId]);

    return (
        <div>
            <FormControl component="fieldset">
                <FormControlLabel
                    control={<Checkbox checked={isPermanent} onChange={handleIsPermanentChange} name="isPermanent" />}
                    label="Unconstrained"
                />
                <Button color="primary" variant="contained" onClick={handleAddInvitationSubmit}>Create invitation</Button>
            </FormControl>
            <Box>
                {
                    isLoading ?
                        'Loading..' :
                        (props.invitations.length === 0 ? '' :
                            <List>
                                {
                                    props.invitations.map((invitation) => {
                                        const invitationLink = buildTokenLink(invitation.token);
                                        //TODO: inactive invitations should be displayed differently
                                        return <React.Fragment key={invitation.id}>
                                            <ListItem key={invitation.id} dense>
                                                <ListItemText
                                                    primary={
                                                        <TextField
                                                            label="Invitation link"
                                                            InputProps={{
                                                                readOnly: true,
                                                                startAdornment: (
                                                                    <InputAdornment position="start">
                                                                        <LinkIcon />
                                                                    </InputAdornment>
                                                                )
                                                            }}
                                                            fullWidth
                                                            margin="dense"
                                                            variant="outlined"
                                                            value={invitationLink}
                                                            onFocus={(evt) => evt.target.select()}
                                                        />
                                                    }
                                                />
                                                <ListItemSecondaryAction>
                                                    <IconButton edge="end" onClick={() => handleOnCopyLink(invitationLink)}>
                                                        <FileCopyIcon />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                            <Divider key={`${invitation.id}_divider`} variant="middle" component="li" />
                                        </React.Fragment>
                                    })
                                }
                            </List>
                        )
                }
            </Box>
        </div>
    );
}

const getInvitations = (state: ApplicationState, conversationId: string): Invitation[] =>
    state.conversation.invitations
        .filter(invitation => invitation.conversationId === conversationId)

const getSortedInvitations = (invitations: Invitation[]): Invitation[] => [...invitations].sort(Ascending.by(x => x.created));

/**
 * Memoized sorting of invitations
 */
const sortedInvitationsSelector = createSelector([getInvitations], getSortedInvitations);

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    actions: {
        requestInvitations: (conversationId: string) => dispatch(requestInvitations(conversationId)),
        createInvitation: (newInvitation: NewInvitation) => dispatch(createInvitation(newInvitation)),
        addNotification: (message: NotificationAddActionInput | string) => dispatch(notificationsActions.add(message))
    }
});

interface OwnProps {
    conversationId: string;
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps) => {
    return {
        invitations: sortedInvitationsSelector(state, ownProps.conversationId),
        conversationId: ownProps.conversationId
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(CreateInvitationPanel as any);