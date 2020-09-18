import * as React from 'react';
import { connect } from 'react-redux';
import * as ConversationsStore from '../store/Conversations';
import Conversations from './Conversations';
import * as Sentry from "@sentry/react";
import ErrorBoundaryFallback from './ErrorBoundaryFallback';

type NewConversationProps = typeof ConversationsStore.actionCreators & ConversationsStore.Conversation;

function NewConversation(props: NewConversationProps) {
    const [inputConversation, setInputConversation] = React.useState({
        title: 'initial conversation name',
        creator: {
            name: 'initial creator',
            email: 'initial creator email'
        },
        invitedUsers: [{
            name: 'initial invited user name',
            email: 'initial invited user email'
        }]
    });
    console.log('inputConversation:' + JSON.stringify(inputConversation));

    const handleSubmit = (evt: React.SyntheticEvent<EventTarget>) => {
        evt.preventDefault();
        props.addConversation(inputConversation);
        setInputConversation({ title: '', creator: { name: '', email: '' }, invitedUsers: [] });
    };

    const inputConversationTitleOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputConversation({ ...inputConversation, title: e.target.value });
    }

    const inputConversationCreatorNameOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputConversation({ ...inputConversation, creator: { ...inputConversation.creator, name: e.target.value } });
    }
    const inputConversationCreatorEmailOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputConversation({ ...inputConversation, creator: { ...inputConversation.creator, email: e.target.value } });
    }
    const inputConversationInvitedUsersNamesOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputConversation({ ...inputConversation });//TODO
    }
    const inputConversationInvitedUsersEmailsOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        setInputConversation({ ...inputConversation });//TODO
    }

    return (
        <React.Fragment>
            <Sentry.ErrorBoundary fallback={ErrorBoundaryFallback} showDialog>
                <Conversations />
            </Sentry.ErrorBoundary>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        Conversation title:</label>
                    <input type="text" value={inputConversation.title} onChange={inputConversationTitleOnChange} />
                </div>
                <div>
                    <label>
                        Creator:</label>
                    <input type="text" value={inputConversation.creator.name} onChange={inputConversationCreatorNameOnChange} />
                </div>
                <div>
                    <label>
                        Creator:</label>
                    <input type="text" value={inputConversation.creator.email} onChange={inputConversationCreatorEmailOnChange} />
                </div>
                <div>
                    <label>
                        Invited users's names (comma separated):</label>
                    <input type="text" value={inputConversation.invitedUsers.map(x => x.name).join(',')} onChange={inputConversationInvitedUsersNamesOnChange} />
                </div>
                <div>
                    <label>
                        Invited users's emails (comma separated):</label>
                    <input type="text" value={inputConversation.invitedUsers.map(x => x.email).join(',')} onChange={inputConversationInvitedUsersEmailsOnChange} />
                    <input type="submit" value="Submit" />
                </div>
            </form>
        </React.Fragment>
    );
}

export default connect(
    null,
    ConversationsStore.actionCreators
)(NewConversation as any);