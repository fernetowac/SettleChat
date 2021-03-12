import { leftPanelContentPop } from '../store/ui'
import { Box, Typography, IconButton } from '@material-ui/core'
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import * as Sentry from "@sentry/react";
import CreateInvitationPanel from './CreateInvitationPanel';
import Users from './Users';
import ErrorBoundaryFallback from './ErrorBoundaryFallback';
import { useAppDispatch } from '../'

export const LeftPanelInvitation = ({ conversationId }: { conversationId: string }) => {
    const dispatch = useAppDispatch()

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
                </Sentry.ErrorBoundary>
            </Box>
        </Box>
    </>
}