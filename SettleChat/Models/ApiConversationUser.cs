using System;

namespace SettleChat.Models
{
    public class ApiConversationUser
    {
        public ApiConversationUser(Guid id, Guid userId, Guid conversationId)
        {
            Id = id;
            UserId = userId;
            ConversationId = conversationId;
        }

        public Guid Id { get; }
        public Guid UserId { get; }
        public ApiUser? User { get; set; }
        public Guid ConversationId { get; }
        public string? Nickname { get; set; }
    }
}