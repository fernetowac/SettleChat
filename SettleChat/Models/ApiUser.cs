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
        public Guid Id { get; }
        public string UserName { get; }
        public UserStatus Status { get; }
        public DateTimeOffset? LastActivityTimestamp { get; set; }
    }
}