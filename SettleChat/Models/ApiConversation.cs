using System;
using System.Collections.Generic;

namespace SettleChat.Models
{
    public class ApiConversation
    {
        public ApiConversation(Guid id)
        {
            Id = id;
        }

        public Guid Id { get; }
        public string? Title { get; set; }
        public bool IsPublic { get; set; }
        public DateTimeOffset Created { get; set; }
        public List<ApiConversationUser> ConversationUsers { get; set; } = new List<ApiConversationUser>();
    }
}