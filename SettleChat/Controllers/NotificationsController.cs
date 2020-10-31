using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using SettleChat.Factories.Interfaces;
using SettleChat.Hubs;
using SettleChat.Persistence;

namespace SettleChat.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly SettleChatDbContext _context;
        private readonly IHubContext<ConversationHub, IConversationClient> _conversationHubContext;
        private readonly ISignalRGroupNameFactory _signalRGroupNameFactory;
        private readonly ILogger<MessageController> _logger;

        public NotificationsController(SettleChatDbContext context,
            IHubContext<ConversationHub,
                IConversationClient> conversationHubContext,
            ISignalRGroupNameFactory signalRGroupNameFactory,
            ILogger<MessageController> logger)
        {
            _context = context;
            _conversationHubContext = conversationHubContext;
            _signalRGroupNameFactory = signalRGroupNameFactory;
            _logger = logger;
        }

        [HttpPost("/api/notifications/conversations/{conversationId}")]
        public async Task<ActionResult> StartListeningConversation(Guid conversationId, [FromBody] string connectionId)
        {
            await _conversationHubContext.Groups.AddToGroupAsync(connectionId, _signalRGroupNameFactory.CreateConversationGroupName(conversationId));
            return Ok(string.Empty); // TODO: in javascript it's crashing when the response cannot parse as JSON
        }

        [HttpDelete("/api/notifications/conversations/{conversationId}")]
        public async Task<ActionResult> StopListeningConversation(Guid conversationId, [FromBody] string connectionId)
        {
            await _conversationHubContext.Groups.RemoveFromGroupAsync(connectionId, _signalRGroupNameFactory.CreateConversationGroupName(conversationId));
            return Ok(string.Empty); // TODO: in javascript it's crashing when the response cannot parse as JSON
        }
    }
}
