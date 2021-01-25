import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch, ThunkAction } from 'redux-thunk';
import { Backdrop, CircularProgress, TextField, InputAdornment, makeStyles, createStyles, Theme, Stepper, Step, StepLabel, Button, Paper, List, ListItem, ListItemAvatar, ListItemText, Typography } from '@material-ui/core';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import { Invitation } from '../types/invitationTypes'
import { ApplicationState } from '../store/index';
import { fetchGet, fetchPost } from '../services/FetchService'
import { transformInvitationResponse } from '../mappers/invitationMapper'
import SchemaKind from '../schemas/SchemaKind'
import * as HttpStatusActions from '../actions/HttpStatusActions';
import UserAvatar from './UserAvatar'
import { IdentityState } from '../store/Identity';
import authService from '../components/api-authorization/AuthorizeService'
import { ApplicationPaths, QueryParameterNames } from './api-authorization/ApiAuthorizationConstants'
import { useSnackbar } from 'notistack'
import { usePrevious } from '../hooks/usePrevious';
import { useIsMounted } from '../hooks/useIsMounted';

type InvitationPanelState = {
    identity: IdentityState;
    token: string;
    step: number;
}

type InvitationPanelProps = InvitationPanelState & MapDispatchToPropsType

const getInvitationByTokenAsync = (token: string, dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>): Promise<Invitation> => {
    const url = `/api/invitations/${token}`;
    return fetchGet<Invitation>(url, dispatch, false, transformInvitationResponse, SchemaKind.InvitationGetResponse);
}

const acceptInvitationAsync = (token: string, nickname: string, shouldCreateAnonymousUser: boolean): ThunkAction<Promise<Invitation>, ApplicationState, undefined, HttpStatusActions.HttpFailStatusReceivedAction> =>
    (dispatch, getState, extraArgument) => {
        const url = `/api/invitations/${token}`;
        return fetchPost<Invitation>(url, { nickname: nickname, shouldCreateAnonymousUser: shouldCreateAnonymousUser }, dispatch, true, transformInvitationResponse, SchemaKind.InvitationGetResponse)
    }

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            flexGrow: 1,
            overflow: 'auto'
        },
        paper: {
            padding: theme.spacing(2),
            margin: 'auto',
            maxWidth: 800
        },
        usersList: {},
        buttons: {
            '& > *': {
                margin: theme.spacing(1)
            }
        },
        instructions: {
            marginTop: theme.spacing(1),
            marginBottom: theme.spacing(1),
        },
        nicknameTextField: {
            width: 300
        },
        backdrop: {
            zIndex: theme.zIndex.drawer + 1,
            color: '#fff',
        }
    }),
);

const steps = ['Invitation details', 'Account', 'Final settings'];

const InvitationPanel = (props: InvitationPanelProps) => {
    const classes = useStyles();
    const { requestInvitationByToken, acceptInvitationAsync } = props.actions;
    const { token } = props;
    const { isAuthenticated } = props.identity;
    const [invitation, setInvitation] = React.useState<Invitation | undefined>();
    const [activeStep, setActiveStep] = React.useState(props.step);
    const previousStep = usePrevious(activeStep);
    const [isLoadingInvitation, setIsLoadingInvitation] = React.useState(true);
    const [isRedirecting, setIsRedirecting] = React.useState(false);
    const [isJoiningConversation, setIsJoiningConversation] = React.useState(false);
    const [nickname, setNickname] = React.useState<string | undefined>();
    const { enqueueSnackbar } = useSnackbar();
    const isMounted = useIsMounted();

    /**
     * Log off, then redirect to client-side log in (should be done automatically in iframe), then redirect back to invitation
     * */
    const handleChangeAccountButtonOnClick = () => {
        setIsRedirecting(true);
        // server-side identity server redirect must be to relative url
        // final url for displaying invitation
        const invitationReturnUrl = `${window.location.origin}/invitation/${token}/${activeStep}`
        // this url will handle client-side automatic log in
        const clientSideLoginReturnUrl = `${ApplicationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURI(invitationReturnUrl)}`;
        // handle log off
        authService.signOut({ returnUrl: clientSideLoginReturnUrl })
            .finally(() => {
                setIsRedirecting(false);
            });
    }

    const handleCreateAccountButtonOnClick = () => {
        setIsRedirecting(true);
        const invitationReturnUrl = `${window.location.origin}/invitation/${token}/${activeStep}`
        // server-side identity server redirect must be to relative url
        const loginReturnUrl = `${ApplicationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURI(invitationReturnUrl)}`;
        const registrationUrl = `${window.location.origin}${ApplicationPaths.IdentityRegisterPath}?${QueryParameterNames.ReturnUrl}=${encodeURI(loginReturnUrl)}`;
        // It's important that we do a replace here so that when the user hits the back arrow on the
        // browser he gets sent back to where it was on the app instead of to an endpoint on this
        // component.
        window.location.replace(registrationUrl);
    }

    const handleNext = () => {
        //TODO: some validation here
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNickname(event.target.value);
    };

    const signIn = () => {
        setIsRedirecting(true);
        authService.signIn({ returnUrl: `${window.location.origin}/invitation/${props.token}/${props.step}` })
            .finally(() => {
                setIsRedirecting(false);
            });
    }

    // initialize nickname after identity change
    React.useEffect(() => {
        setNickname((nickname) => nickname || props.identity.userName || '');
    }, [props.identity.userName]);

    React.useEffect(() => {
        let isMounted = true;
        requestInvitationByToken()
            .then(invitation => {
                if (isMounted) {
                    setInvitation(invitation);
                    setIsLoadingInvitation(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [requestInvitationByToken]);

    React.useEffect(() => {
        if (activeStep !== previousStep && activeStep === steps.length) {
            if (nickname === undefined) {
                throw new Error();
            }
            setIsJoiningConversation(true);
            acceptInvitationAsync(nickname, !isAuthenticated)
                .then(invitation => {
                    if (isMounted()) {
                        window.location.replace(`${window.location.origin}/conversation/${invitation.conversationId}`)
                    }
                })
                .catch((reason) => {
                    console.error('Accepting invitation failed', reason)
                    if (!isMounted()) {
                        return;
                    }
                    enqueueSnackbar('Something went wrong', { variant: "error" })
                    setIsJoiningConversation(false);
                    setActiveStep(activeStep - 1)
                });
        }
    }, [isMounted, activeStep, previousStep, steps, nickname, isAuthenticated, acceptInvitationAsync]);

    function getStepContent(stepIndex: number, invitation: Invitation) {
        switch (stepIndex) {
            case 0:
                return getStep1Content(invitation);
            case 1:
                return getStep2Content();
            case 2:
                return getStep3Content();
            default:
                return 'Unknown stepIndex';
        }
    }

    function getStep1Content(invitation: Invitation) {
        return <React.Fragment>
            <Typography variant="body1" gutterBottom>Great, <strong>{invitation.invitedByUserName}</strong> has invited you to conversation <strong>{invitation.conversationTitle}</strong></Typography>
            <Typography variant="h2">Members:</Typography>
            <List className={classes.usersList}>
                {
                    (invitation.conversationUserNames).map((userName, index, userNames) =>
                        <ListItem alignItems="flex-start" key={index}>
                            <ListItemAvatar>
                                <UserAvatar userName={userName} />
                            </ListItemAvatar>
                            <ListItemText
                                primary={userName}
                                primaryTypographyProps={{ noWrap: true }}
                            />
                        </ListItem>
                    )
                }
            </List>
        </React.Fragment>
    }

    function getStep2Content() {
        if (props.identity.isAuthenticated) {
            return <p>
                You're signed in as <b>{props.identity.userName}</b>.
                Feel free to continue with the next step.
                However, if you'd like to switch account, it's the right moment.
            </p>
        }
        return <div>
            <Typography variant="body1" gutterBottom>
                Please <Button variant="contained" onClick={() => signIn()}>log in</Button> or <Button variant="contained" onClick={handleCreateAccountButtonOnClick}>register</Button>.
                </Typography>
            <Typography variant="body2" gutterBottom>
                It takes just a minute. You can also skip this step and an anonymous one-time account will be created automatically.
            </Typography>
        </div>
    }

    function getStep3Content() {
        return <form onSubmit={() => handleNext()}>
            <TextField
                variant="outlined"
                value={nickname}
                label="Name in conversation (nickname)"
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <AccountCircleIcon />
                        </InputAdornment>)
                }}
                onChange={handleNicknameChange}
                onKeyPress={
                    (event) => {
                        if (event.keyCode === 13) {
                            handleNext()
                        }
                    }}
                className={classes.nicknameTextField}
            />
        </form>
    }

    return <div className={classes.root}>
        <Backdrop className={classes.backdrop} open={isLoadingInvitation || isRedirecting || isJoiningConversation}>
            <CircularProgress color="inherit" />
        </Backdrop>
        {
            invitation &&
            <Paper className={classes.paper} elevation={3}>
                <div className={classes.root} >
                    <Typography variant="h1" style={{ display: 'flex', justifyContent: 'center' }}>Invitation</Typography>
                    <Stepper activeStep={activeStep} alternativeLabel>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    <div>
                        {activeStep === steps.length ? (
                            <div>
                                <Typography className={classes.instructions}>Joining conversation. Please wait..</Typography>
                            </div>
                        ) : (
                                <div>
                                    <div className={classes.instructions}>{getStepContent(activeStep, invitation)}</div>
                                    <div className={classes.buttons}>
                                        <Button
                                            disabled={activeStep === 0}
                                            onClick={handleBack}
                                        >
                                            Back
                                    </Button>
                                        {
                                            activeStep === 1 && props.identity.isAuthenticated &&
                                            <Button
                                                variant="contained"
                                                onClick={handleChangeAccountButtonOnClick}
                                            >
                                                switch account
                                            </Button>
                                        }
                                        <Button variant="contained" color="primary" onClick={handleNext}>
                                            {activeStep === steps.length - 1 ? 'Join conversation' : 'Next'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            </Paper>
        }
    </div>;
}

type MapDispatchToPropsType = {
    actions: {
        requestInvitationByToken: () => Promise<Invitation>;
        acceptInvitationAsync: (nickname: string, shouldCreateAnonymousUser: boolean) => Promise<Invitation>;
    }
};

const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, HttpStatusActions.HttpFailStatusReceivedAction>, ownProps: OwnProps): MapDispatchToPropsType => ({
    actions: {
        requestInvitationByToken: () => getInvitationByTokenAsync(ownProps.token, dispatch),
        acceptInvitationAsync: (nickname: string, shouldCreateAnonymousUser: boolean) => dispatch(acceptInvitationAsync(ownProps.token, nickname, shouldCreateAnonymousUser))
    }
});

interface OwnProps {
    token: string;
    step: number;
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps): InvitationPanelState => {
    return {
        identity: state.identity,
        ...ownProps
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(InvitationPanel as any);