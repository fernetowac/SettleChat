using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SettleChat.Factories;
using SettleChat.Hubs;
using SettleChat.Models;
using SettleChat.Persistence;
using SettleChat.Persistence.Models;

namespace SettleChat.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MessageController : ControllerBase
    {
        private readonly SettleChatDbContext _context;
        private readonly IHubContext<ConversationHub, IConversationClient> _conversationHubContext;
        private readonly ILogger<MessageController> _logger;

        public MessageController(SettleChatDbContext context,
            IHubContext<ConversationHub, IConversationClient> conversationHubContext, ILogger<MessageController> logger)
        {
            _context = context;
            _conversationHubContext = conversationHubContext;
            _logger = logger;
        }

        [HttpGet]
        public IEnumerable<Message> Get()
        {
            yield return new Message
            {
                Id = 1,
                Text = "Hi there",
                UserFrom = "Fero"
            };

            yield return new Message
            {
                Id = 2,
                Text = "Hi",
                UserFrom = "Imro"
            };
        }

        [HttpGet("/api/conversations/{conversationId}/messages")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<MessageModel[]>> List(Guid conversationId)
        {
            return await _context.Messages
                .Where(x => x.Conversation.Id == conversationId)
                .Select(x => new MessageModel
                {
                    Id = x.Id,
                    Text = x.Text,
                    UserId = x.Author.Id
                }).ToArrayAsync();
        }

        // To protect from overposting attacks, enable the specific properties you want to bind to, for
        // more details, see https://go.microsoft.com/fwlink/?linkid=2123754.
        [HttpPost("/api/conversations/{conversationId}/messages")]
        //[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        //[Authorize(AuthenticationSchemes = $"{JwtBearerDefaults.AuthenticationScheme},{CookieAuthenticationDefaults.AuthenticationScheme}")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<MessageModel>> PostMessage(Guid conversationId,
            [FromBody] MessageCreateModel messageCreateModel)
        {
            //TODO: check that user is authorized for the conversation
            var conversation = await _context.Conversations.FindAsync(conversationId);

            var message = new Persistence.Models.Message
            {
                AuthorId = Guid.Parse(User.Identity.GetSubjectId()),
                Text = messageCreateModel.Text,
                Created = DateTime.Now,
                Conversation = conversation
            };
            _context.Messages.Add(message);
            await _context.SaveChangesAsync(); //TODO: error handling
            var messageModel = new MessageModel
            {
                Id = message.Id,
                UserId = message.AuthorId,
                Text = message.Text
            };
            var toBeNotifiedUserIds = await _context.ConversationUsers.Where(x => x.ConversationId == conversationId)
                .Select(x => x.UserId.ToString().ToLowerInvariant()).ToListAsync();
            //toBeNotifiedUserIds.Remove(User.Identity.GetSubjectId());

            await _conversationHubContext.Clients.Users(toBeNotifiedUserIds).NewMessage(messageModel);
            return messageModel;
        }

        [HttpPut("/api/conversations/{conversationId}/writingactivity")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<ConversationWritingActivityOutputModel>> UpdateWritingStatus(Guid conversationId, [FromBody] ConversationWritingActivityModel writingActivity)
        {
            var userId = Guid.Parse(User.Identity.GetSubjectId());
            var conversationWritingActivityOutputModel = new ConversationWritingActivityOutputModel
            {
                Activity = writingActivity.Activity,
                ConversationId = conversationId,
                UserId = userId,
                LastChange = writingActivity.LastChange
            };
            //TODO: use ISignalRGroupNameFactory
            await _conversationHubContext.Clients.Group($"ConversationId:{conversationId}")
                .ConversationWritingActivity(conversationWritingActivityOutputModel);
            return conversationWritingActivityOutputModel;
        }
    }
}
