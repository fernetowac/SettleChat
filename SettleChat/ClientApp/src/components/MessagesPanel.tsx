import MessagesContainer from './MessagesContainer'
import MessageInput from './MessageInput'
import OthersWritingActivity from './OthersWritingActivity'
import ConversationDetail from './ConversationDetail'
import { Box, IconButton, Grid, Hidden } from '@material-ui/core'
import PersonAddIcon from '@material-ui/icons/PersonAdd'
import SlidingStackContainer from './SlidingStackContainer'
import { LeftPanelConversations } from './LeftPanelConversations'

const MessagesPanel = ({
    conversationId,
    slideInLeftPanelConversations,
}: {
    conversationId: string
    slideInLeftPanelConversations: () => void
}) => {
    return (
        <Grid
            container
            direction="row"
            style={{
                minHeight: 0,
                flexWrap: 'initial',
                flexGrow: 1,
                maxWidth: 1400,
                border: 'solid',
                borderWidth: 1,
                borderColor: 'black',
                alignSelf: 'center',
                position:
                    'relative' /* needed for SlidingStackContainer (when in xs screen size) which sets its dimensions based on its first relative parent */,
            }}
        >
            <Hidden xsDown={true}>
                <Grid
                    item
                    xs={4}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 0,
                        borderRight: '1px solid black',
                        position: 'relative' /* needed for SlidingStackContainer*/,
                        overflow: 'hidden',
                    }}
                >
                    <SlidingStackContainer conversationId={conversationId} />
                    <LeftPanelConversations currentConversationId={conversationId} />
                </Grid>
            </Hidden>
            <Hidden smUp>
                <SlidingStackContainer conversationId={conversationId} />
            </Hidden>
            <Grid item xs={12} sm={8} style={{ display: 'flex', padding: 0 }}>
                <Grid container direction="column" style={{ flexWrap: 'initial' }}>
                    <Grid item xs={12} style={{ flexBasis: 'initial' }}>
                        <ConversationDetail id={conversationId} />
                        <Hidden smUp>
                            <Box style={{ display: 'flex' }}>
                                <IconButton
                                    style={{ marginLeft: 'auto' }}
                                    onClick={slideInLeftPanelConversations}
                                >
                                    <PersonAddIcon />
                                </IconButton>
                            </Box>
                        </Hidden>
                    </Grid>
                    <Grid
                        item
                        xs={12}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            minHeight: 0,
                        }}
                    >
                        <MessagesContainer conversationId={conversationId} />
                    </Grid>
                    <Grid item xs={12} style={{ flexBasis: 'initial' }}>
                        <OthersWritingActivity conversationId={conversationId} />
                        <MessageInput conversationId={conversationId} />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    )
}

export default MessagesPanel
