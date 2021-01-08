import * as React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { ThunkDispatch } from 'redux-thunk';
import * as ConversationStore from "../store/Conversation";
import { ApplicationState } from '../store/index';
import { format } from 'date-fns'
import { List, Box, ListItem, ListItemText, Button, Checkbox, FormControl, FormControlLabel } from '@material-ui/core';
import { Form } from 'reactstrap';

type CreateInvitationPanelState = {
    invitations: ConversationStore.Invitation[];
    conversationId: string;
}
type CreateInvitationPanelProps = CreateInvitationPanelState & MapDispatchToPropsType;

function CreateInvitationPanel(props: CreateInvitationPanelProps) {
    const [isPermanent, setIsPermanent] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(true);
    const { conversationId } = props;
    const { requestInvitations } = props.actions;

    const handleAddInvitationSubmit = (evt: React.MouseEvent<HTMLButtonElement>) => {
        props.actions.createInvitation({ conversationId: conversationId, isPermanent: isPermanent });
    };

    const handleIsPermanentChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        setIsPermanent(evt.target.checked);
    };

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
        <React.Fragment>
            <FormControl component="fieldset">
                <FormControlLabel
                    control={<Checkbox checked={isPermanent} onChange={handleIsPermanentChange} name="isPermanent" />}
                    label="Unconstrained"
                />
                <Button color="primary" onClick={handleAddInvitationSubmit}>Create invitation</Button>
            </FormControl>
            <Box>
                {
                    isLoading ?
                        'Loading..' :
                        (props.invitations.length === 0 ? '' :
                            <List>
                                {props.invitations.map(item =>
                                    <ListItem key={item.id} dense>
                                        <ListItemText
                                            primary={item.token}
                                            secondary={format(item.created, 'PPP')}
                                        />
                                    </ListItem>
                                )}
                            </List>
                        )
                }
            </Box>
        </React.Fragment>
    );
}

const compareByCreatedAsc = (a: { created: Date }, b: { created: Date }): number => {
    if (a.created < b.created) {
        return -1;
    }
    else if (a.created > b.created) {
        return 1;
    }
    return 0;
}

const getInvitations = (state: ApplicationState, conversationId: string): ConversationStore.Invitation[] => (
    state.conversation === undefined ?
        undefined :
        state.conversation.invitations
            .filter(invitation => invitation.conversationId === conversationId)
) || [];
const getSortedInvitations = (invitations: ConversationStore.Invitation[]): ConversationStore.Invitation[] => invitations.sort(compareByCreatedAsc);

/**
 * Memoized sorting of invitations
 */
const sortedInvitationsSelector = createSelector([getInvitations], getSortedInvitations);

type MapDispatchToPropsType = {
    actions: {
        requestInvitations: (conversationId: string) => Promise<ConversationStore.Invitation[]>;
        createInvitation: (newInvitation: ConversationStore.NewInvitation) => Promise<ConversationStore.Invitation>;
    }
};
const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationStore.KnownAction>): MapDispatchToPropsType => ({
    actions: {
        requestInvitations: (conversationId: string) => dispatch(ConversationStore.actionCreators.requestInvitations(conversationId)),
        createInvitation: (newInvitation: ConversationStore.NewInvitation) => dispatch(ConversationStore.actionCreators.createInvitation(newInvitation))
    }
});

interface OwnProps {
    conversationId: string;
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps): CreateInvitationPanelState => {
    return {
        invitations: sortedInvitationsSelector(state, ownProps.conversationId),
        conversationId: ownProps.conversationId
    } as CreateInvitationPanelState;
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(CreateInvitationPanel as any);