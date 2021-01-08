using System;
using System.Collections.Generic;

namespace SettleChat.Persistence.Models
{
    public class Conversation
    {
        public Guid Id { get; set; }
        public string? Title { get; set; }
        public bool IsPublic { get; set; }
        public List<Message> Messages { get; } = new List<Message>();
        public List<ConversationUser> ConversationUsers { get; } = new List<ConversationUser>();
        public List<Invitation> Invitations { get; } = new List<Invitation>();
        public DateTimeOffset Created { get; set; }
    }
}