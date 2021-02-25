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
using Microsoft.Extensions.Internal;
using SettleChat.Factories;
using SettleChat.Factories.Interfaces;
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
        private readonly ISignalRGroupNameFactory _signalRGroupNameFactory;
        private readonly ILogger<MessageController> _logger;
        private readonly ISystemClock _systemClock;

        public MessageController(
            SettleChatDbContext context,
            IHubContext<ConversationHub, IConversationClient> conversationHubContext,
            ISignalRGroupNameFactory signalRGroupNameFactory,
            ILogger<MessageController> logger,
            ISystemClock systemClock)
        {
            _context = context;
            _conversationHubContext = conversationHubContext;
            _signalRGroupNameFactory = signalRGroupNameFactory;
            _logger = logger;
            _systemClock = systemClock;
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
        public async Task<ActionResult<MessageModel[]>> List(Guid conversationId, Guid? beforeId, int amount = 30)
        {
            var messageQuery = _context.Messages
                .Where(x => x.Conversation.Id == conversationId);
            if (beforeId.HasValue)
            {
                var mustBeBeforeDate = _context.Messages.Where(x => x.Conversation.Id == conversationId && x.Id == beforeId).Select(x => x.Created).SingleOrDefault();
                if (mustBeBeforeDate == default(DateTimeOffset))
                {
                    //TODO: handle model error nicely
                    throw new ArgumentException($"{nameof(beforeId)} does not exist");
                }

                messageQuery = messageQuery.Where(x => x.Created < mustBeBeforeDate);
            }
            var messages = await messageQuery
                .OrderByDescending(x => x.Created)
                .Take(amount)
                .Select(x => new MessageModel
                {
                    Id = x.Id,
                    ConversationId = conversationId,
                    Text = x.Text,
                    UserId = x.Author.Id,
                    Created = x.Created
                }).ToArrayAsync();
            return messages;
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
                Created = _systemClock.UtcNow,
                Conversation = conversation
            };
            _context.Messages.Add(message);
            await _context.SaveChangesAsync(); //TODO: error handling
            var messageModel = new MessageModel
            {
                Id = message.Id,
                ConversationId = message.Conversation.Id,
                UserId = message.AuthorId,
                Text = message.Text,
                Created = message.Created
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
                UserId = userId
            };
            var conversationGroupName = _signalRGroupNameFactory.CreateConversationGroupName(conversationId);
            await _conversationHubContext.Clients.Group(conversationGroupName)
                .ConversationWritingActivity(conversationWritingActivityOutputModel);
            return conversationWritingActivityOutputModel;
        }
    }
}
