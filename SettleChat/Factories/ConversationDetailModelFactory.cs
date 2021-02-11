using System.Collections.Generic;
using System.Linq;
using SettleChat.Models;
using SettleChat.Persistence.Models;

namespace SettleChat.Factories
{
    public class ConversationDetailModelFactory
    {
        public ConversationDetailModel Create(Conversation conversation, ApplicationUser me, List<ConversationUser> otherUsers)
        {
            var resultModel = new ConversationDetailModel
            {
                Id = conversation.Id,
                Title = conversation.Title,
                IsPublic = conversation.IsPublic,
                Me = new ConversationDetailModel.User
                {
                    Id = me.Id,
                    Email = me.Email,
                    UserName = me.UserName
                },
                OtherUsers = otherUsers.Select(Create).ToList()
            };
            return resultModel;
        }

        private static ConversationDetailModel.User Create(ConversationUser user)
        {
            return new ConversationDetailModel.User
            {
                Id = user.UserId,
                Email = user.User.Email,
                UserName = user.User.UserName,
                Nickname = user.UserNickName
            };
        }
    }
}
