using System;

namespace SettleChat.Models
{
    public class ApiConversationUser
    {
        public ApiConversationUser(Guid id, Guid userId, Guid conversationId, ApiUser user) //TODO:userId can be taken form user
        {
            Id = id;
            UserId = userId;
            ConversationId = conversationId;
            User = user;
        }

        public Guid Id { get; }
        public Guid UserId { get; }
        public ApiUser User { get; }
        public Guid ConversationId { get; }
        public string? Nickname { get; set; }
    }
}