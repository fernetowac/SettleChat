import * as React from 'react';
import { connect } from 'react-redux';
import * as ConversationStore from "../store/Conversation";
import { ApplicationState } from '../store/index';
import authService from '../components/api-authorization/AuthorizeService';

type AddUserProps = { conversationId: string } & typeof ConversationStore.actionCreators & ConversationStore.UserStatus;

function AddUser(props: AddUserProps) {
    const [id, setId] = React.useState('');
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [tokenLink, setTokenLink] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleAddUserSubmit = (evt: React.SyntheticEvent<EventTarget>) => {
        evt.preventDefault();
        if (id === '') {
            addUser({ name: name, email: email });
        }
    };

    interface NewUser {
        name: string | undefined;
        email: string | undefined;
    }

    interface UninvitedUser {
        id: string;
        userName: string;
        token: string;
        email: string | undefined;
    }

    function addUser(newUser: NewUser) {
        return authService.getAccessToken()
            .then(token => {
                setLoading(true);
                //TODO: handle unauthorized when !token
                fetch(`/api/conversations/${props.conversationId}/users`,
                    {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(newUser)
                    })
                    .then(data => data.json() as Promise<UninvitedUser>)
                    .then(data => {
                        props.userAdded({
                            id: data.id,
                            email: data.email,
                            userName: data.userName,
                            status: ConversationStore.UserStatus.Offline,
                            lastActivityTimestamp: null
                        });
                        setId(data.id);
                        setTokenLink(`${window.location.origin}/token/${data.token}`);
                        setLoading(false);
                    })
                    .catch(error => {
                        setLoading(false);
                        console.error(error.message);
                    });
            });
    }

    return (
        <React.Fragment>
            {props.conversationId === undefined ? (
                <p>Conversation undefined</p>
            ) : (id === '' ? (
                <form onSubmit={handleAddUserSubmit}>
                    <label>
                        Username:
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    </label>

                    <label>
                        Email:
                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </label>
                    {loading === false &&
                        <input type="submit" value="Submit" />
                    }
                </form>
            ) : (
                    <div>
                        <label>
                            Username:
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                        </label>

                        <label>
                            Email:
                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </label>

                        <label>
                            Invite link:
                    <input type="text" value={tokenLink} onChange={(e) => setTokenLink(e.target.value)} />
                        </label>
                    </div>
                )
                )
            }
        </React.Fragment>
    );
}

export default connect(
    (state: ApplicationState) => {
        return { conversationId: state.conversation && state.conversation.conversation ? state.conversation.conversation.id : undefined }
    },
    ConversationStore.actionCreators
)(AddUser as any);