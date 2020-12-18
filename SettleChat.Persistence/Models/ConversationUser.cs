using System;

namespace SettleChat.Persistence.Models
{
    public class ConversationUser
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public Conversation Conversation { get; set; }
        public Guid UserId { get; set; }
        public string? UserNickName { get; set; }
        public ApplicationUser User { get; set; }
        public Guid? LastReadMessageId { get; set; }
        public Message LastReadMessage { get; set; }
    }
}