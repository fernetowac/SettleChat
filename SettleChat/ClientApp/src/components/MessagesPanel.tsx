import React from 'react';
import Messages from "./Messages"
import MessageInput from "./MessageInput";

export const MessagesPanel = () => {
    return <React.Fragment>
        <Messages />
        <MessageInput />
    </React.Fragment>;
}