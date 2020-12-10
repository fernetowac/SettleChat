using System;

namespace SettleChat.Models
{
    public class ConversationModel
    {
        public Guid Id { get; set; }
        public string? Title { get; set; }
        public bool IsPublic { get; set; }
    }
}