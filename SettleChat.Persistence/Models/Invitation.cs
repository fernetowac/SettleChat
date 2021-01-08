using System;

namespace SettleChat.Persistence.Models
{
    public class Invitation
    {
        private ApplicationUser? _invitedByUser;
        private Conversation? _conversation;

        public Invitation(Guid id, Guid conversationId, Guid invitedByUserId, string token)
        {
            Id = id;
            ConversationId = conversationId;
            InvitedByUserId = invitedByUserId;
            Token = token;
        }

        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public Conversation Conversation
        {
            get => _conversation ?? throw new InvalidOperationException("Uninitialized property: " + nameof(Conversation));
            set => _conversation = value;
        }
        public Guid InvitedByUserId { get; set; }
        public ApplicationUser InvitedByUser
        {
            get => _invitedByUser ?? throw new InvalidOperationException("Uninitialized property: " + nameof(InvitedByUser));
            set => _invitedByUser = value;
        }
        public string Token { get; set; }
        public bool IsPermanent { get; set; }
        public bool IsActive { get; } = true;
        public DateTimeOffset Created { get; } = DateTimeOffset.Now;
    }
}