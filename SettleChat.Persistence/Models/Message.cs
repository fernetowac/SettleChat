using System;

namespace SettleChat.Persistence.Models
{
    public class Message
    {
        public Guid Id { get; set; }
        public string Text { get; set; }
        public DateTimeOffset Created { get; set; }

        public Guid ConversationId { get; set; }
        public Conversation Conversation { get; set; }
        public Guid AuthorId { get; set; }
        public ApplicationUser Author { get; set; }
    }
}