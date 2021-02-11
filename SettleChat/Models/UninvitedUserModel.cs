using System;
using System.Collections.Generic;
using System.Security.Permissions;

namespace SettleChat.Models
{
    public class UninvitedUserModel
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public string Token { get; set; }
    }
}