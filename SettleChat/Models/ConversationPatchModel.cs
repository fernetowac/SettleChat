using System.ComponentModel.DataAnnotations;

namespace SettleChat.Models
{
    public class ConversationPatchModel
    {
        [MinLength(3, ErrorMessage = "Too short value")]
        [MaxLength(200, ErrorMessage = "Too long value")]
        public string? Title { get; set; }

        public bool? IsPublic { get; set; }
    }
}