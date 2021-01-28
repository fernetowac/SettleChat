import * as React from 'react';
import { TextField, InputAdornment, makeStyles, createStyles } from '@material-ui/core';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import { ValidationError } from '../types/commonTypes';
import { nicknameValidationKey } from '../types/invitationAcceptanceTypes';

const useStyles = makeStyles(() =>
    createStyles({
        nicknameTextField: {
            width: 300
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

    return <form onSubmit={(e) => { e.preventDefault(); props.handleNext(); }}>
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
}