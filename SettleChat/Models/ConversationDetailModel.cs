using System;
using System.Collections.Generic;

namespace SettleChat.Models
{
    public class ConversationDetailModel : ConversationModel
    {
        public User Me { get; set; }
        public List<User> OtherUsers { get; set; } = new List<User>();

        public class User
        {
            public Guid Id { get; set; }
            public string UserName { get; set; }
            public string? Nickname { get; set; }
            public string Email { get; set; }
        }
    }
}