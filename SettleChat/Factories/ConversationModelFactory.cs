using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SettleChat.Models;
using SettleChat.Persistence.Models;

namespace SettleChat.Factories
{
    public class ConversationModelFactory
    {
        public ConversationModel Create(Conversation conversation, ApplicationUser me, List<ApplicationUser> otherUsers)
        {
            var resultModel = new ConversationModel
            {
                Id = conversation.Id,
                Title = conversation.Title,
                Me = new ConversationModel.User
                {
                    Id = me.Id,
                    Email = me.Email,
                    UserName = me.UserName
                },
                OtherUsers = otherUsers.Select(user => Create(user)).ToList()
            };
            return resultModel;
        }

        private static ConversationModel.User Create(ApplicationUser user)
        {
            return new ConversationModel.User
            {
                Id = user.Id,
                Email = user.Email,
                UserName = user.UserName
            };
        }
    }
}
