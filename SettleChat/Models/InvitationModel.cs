using System;
using System.Collections.Generic;

namespace SettleChat.Models
{
    public class InvitationModel
    {
        public InvitationModel(Guid id, Guid conversationId, string invitedByUserName, string token)
        {
            Id = id;
            ConversationId = conversationId;
            InvitedByUserName = invitedByUserName;
            Token = token;
        }

        public Guid Id { get; }
        public Guid ConversationId { get; }
        public string? ConversationTitle { get; set; }
        public string InvitedByUserName { get; }
        public List<string> ConversationUserNames { get; set; } = new List<string>();
        public bool IsActive { get; set; }
        public bool IsPermanent { get; set; }
        public DateTimeOffset Created { get; set; }
        public string Token { get; set; }
    }
}