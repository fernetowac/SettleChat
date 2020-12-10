using SettleChat.Models;
using SettleChat.Persistence.Models;

namespace SettleChat.Factories
{
    public class ConversationModelFactory
    {
        public ConversationModel Create(Conversation conversation)
        {
            var resultModel = new ConversationModel
            {
                Id = conversation.Id,
                Title = conversation.Title,
                IsPublic = conversation.IsPublic
            };
            return resultModel;
        }
    }
}
