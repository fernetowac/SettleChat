import * as React from 'react';
import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { ApplicationState } from '../store/index';
import * as  ConversationStore from "../store/Conversation";
import { Switch, FormControl, FormLabel, FormGroup, FormControlLabel, FormHelperText, IconButton, TextField, Box } from '@material-ui/core';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@material-ui/icons';

type ConversationDetailsState = {
    conversation: ConversationStore.ConversationDetail | null,
    isLoading: boolean,
};
type ConversationDetailProps = ConversationDetailsState & MapDispatchToPropsType;

const ConversationDetail = (props: ConversationDetailProps) => {
    const [isPublicDisabled, setIsPublicDisabled] = React.useState(false);
    const [isTitleDisabled, setIsTitleDisabled] = React.useState(false);
    const [isTitleEditing, setIsTitleEditing] = React.useState(false);
    const [inputTitle, setInputTitle] = React.useState<string | null>(props.conversation !== null ? props.conversation.title : null);
    const [inputTitleHasError, setInputTitleHasError] = React.useState(false);
    const inputTitleRef = React.useRef<HTMLInputElement>(null);

    const handleIsPublicChange = (event: React.ChangeEvent<{}>, checked: boolean): void => {
        if (!props.conversation) {
            return;
        }
        setIsPublicDisabled(true);
        props.actions.patchConversation(props.conversation.id, { isPublic: checked })
            .finally(() => setIsPublicDisabled(false));
    }

    const onTitleEditClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
        setIsTitleEditing(true);
    }

    const isValidInputTitle = (inputTitle: string | null): boolean => {
        return inputTitle !== null && /^.{3,200}$/.test(inputTitle);
    }

    const handleSaveInputTitle = () => {
        if (!props.conversation || inputTitle === null) {
            return;
        }

        if (!isValidInputTitle(inputTitle)) {
            setInputTitleHasError(true);
        }

        setIsTitleDisabled(true);
        props.actions
            .patchConversation(props.conversation.id, { title: inputTitle })
            .then(() => {
                setIsTitleEditing(false);
                setInputTitleHasError(false);
            })
            .catch(() => setInputTitleHasError(true))
            .finally(() => setIsTitleDisabled(false));
    }

    const handleCancelInputTitle = (): void => {
        if (!props.conversation) {
            return;
        }
        setInputTitle(props.conversation.title);
        setInputTitleHasError(false);
        setIsTitleDisabled(false);
        setIsTitleEditing(false);
    }

    const onTitleSaveClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
        handleSaveInputTitle();
    }

    const onInputTitleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setInputTitle(event.target.value);
    }

    const onInputTitleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (props.conversation === null) {
            return;
        }

        // ENTER
        if (e.keyCode === 13) {
            handleSaveInputTitle();
        }
        // ESC
        else if (e.keyCode === 27) {
            handleCancelInputTitle();
        }
    }

    const onInputTitleCancelClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
        handleCancelInputTitle();
    }

    React.useEffect(() => {
        if (props.conversation) {
            setInputTitle(props.conversation.title);
        }
    }, [props.conversation]);

    React.useEffect(() => {
        if (isTitleEditing && inputTitleRef && inputTitleRef.current) {
            inputTitleRef.current.focus();
        }
    }, [isTitleEditing, inputTitleRef]);

    if (props.isLoading) {
        return <p>loading..</p>;
    }
    else if (!props.conversation) {
        return <p>No conversation details loaded..</p>;
    } else {
        return <React.Fragment>
            <h1>{isTitleEditing ?
                <Box display="flex">
                    <Box flexGrow={1}>
                        <TextField
                            type="text"
                            placeholder="Title"
                            disabled={isTitleDisabled}
                            value={inputTitle}
                            inputProps={{ 'aria-label': 'Conversation title' }}
                            label="Conversation title"
                            fullWidth
                            required
                            inputRef={inputTitleRef}
                            onChange={onInputTitleChange}
                            error={inputTitleHasError}
                            onKeyDown={onInputTitleKeyDown}
                        />
                    </Box>
                    <IconButton aria-label="edit" size="small" onClick={onTitleSaveClick}>
                        <SaveIcon />
                    </IconButton>
                    <IconButton aria-label="cancel" size="small" onClick={onInputTitleCancelClick}>
                        <CancelIcon />
                    </IconButton>
                </Box>
                :
                <React.Fragment>
                    {props.conversation.title}
                    <IconButton aria-label="edit" size="small" onClick={onTitleEditClick}>
                        <EditIcon />
                    </IconButton>
                </React.Fragment>
            }
            </h1>
            <FormControl component="fieldset">
                <FormLabel component="legend">Conversation details</FormLabel>
                <FormGroup>
                    <FormControlLabel
                        control={<Switch checked={props.conversation.isPublic} onChange={handleIsPublicChange} disabled={isPublicDisabled} name="isPublic" />}
                        label="Public (anyone can join)" />
                </FormGroup>
                <FormHelperText>Changes are saved immediately</FormHelperText>
            </FormControl>
        </React.Fragment>;
    }
}

const mapStateToProps = (state: ApplicationState): ConversationDetailsState => {
    if (!state || !state.conversation) {
        return {
            conversation: null,
            isLoading: false
        };
    }
    return {
        conversation: state && state.conversation ? state.conversation.conversation : null,
        isLoading: state && state.conversation.ui.isConversationLoading
    }
};

type MapDispatchToPropsType = {
    actions: {
        patchConversation: (conversationId: string, updatedProperties: ConversationStore.ConversationPatch) => Promise<ConversationStore.ConversationDetail>;
    }
};
const mapDispatchToProps = (dispatch: ThunkDispatch<ApplicationState, undefined, ConversationStore.KnownAction>): MapDispatchToPropsType => ({
    actions: {
        patchConversation: (conversationId: string, updatedProperties: ConversationStore.ConversationPatch) => dispatch(ConversationStore.actionCreators.patchConversation(conversationId, updatedProperties))
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ConversationDetail as any);
