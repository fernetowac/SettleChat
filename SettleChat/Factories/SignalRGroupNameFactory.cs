using System;
using SettleChat.Factories.Interfaces;

namespace SettleChat.Factories
{
    public class SignalRGroupNameFactory : ISignalRGroupNameFactory
    {
        public string CreateConversationGroupName(Guid conversationId) => $"ConversationId:{conversationId}";
    }
}