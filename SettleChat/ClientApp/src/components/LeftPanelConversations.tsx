import { leftPanelContentPush, leftPanelContentPop, ContentType } from '../store/ui'
import { Box, Typography, IconButton } from '@material-ui/core'
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import * as Sentry from "@sentry/react";
import Conversations from './Conversations';
import ErrorBoundaryFallback from './ErrorBoundaryFallback';
import { useAppDispatch } from '../'

export const LeftPanelConversations = ({ currentConversationId, closable = false }: { currentConversationId: string, closable?: boolean }) => {
    const dispatch = useAppDispatch()

    const leftPanelContentPushInvitation = () =>
        dispatch(leftPanelContentPush({
            type: ContentType.Invitation,
            payload: {
                conversationId: currentConversationId
            }
        }))

    return <>
        <Box style={{ display: 'flex', alignItems: 'center' }}>
            {
                closable &&
                <IconButton onClick={() => dispatch(leftPanelContentPop())}>
                    <ArrowBackIcon />
                </IconButton>
            }
            <Typography>Conversations</Typography>
            <IconButton style={{ marginLeft: 'auto' }} onClick={leftPanelContentPushInvitation}><PersonAddIcon /></IconButton>
        </Box>
        <Box style={{ display: 'flex', overflowY: 'hidden' }}>
            <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                <Conversations />
            </Sentry.ErrorBoundary>
        </Box>
    </>
}