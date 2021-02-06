import * as React from 'react';
import { useHistory, useRouteMatch, generatePath, Redirect } from "react-router-dom";
import { connect } from 'react-redux';
import { ThunkDispatch, ThunkAction } from 'redux-thunk';
import { Invitation } from '../types/invitationTypes'
import { ApplicationState } from '../store/index';
import { fetchGet, fetchPost, ProblemDetails } from '../services/FetchService'
import { transformInvitationResponse } from '../mappers/invitationMapper'
import SchemaKind from '../schemas/SchemaKind'
import * as HttpStatusActions from '../actions/HttpStatusActions';
import { IdentityState } from '../store/Identity';
import authService from '../components/api-authorization/AuthorizeService'
import { ApplicationPaths, QueryParameterNames } from './api-authorization/ApiAuthorizationConstants'
import { useSnackbar } from 'notistack'
import { usePrevious } from '../hooks/usePrevious';
import { useIsMounted } from '../hooks/useIsMounted';
import { InvitationAcceptance, steps } from './InvitationAcceptance'
import { ValidationError } from '../types/commonTypes'
import { nicknameValidationKey } from '../types/invitationAcceptanceTypes'
import { isDevelopment } from '../helpers/development/DevDetect'
import { Button } from '@material-ui/core'

interface InvitationAcceptanceContainerPropsData {
    identity: IdentityState;
    token: string;
    step: number;
}

interface InvitationAcceptanceContainerPropsActions {
    actions: {
        requestInvitationByToken: () => Promise<Invitation>;
        acceptInvitationAsync: (nickname: string, shouldCreateAnonymousUser: boolean) => Promise<Invitation>;
    }
};

type InvitationAcceptanceContainerProps = InvitationAcceptanceContainerPropsData & InvitationAcceptanceContainerPropsActions

interface OwnProps {
    token: string;
    step: number;
}

const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, HttpStatusActions.HttpFailStatusReceivedAction>, ownProps: OwnProps): InvitationAcceptanceContainerPropsActions => ({
    actions: {
        requestInvitationByToken: () => getInvitationByTokenAsync(ownProps.token, dispatch),
        acceptInvitationAsync: (nickname: string, shouldCreateAnonymousUser: boolean) => dispatch(acceptInvitationAsync(ownProps.token, nickname, shouldCreateAnonymousUser))
    }
});

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps): InvitationAcceptanceContainerPropsData => {
    return {
        identity: state.identity,
        ...ownProps
    }
}

const getInvitationByTokenAsync = (token: string, dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>): Promise<Invitation> => {
    const url = `/api/invitations/${token}`;
    return fetchGet<Invitation>(url, dispatch, false, transformInvitationResponse, SchemaKind.InvitationGetResponse);
}

const acceptInvitationAsync = (token: string, nickname: string, shouldCreateAnonymousUser: boolean): ThunkAction<Promise<Invitation>, ApplicationState, undefined, HttpStatusActions.HttpFailStatusReceivedAction> =>
    (dispatch) => {
        const url = `/api/invitations/${token}`;
        return fetchPost<Invitation>(url, { nickname: nickname, shouldCreateAnonymousUser: shouldCreateAnonymousUser }, dispatch, true, transformInvitationResponse, SchemaKind.InvitationGetResponse)
    }

const parseErrors = (response: ProblemDetails): string[] => {
    const problemDetails = response as ProblemDetails;
    const genericErrorMessage = "Ooops. Something went wrong."

    if (problemDetails.status === 500) {
        if (isDevelopment && problemDetails.title) {
            return [problemDetails.title]
        }
        else {
            return [genericErrorMessage]
        }
    }

    if (problemDetails.errors) {
        const errors: string[] = [];
        const errorKeys = Object.keys(problemDetails.errors);
        for (let i = 0; i < errorKeys.length; i++) {
            const errorValue = problemDetails.errors[errorKeys[i]];
            if (Array.isArray(errorValue)) {
                for (let j = 0; j < errorValue.length; j++) {
                    errors.push(errorValue[j])
                }
            }
            else {
                errors.push(errorValue)
            }
        }
        if (errors.length > 0) {
            return errors;
        }
    }

    if (problemDetails.detail) {
        return [problemDetails.detail]
    }
    if (problemDetails.title) {
        return [problemDetails.title]
    }
    return [genericErrorMessage]
}

const problemDetailsToSnackbar = (problemDetails: ProblemDetails, enqueueSnackbar: (message: string | React.ReactNode, options?: any) => any, closeSnackbar: any) => {
    const errorMessages = parseErrors(problemDetails)
    if (errorMessages.length > 0) {
        enqueueSnackbar(
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {
                    errorMessages.map((errorMessage, index) => <div key={index}>{errorMessage}</div>)
                }
            </div>,
            {
                key: new Date().getTime() + Math.random(),
                variant: 'error',
                persist: true,
                action: (key: number) => (
                    <Button onClick={() => closeSnackbar(key)}>dismiss me</Button>
                )
            }
        )
    }
}

const InvitationPanel = (props: InvitationAcceptanceContainerProps) => {
    const { requestInvitationByToken, acceptInvitationAsync } = props.actions;
    const { isAuthenticated } = props.identity;
    const [invitation, setInvitation] = React.useState<Invitation | undefined>();
    const [redirectTo, setRedirectTo] = React.useState<string | null>(null);
    const activeStep = props.step;
    const previousStep = usePrevious(activeStep);
    const [isLoadingInvitation, setIsLoadingInvitation] = React.useState(true);
    const [isRedirecting, setIsRedirecting] = React.useState(false);
    const [isJoiningConversation, setIsJoiningConversation] = React.useState(false);
    const [nickname, setNickname] = React.useState<string | null>(props.identity.userName);
    const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const isMounted = useIsMounted();
    const match = useRouteMatch();
    const history = useHistory();

    /**
     * Log off, then redirect to client-side log in (should be done automatically in iframe), then redirect back to invitation
     * */
    const handleChangeAccountButtonOnClick = () => {
        setIsRedirecting(true);
        // server-side identity server redirect must be to relative url
        // final url for displaying invitation
        const invitationReturnUrl = window.location.href
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
        const invitationReturnUrl = window.location.href
        // server-side identity server redirect must be to relative url
        const loginReturnUrl = `${ApplicationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURI(invitationReturnUrl)}`;
        const registrationUrl = `${window.location.origin}${ApplicationPaths.IdentityRegisterPath}?${QueryParameterNames.ReturnUrl}=${encodeURI(loginReturnUrl)}`;
        // It's important that we do a replace here so that when the user hits the back arrow on the
        // browser he gets sent back to where it was on the app instead of to an endpoint on this
        // component.
        window.location.replace(registrationUrl);
    }

    const handleNext = () => {
        const url = getUrlForStep(activeStep + 1)
        history.push(url);
    };

    const getUrlForStep = (stepNumber: number) => generatePath((match && match.path || ''), { token: props.token, step: stepNumber })

    const getSanitizedNickname = (nickname: string | null) => (nickname || '').trim()

    const getNicknameValidationErrors = () => {
        let errors = []
        const sanitizedNickname = getSanitizedNickname(nickname)
        if (sanitizedNickname.length === 0) {
            errors.push('Required.')
        }
        if (sanitizedNickname.length < 3) {
            errors.push('Too short.')
        }
        if (sanitizedNickname.length > 100) {
            errors.push('Too long.')
        }
        if (!/^[0-9a-zA-Z\xC0-\uFFFF _]*$/.test(sanitizedNickname)) {
            errors.push('Invalid characters used')
        }
        return errors;
    }

    const getValidationErrors = () => {
        let validationErrors: ValidationError[] = []
        if (activeStep > 2) {
            // add nickname errors
            getNicknameValidationErrors()
                .forEach((nicknameErrorMessage) =>
                    validationErrors.push({
                        key: nicknameValidationKey,
                        errorMessage: nicknameErrorMessage
                    })
                )
        }
        return validationErrors;
    }

    const handleNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNickname(event.target.value);
    };

    const signIn = () => {
        setIsRedirecting(true);
        authService.signIn({ returnUrl: window.location.href })
            .finally(() => {
                setIsRedirecting(false);
            });
    }

    // initialize nickname after identity change
    React.useEffect(() => {
        setNickname((nickname) => nickname || props.identity.userName || '');
    }, [props.identity.userName]);

    // retrieve invitation by token
    React.useEffect(() => {
        let isMounted = true;
        requestInvitationByToken()
            .then(invitation => {
                if (isMounted) {
                    setInvitation(invitation);
                }
            })
            .catch((problemDetails) => problemDetailsToSnackbar(problemDetails, enqueueSnackbar, closeSnackbar))
            .finally(() =>
                setIsLoadingInvitation(false)
            );

        return () => {
            isMounted = false;
        };
    }, [requestInvitationByToken]);

    // remove redirection url from state after redirected in render
    // must be declared before useEffect that sets redirectTo
    React.useEffect(() => {
        if (redirectTo !== null) {
            setRedirectTo(null)
        }
    }, [redirectTo]);

    React.useEffect(() => {
        if (activeStep !== previousStep && activeStep === steps.length) {
            const redirectToPreviousStepUrl = generatePath((match && match.path || ''), { token: props.token, step: previousStep })
            const sanitizedNickname = getSanitizedNickname(nickname)
            const allValidationErrors = getValidationErrors()
            setValidationErrors(allValidationErrors)
            if (allValidationErrors.length > 0) {
                enqueueSnackbar('Please check for validation errors')
                setRedirectTo(redirectToPreviousStepUrl);
            }
            else {
                setIsJoiningConversation(true);
                acceptInvitationAsync(sanitizedNickname, !isAuthenticated)
                    .then(invitation => {
                        if (isMounted()) {
                            window.location.replace(`${window.location.origin}/conversation/${invitation.conversationId}`)
                        }
                    })
                    .catch((problemDetails) => {
                        problemDetailsToSnackbar(problemDetails, enqueueSnackbar, closeSnackbar);
                        if (!isMounted()) {
                            return;
                        }
                        setIsJoiningConversation(false);
                        setRedirectTo(redirectToPreviousStepUrl);
                    });
            }
        }
    }, [isMounted, activeStep, previousStep, nickname, isAuthenticated, acceptInvitationAsync, enqueueSnackbar, closeSnackbar]);

    // redirect if asked for
    if (redirectTo !== null) {
        return <Redirect to={redirectTo} />
    }

    // redirect to initial step if activeStep is negative (can happen after manual url manipulation)
    if (activeStep < 0) {
        const url = getUrlForStep(0)
        return <Redirect to={url} />
    }

    // redirect to last step before invitation acceptance if activeStep is too big (can happen after manual url manipulation)
    if (activeStep > steps.length) {
        const url = getUrlForStep(steps.length - 1)
        return <Redirect to={url} />
    }

    // redirect to previous step if validation fails
    if (!getValidationErrors() && activeStep > 0) {
        const url = getUrlForStep(activeStep - 1)
        return <Redirect to={url} />
    }

    return <InvitationAcceptance
        identity={props.identity}
        handleNext={handleNext}
        signIn={signIn}
        handleCreateAccountButtonOnClick={handleCreateAccountButtonOnClick}
        handleChangeAccountButtonOnClick={handleChangeAccountButtonOnClick}
        nickname={nickname}
        handleNicknameChange={handleNicknameChange}
        invitation={invitation}
        displayLoading={isLoadingInvitation || isRedirecting || isJoiningConversation}
        activeStep={activeStep}
        backButton={
            {
                url: generatePath((match && match.path || ''), { token: props.token, step: activeStep - 1 })
            }
        }
        nextButton={
            {
                url: generatePath((match && match.path || ''), { token: props.token, step: activeStep + 1 })
            }
        }
        validationErrors={validationErrors}
    />
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(InvitationPanel as any);