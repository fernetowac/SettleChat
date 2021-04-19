import * as React from 'react'
import { connect } from 'react-redux'
import { AppDispatch } from '../index'
import {
    addConversation,
    NewConversation as NewConversationInput,
} from '../store/conversationDetails'

const initialState = {
    title: undefined,
} as NewConversationInput

function NewConversation(props: ReturnType<typeof mapDispatchToProps>) {
    const [inputConversation, setInputConversation] = React.useState(initialState)

    const handleSubmit = (evt: React.SyntheticEvent<EventTarget>) => {
        evt.preventDefault()
        props.addConversation(inputConversation)
        setInputConversation(initialState)
    }

    const onTitleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault()
        setInputConversation({ title: e.target.value })
    }

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Title:</label>
                <input type="text" value={inputConversation.title} onChange={onTitleChange} />
            </div>
            <div>
                <input type="submit" value="Submit" />
            </div>
        </form>
    )
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    addConversation: (conversationInput: NewConversationInput) =>
        dispatch(addConversation(conversationInput)),
})

export default connect(null, mapDispatchToProps)(NewConversation as any)
