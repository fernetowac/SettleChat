import * as React from 'react';
import { Link } from "react-router-dom";
import { Backdrop, CircularProgress, makeStyles, createStyles, Theme, Stepper, Step, StepLabel, Button, Paper, Typography } from '@material-ui/core';
import { Invitation } from '../types/invitationTypes'
import { IdentityState } from '../store/Identity';
import { InvitationAcceptanceDetail } from './InvitationAcceptanceDetail'
import { InvitationAcceptanceAccount } from './InvitationAcceptanceAccount'
import { InvitationAcceptanceSetting } from './InvitationAcceptanceSetting'
import { ValidationError } from '../types/commonTypes'

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
        buttons: {
            '& > *': {
                margin: theme.spacing(1)
            }
        },
        instructions: {
            marginTop: theme.spacing(1),
            marginBottom: theme.spacing(1),
        },
        backdrop: {
            zIndex: theme.zIndex.drawer + 1,
            color: '#fff',
        }
    }),
);

interface InvitationAcceptanceProps {
    identity: IdentityState;
    handleNext: () => void;
    signIn: () => void;
    handleCreateAccountButtonOnClick: () => void;
    handleChangeAccountButtonOnClick: () => void;
    nickname: string | null;
    handleNicknameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    invitation: Invitation | undefined;
    displayLoading: boolean;
    activeStep: number;
    backButton: {
        url: string;
    };
    nextButton: {
        url: string
    };
    validationErrors: ValidationError[]
}

export const steps = ['Invitation details', 'Account', 'Final settings'];

export const InvitationAcceptance = (props: InvitationAcceptanceProps) => {
    const classes = useStyles();

    function getStepContent(activeStep: number, invitation: Invitation) {
        switch (activeStep) {
            case 0:
                return <InvitationAcceptanceDetail invitation={invitation} />;
            case 1:
                return <InvitationAcceptanceAccount
                    isAuthenticated={props.identity.isAuthenticated}
                    userName={props.identity.userName}
                    signIn={props.signIn}
                    handleCreateAccountButtonOnClick={props.handleCreateAccountButtonOnClick}
                />;
            case 2:
                return <InvitationAcceptanceSetting
                    nickname={props.nickname}
                    handleNext={props.handleNext}
                    handleNicknameChange={props.handleNicknameChange}
                    validationErrors={props.validationErrors}
                />;
            default:
                return 'Unknown step';
        }
    }

    return <div className={classes.root}>
        <Backdrop className={classes.backdrop} open={props.displayLoading}>
            <CircularProgress color="inherit" />
        </Backdrop>
        {
            props.invitation &&
            <Paper className={classes.paper} elevation={3}>
                <div className={classes.root} >
                    <Typography variant="h1" style={{ display: 'flex', justifyContent: 'center' }}>Invitation</Typography>
                    <Stepper activeStep={props.activeStep} alternativeLabel>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    <div>
                        {props.activeStep === steps.length ? (
                            <div>
                                <Typography className={classes.instructions}>Joining conversation. Please wait..</Typography>
                            </div>
                        ) : (
                                <div>
                                    <div className={classes.instructions}>{getStepContent(props.activeStep, props.invitation)}</div>
                                    <div className={classes.buttons}>
                                        <Link to={props.backButton.url}>
                                            <Button disabled={props.activeStep === 0}>Back</Button>
                                        </Link>
                                        {
                                            props.activeStep === 1 && props.identity.isAuthenticated &&
                                            <Button onClick={props.handleChangeAccountButtonOnClick}>
                                                switch account
                                            </Button>
                                        }
                                        <Link to={props.nextButton.url}>
                                            <Button variant="contained" color="primary">
                                                {props.activeStep === steps.length - 1 ? 'Join conversation' : 'Next'}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            </Paper>
        }
    </div>;
}