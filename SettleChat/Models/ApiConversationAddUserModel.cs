using System;
using System.ComponentModel.DataAnnotations;

namespace SettleChat.Models
{
    public class ApiConversationAddUserModel
    {
        [Required]
        public Guid UserId { get; set; }
    }
}