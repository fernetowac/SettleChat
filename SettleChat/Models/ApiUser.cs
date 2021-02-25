using System;
using SettleChat.Persistence.Enums;

namespace SettleChat.Models
{
    public class ApiUser
    {
        public ApiUser(Guid id, string userName, UserStatus status)
        {
            Id = id;
            UserName = userName;
            Status = status;
        }
        public Guid Id { get; set; }
        public string UserName { get; set; }
        public UserStatus Status { get; set; }
        public DateTimeOffset? LastActivityTimestamp { get; set; }
    }
}