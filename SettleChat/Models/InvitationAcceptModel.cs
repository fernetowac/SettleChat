using System.ComponentModel.DataAnnotations;

namespace SettleChat.Models
{
    public class InvitationAcceptModel
    {
        [Required]
        [MinLength(3, ErrorMessage = "The field {0} must be at least {1} characters long.")]
        [MaxLength(100, ErrorMessage = "The field {0} cannot be more than {1} characters long.")]
        [RegularExpression("^[0-9a-zA-Z\xC0-\uFFFF _]*$", ErrorMessage = "The field {0} contains wrong characters.")]
        public string Nickname { get; set; } = string.Empty;

        public bool ShouldCreateAnonymousUser { get; set; }
    }
}