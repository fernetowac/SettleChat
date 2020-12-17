using System;
using System.Collections.Generic;

namespace SettleChat.Models
{
    public class MessageModel
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public string Text { get; set; }
        public Guid UserId { get; set; }
        public DateTimeOffset Created { get; set; }
    }
}