import { connect, ConnectedProps } from 'react-redux'
import { ApplicationState } from '../store'
import { leftPanelContentPush, leftPanelContentPop, ContentType, ContentStackItem } from '../store/ui'
import { Slide, Hidden } from '@material-ui/core'
import { LeftPanelConversations } from './LeftPanelConversations'
import { LeftPanelInvitation } from './LeftPanelInvitation'

const zIndexStart = 2000 // must be more than 1050 (speed dial from Material UI) of messages slide down button

const SlidingStackContainer = (props: ConnectedProps<typeof connector>) => {
    const getContent = (contentStackItem: ContentStackItem) => {
        switch (contentStackItem.type) {
            case ContentType.Conversations:
                return <LeftPanelConversations currentConversationId={props.conversationId} closable />
            case ContentType.Invitation:
                return <LeftPanelInvitation conversationId={props.conversationId} />
            default:
                throw Error(`Unsupported sliding stack content type:${contentStackItem.type}`)
        }
    }

    const slides = props.contentStack.map((contentStackItem, index) => <Hidden key={index} only={contentStackItem.hiddenAtBreakpoints}>
        <Slide direction="right" in mountOnEnter unmountOnExit>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, backgroundColor: '#dfdfdf', position: 'absolute', width: '100%', height: '100%', zIndex: zIndexStart + index * 10 }}>
                {getContent(contentStackItem)}
            </div>
        </Slide>
    </Hidden>)

    return <>{slides}</>
}

interface OwnProps {
    conversationId: string
}

const mapStateToProps = (state: ApplicationState, ownProps: OwnProps) => ({
    contentStack: state.conversation.ui.leftPanel.contentStack,
    conversationId: ownProps.conversationId
})

const mapDispatchToProps = {
    leftPanelContentPush,
    leftPanelContentPop
}

const connector = connect(
    mapStateToProps,
    mapDispatchToProps
)

export default connector(SlidingStackContainer)