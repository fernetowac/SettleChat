using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;
using SettleChat.Persistence.Enums;

namespace SettleChat.Persistence.Models
{
    public class ApplicationUser : IdentityUser<Guid>
    {
        public UserStatus Status { get; set; } = UserStatus.Offline;
        public DateTimeOffset LastActivityTimestamp { get; set; }
        public List<ConversationUser> ConversationUsers { get; set; } = new List<ConversationUser>();
        public List<Invitation> Invitations { get; set; } = new List<Invitation>();

    }
}
