using System;
using System.Collections.Generic;

namespace SettleChat.Models
{
    public class ConversationListItemModel
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string? LastMessageText { get; set; }
        public Guid? LastMessageUserId { get; set; }
        public DateTimeOffset LastActivityTimestamp { get; set; }
        public List<ConversationListItemUserModel> Users { get; set; } = new List<ConversationListItemUserModel>();
    }
}
