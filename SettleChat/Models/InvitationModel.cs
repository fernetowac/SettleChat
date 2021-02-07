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
        public List<InvitationConversationUser> ConversationUsers { get; set; } = new List<InvitationConversationUser>();
        public bool IsActive { get; set; }
        public bool IsPermanent { get; set; }
        public DateTimeOffset Created { get; set; }
        public string Token { get; set; }

        public class InvitationConversationUser
        {
            public InvitationConversationUser(Guid id, string nickname)
            {
                Id = id;
                Nickname = nickname;
            }

            public Guid Id { get; set; }
            public string Nickname { get; set; }
        }
    }
}