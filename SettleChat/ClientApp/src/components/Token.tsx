import React from 'react'
import { connect, useDispatch } from 'react-redux'
import { RouteComponentProps } from 'react-router'
import { push } from 'connected-react-router'

interface TokenResponse {
    conversationId: string
}

const Token = (props: RouteComponentProps<{ token: string }>) => {
    const { token } = props.match.params
    const dispatch = useDispatch()

    React.useEffect(() => {
        fetch(`/api/token/${token}`, {
            cache: 'no-cache',
            headers: {
                Accept: 'application/json',
            },
        })
            .then((response) => response.json() as Promise<TokenResponse>)
            .then((data) => {
                dispatch(push(`/conversation/${data.conversationId}`))
            })
    }, [token, dispatch])

    return <p>Checking token..</p>
}

export default connect()(Token as any)
