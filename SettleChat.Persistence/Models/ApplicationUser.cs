using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;
using SettleChat.Persistence.Enums;

namespace SettleChat.Persistence.Models
{
    public class ApplicationUser : IdentityUser<Guid>
    {
        public UserStatus Status { get; set; } = UserStatus.Offline;
        public DateTime LastActivityTimestamp { get; set; }
        public IEnumerable<ConversationUser> ConversationUsers { get; set; }

    }
}
