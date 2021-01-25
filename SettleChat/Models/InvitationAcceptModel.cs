using System.ComponentModel.DataAnnotations;

namespace SettleChat.Models
{
    public class InvitationAcceptModel
    {
        [Required]
        public string? Nickname { get; set; }

        public bool ShouldCreateAnonymousUser { get; set; }
    }
}