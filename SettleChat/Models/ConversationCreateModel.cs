using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SettleChat.Models
{
    public class ConversationCreateModel
    {
        public string Title { get; set; }
        public User Creator { get; set; }
        //public List<User> InvitedUsers { get; set; }

        public class User
        {
            public string Name { get; set; }
            public string Email { get; set; }
        }
    }
}
