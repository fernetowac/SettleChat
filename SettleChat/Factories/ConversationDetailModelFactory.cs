using System.Collections.Generic;
using System.Linq;
using SettleChat.Models;
using SettleChat.Persistence.Models;

namespace SettleChat.Factories
{
    public class ConversationDetailModelFactory
    {
        public ConversationDetailModel Create(Conversation conversation, ApplicationUser me, List<ApplicationUser> otherUsers)
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

        private static ConversationDetailModel.User Create(ApplicationUser user)
        {
            return new ConversationDetailModel.User
            {
                Id = user.Id,
                Email = user.Email,
                UserName = user.UserName
            };
        }
    }
}
