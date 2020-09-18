using System;

namespace SettleChat.Persistence.Models
{
    public class UserSecret
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public ApplicationUser User { get; set; }
        /// <summary>
        /// Gets or sets the secret.
        /// </summary>
        /// <value>
        /// Uppercase value of secret.
        /// </value>
        public string Secret { get; set; }
    }
}