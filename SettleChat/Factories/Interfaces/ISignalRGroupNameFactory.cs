using System;

namespace SettleChat.Factories.Interfaces
{
    public interface ISignalRGroupNameFactory
    {
        string CreateConversationGroupName(Guid conversationId);
    }
}