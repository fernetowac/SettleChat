import React from 'react'
import { unwrapResult } from '@reduxjs/toolkit'
import { leftPanelContentPush, leftPanelContentPop, ContentType } from '../store/ui'
import { Box, Typography, IconButton } from '@material-ui/core'
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import MenuIcon from '@material-ui/icons/Menu'
import * as Sentry from "@sentry/react";
import Conversations from './Conversations';
import ErrorBoundaryFallback from './ErrorBoundaryFallback';
import { useAppDispatch } from '../'
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { addConversation } from '../store/conversationDetails'
import { push } from 'connected-react-router';

export const LeftPanelConversations = ({ currentConversationId, closable = false }: { currentConversationId: string, closable?: boolean }) => {
    const dispatch = useAppDispatch()
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const leftPanelContentPushInvitation = () =>
        dispatch(leftPanelContentPush({
            type: ContentType.Invitation,
            payload: {
                conversationId: currentConversationId
            }
        }))

    const leftPanelContentPushGroupCreation = () =>
        dispatch(addConversation({}))
            .then(unwrapResult)
            .then((conversationMeta) => dispatch(push(`/conversation/${conversationMeta.conversation.id}`)))
            .then(() => dispatch(leftPanelContentPush({ type: ContentType.GroupCreation })))

    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const mainMenu = <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
    >
        <MenuItem onClick={() => { handleMenuClose(); leftPanelContentPushGroupCreation() }}>New conversation</MenuItem>
        <MenuItem onClick={handleMenuClose}>blabla</MenuItem>
        <MenuItem onClick={handleMenuClose}>bla</MenuItem>
    </Menu>

    return <>
        {mainMenu}
        <Box style={{ display: 'flex', alignItems: 'center' }}>
            {
                closable &&
                <IconButton onClick={() => dispatch(leftPanelContentPop())}>
                    <ArrowBackIcon />
                </IconButton>
            }
            <Typography>Conversations</Typography>
            <IconButton style={{ marginLeft: 'auto' }} onClick={leftPanelContentPushInvitation}><PersonAddIcon /></IconButton>
            <IconButton onClick={handleMenuClick}><MenuIcon /></IconButton>
        </Box>
        <Box style={{ display: 'flex', overflowY: 'hidden' }}>
            <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                <Conversations />
            </Sentry.ErrorBoundary>
        </Box>
    </>
}