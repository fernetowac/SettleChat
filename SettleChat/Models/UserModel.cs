using System;
using System.Collections.Generic;
using System.Security.Permissions;
using SettleChat.Persistence.Enums;

namespace SettleChat.Models
{
    public class UserModel
    {
        public Guid Id { get; set; }
        public string UserName { get; set; }
        public string Email { get; set; }
        public UserStatus Status { get; set; }
        public DateTimeOffset? LastActivityTimestamp { get; set; }
    }
}