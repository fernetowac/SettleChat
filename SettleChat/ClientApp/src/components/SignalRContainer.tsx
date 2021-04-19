import * as React from 'react'
import * as signalR from '@microsoft/signalr'
import { connect } from 'react-redux'
import { ApplicationState } from '../store/index'
import { conversationDetailsActions } from '../store/conversationDetails'
import authService from '../components/api-authorization/AuthorizeService'
import { useIsMounted } from '../hooks/useIsMounted'
import { AppDispatch } from '../'
import { messageAddedActionCreator, conversationUserAdded } from '../store/common'
import { Message } from '../types/messageTypes'
import { ConversationUserResponse } from '../types/conversationUserTypes'
import { UserStatus } from '../types/userTypes'
import { signalRActions } from '../store/SignalR'
import { ConversationDetail } from '../types/conversationTypes'
import { writingActivitiesActions, WritingActivity } from '../store/writingActivities'
import { updateOneUser } from '../store/users'

const signalRHubUrl = `${document.location.origin}/conversationHub` //TODO: take url from some config

export interface ReceivedWritingActivityData {
    conversationId: string
    userId: string
    activity: WritingActivity
}

//TODO: make sure there is only one SignalRContainer component at the same time. Otherwise it can overwrite redux store connectionId of another one.
const SignalRContainer = (
    props: ReturnType<typeof mapStateToProps> &
        ReturnType<typeof mapDispatchToProps> & { children: React.ReactNode }
) => {
    const {
        connectionEstablished,
        reconnected,
        disconnected,
        messageAdded,
        writingActivityReceived,
        userStatusChanged,
        conversationUpdated,
        conversationUserAdded,
    } = props.actions
    const [hubConnection, setHubConnection] = React.useState<signalR.HubConnection>()
    const isMounted = useIsMounted()

    const accessTokenFactory = (): Promise<string> => {
        if (!isMounted()) {
            return Promise.reject('SignalRContainer is already unloaded')
        }
        return authService.getAccessToken().then((token) => {
            if (!token) {
                throw new Error('Access token should never be null here')
            }
            return token
        })
    }

    //TODO: log only when development (it logs also url containing access_token!)
    const buildHubConnection = async (
        signalRHubUrl: string
    ): Promise<signalR.HubConnection | undefined> => {
        const hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(signalRHubUrl, {
                accessTokenFactory: accessTokenFactory,
            } as signalR.IHttpConnectionOptions)
            .configureLogging(signalR.LogLevel.Trace)
            .withAutomaticReconnect()
            .build()

        hubConnection
            .start()
            .then(() => {
                console.log(
                    `SignalRContainer: HUB connected; connectionId: ${hubConnection.connectionId}`
                )
                connectionEstablished(hubConnection.connectionId as string)
            })
            .catch((err) => console.error(err))

        hubConnection.onreconnecting((error) => {
            console.error(`SignalRMiddleware: HUB reconnecting; error: ${error}`)
        })

        hubConnection.onreconnected((connectionId: string | undefined) => {
            console.log(`SignalRContainer: HUB reconnected. ConnectionId: ${connectionId}`)
            if (!connectionId) {
                console.error('SignalRContainer: HUB reconnected with undefined connectionId')
                return
            }
            reconnected(connectionId)
        })

        hubConnection.onclose((error) => {
            if (error) {
                console.error(`SignalRContainer: connection closed. Error: ${error}`)
            } else {
                console.debug('SignalRContainer: connection closed')
            }
            disconnected()
        })

        hubConnection.on('NewMessage', messageAdded)

        hubConnection.on('ConversationWritingActivity', writingActivityReceived)

        hubConnection.on('UserStatusChanged', userStatusChanged)

        hubConnection.on('ConversationUpdated', conversationUpdated)

        hubConnection.on('ConversationUserAdded', conversationUserAdded)

        return hubConnection
    }

    React.useEffect(() => {
        // cleanup of hubConnection
        return () => {
            if (!isMounted()) {
                if (hubConnection) {
                    // Note: We must handle stopping hubConnection in useEffect that listens to hubConnection. Otherwise (in other useEffect), hubConnection woult be undefined.
                    hubConnection
                        .stop()
                        .then(() =>
                            console.debug('SignalRContainer hubConnection gracefully stopped')
                        )
                        .catch(() => console.debug('SignalRContainer hubConnection stopped ugly'))
                }
            }
        }
    }, [hubConnection, isMounted])

    React.useEffect(() => {
        // initialize hubConnection
        buildHubConnection(signalRHubUrl).then((connection) => {
            console.debug('SignalRContainer built connection', connection)
            if (connection !== undefined) {
                setHubConnection(connection)
            }
        })
        return () => {
            console.debug('SignalRContainer cleanup')
        }
    }, [])

    return hubConnection && hubConnection.connectionId ? (
        <React.Fragment>{props.children}</React.Fragment>
    ) : (
        <React.Fragment>Not connected for receiving notifications.</React.Fragment>
    )
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    //TODO: can be simplyfied and defined as object of actionCreators? and let redux connect wrap it's actionCreators by dispatch
    actions: {
        connectionEstablished: (connectionId: string) =>
            dispatch(signalRActions.connectionEstablished(connectionId)),
        reconnected: (connectionId: string) => dispatch(signalRActions.reconnected(connectionId)),
        disconnected: () => dispatch(signalRActions.disconnected()),
        messageAdded: (message: Message) => dispatch(messageAddedActionCreator(message)),
        writingActivityReceived: (writingActivity: ReceivedWritingActivityData) => {
            dispatch(writingActivitiesActions.received(writingActivity))
        },
        userStatusChanged: (userId: string, status: UserStatus) =>
            dispatch(updateOneUser({ id: userId, changes: { status } })),
        conversationUpdated: (conversation: ConversationDetail) =>
            dispatch(conversationDetailsActions.received(conversation)),
        conversationUserAdded: (conversationUserResponse: ConversationUserResponse) =>
            dispatch(conversationUserAdded(conversationUserResponse)),
    },
})

//TODO: state members seems to be unused, so they might be removed
const mapStateToProps = (state: ApplicationState) => ({
    data: {
        connectionId: state.signalR.connectionId,
    },
})

export default connect(mapStateToProps, mapDispatchToProps)(SignalRContainer as any)
