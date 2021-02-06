import * as React from 'react';
import { TextField, InputAdornment, makeStyles, createStyles, Typography } from '@material-ui/core';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import { ValidationError } from '../types/commonTypes';
import { nicknameValidationKey } from '../types/invitationAcceptanceTypes';

const useStyles = makeStyles(() =>
    createStyles({
        form: {
            marginTop: 20,
            marginBottom: 20
        },
        nicknameTextField: {
            width: 300,
        }
    }),
);

interface InvitationAcceptanceSettingProps {
    nickname: string | null;
    handleNext: () => void;
    handleNicknameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    validationErrors: ValidationError[];
}

export const InvitationAcceptanceSetting = (props: InvitationAcceptanceSettingProps) => {
    const classes = useStyles();
    const nicknameValidationErrors = props.validationErrors
        .filter(validationError => validationError.key === nicknameValidationKey)
        .map((validationError) => validationError.errorMessage)

    return <>
        <Typography gutterBottom>
            Almost done. This will be your nick name in the conversation. You can change it also later.
        </Typography>
        <form
            onSubmit={(e) => { e.preventDefault(); props.handleNext(); }}
            className={classes.form}>
            <TextField
                variant="outlined"
                value={props.nickname}
                label="Name in conversation (nickname)"
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <AccountCircleIcon />
                        </InputAdornment>)
                }}
                onChange={props.handleNicknameChange}
                onKeyPress={
                    (event) => {
                        if (event.keyCode === 13) {
                            props.handleNext()
                        }
                    }}
                className={classes.nicknameTextField}
                error={nicknameValidationErrors.length > 0}
                helperText={nicknameValidationErrors.length > 0 ? nicknameValidationErrors[0] : null}
            />
        </form>
    </>
}