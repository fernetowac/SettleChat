import React from 'react'
import { useSelector } from 'react-redux'
import { leftPanelContentPop } from '../store/ui'
import { Box, Typography, IconButton, TextField, InputAdornment, Chip } from '@material-ui/core'
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import SearchIcon from '@material-ui/icons/Search';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import * as Sentry from "@sentry/react";
import CreateInvitationPanel from './CreateInvitationPanel';
import Users from './Users';
import ErrorBoundaryFallback from './ErrorBoundaryFallback';
import { useAppDispatch } from '../'
import { selectUsersByConversationId } from '../store/users'
import { ApplicationState } from '../store';
import { addUserToConversation } from '../store/common'

export const LeftPanelInvitation = ({ conversationId }: { conversationId: string }) => {
    const dispatch = useAppDispatch()
    const [filterUserName, setFilterUserName] = React.useState('')
    const usersOfConversation = useSelector((state: ApplicationState) => selectUsersByConversationId(state, { conversationId }))

    const onAddUser = (userId: string, name: string) => {
        dispatch(addUserToConversation({ conversationId, userId }))
    }

    return <>
        <Box>
            <IconButton style={{ marginLeft: 'auto' }} onClick={() => dispatch(leftPanelContentPop())}>
                <ArrowBackIcon />
            </IconButton>
            <Typography>Conversation invite </Typography>
        </Box>
        <Box style={{ overflowY: 'auto' }}>
            <Box marginBottom={2} padding={2} style={{ backgroundColor: '#fff' }}>
                <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                    <CreateInvitationPanel conversationId={conversationId} />
                </Sentry.ErrorBoundary>
            </Box>
            <Box marginBottom={2} padding={2} style={{ backgroundColor: '#fff' }}>
                <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                    <Users conversationId={conversationId} />
                    <TextField
                        label="Find user"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            )
                        }}
                        fullWidth
                        margin="dense"
                        variant="outlined"
                        value={filterUserName}
                        onChange={(e) => { setFilterUserName(e.target.value) }}
                    />
                    <Users
                        userNameFilter={filterUserName}
                        listItemSecondaryActionContent={<IconButton edge="end" aria-label="delete"><PersonAddIcon /></IconButton>}
                        listItemSecondaryActionHandler={onAddUser}
                        excludedUserIds={usersOfConversation.map(x => x.id)}
                    />
                </Sentry.ErrorBoundary>
            </Box>
        </Box>
    </>
}