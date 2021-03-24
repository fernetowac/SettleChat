using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SettleChat.Hubs;
using SettleChat.Models;
using SettleChat.Persistence;
using SettleChat.Persistence.Enums;
using SettleChat.Persistence.Models;

namespace SettleChat.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConversationUsersController : ControllerBase
    {
        private readonly SettleChatDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IHubContext<ConversationHub, IConversationClient> _conversationHubContext;
        private readonly ILogger<ConversationsController> _logger;

        public ConversationUsersController(SettleChatDbContext context, UserManager<ApplicationUser> userManager,
            IHubContext<ConversationHub, IConversationClient> conversationHubContext,
            SignInManager<ApplicationUser> signInManager, ILogger<ConversationsController> logger)
        {
            _context = context;
            _userManager = userManager;
            _conversationHubContext = conversationHubContext;
            _logger = logger;
        }

        // GET: api/conversations/{conversationId}/users/{userId}
        [HttpGet("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<ConversationModel>> GetOne(Guid conversationId, Guid userId)
        {
            var currentUserId = Guid.Parse(User.Identity.GetSubjectId());
            bool isIdentityMemberOfConversation = _context.ConversationUsers.Any(x => x.UserId == currentUserId); //TODO: think if any member can add users
            if (!isIdentityMemberOfConversation)
            {
                return ValidationProblem("You must be member of conversation in order to receive details", statusCode: StatusCodes.Status403Forbidden);
            }

            var createdConversationUserMeta = await _context.ConversationUsers
                .Include(x => x.User)
                .SingleOrDefaultAsync(x => x.ConversationId == conversationId && x.UserId == userId);

            if (createdConversationUserMeta == null)
            {
                return NotFound();
            }

            var resultModel = CreateApiConversationUser(createdConversationUserMeta);

            return Ok(resultModel);
        }

        private static ApiConversationUser CreateApiConversationUser(ConversationUser createdConversationUserMeta)
        {
            var resultModel = new ApiConversationUser(
                    createdConversationUserMeta.Id,
                    createdConversationUserMeta.UserId,
                    createdConversationUserMeta.ConversationId,
                    new ApiUser(
                            createdConversationUserMeta.UserId,
                            createdConversationUserMeta.User.UserName,
                            ConversationHub.Connections.GetConnections(createdConversationUserMeta.UserId).Any()
                                ? UserStatus.Online
                                : UserStatus.Offline /*TODO: make it nicer*/
                        )
                    { LastActivityTimestamp = createdConversationUserMeta.User.LastActivityTimestamp })
            { Nickname = createdConversationUserMeta.UserNickName };
            return resultModel;
        }

        [HttpGet("/api/conversations/{conversationId}/users")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<IEnumerable<ApiConversationUser>>> GetMany(Guid conversationId)
        {
            //TODO: authorize for specific conversation (maybe with in-memory cache? is it possible with custom authorize attribute)
            return (await _context.ConversationUsers
                    .Include(x => x.User)
                    .Where(x => x.ConversationId == conversationId)
                    .ToListAsync()) // if not materialized here, it was crashing in runtime (I don't remember, something related to linq, I didn't get the reason)
                .Select(CreateApiConversationUser)
                .ToList();
        }

        // POST: api/Conversations/{conversationId}/users
        // To protect from overposting attacks, enable the specific properties you want to bind to, for
        // more details, see https://go.microsoft.com/fwlink/?linkid=2123754.
        [HttpPost("/api/conversations/{conversationId}/users")]
        //[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        //[Authorize(AuthenticationSchemes = $"{JwtBearerDefaults.AuthenticationScheme},{CookieAuthenticationDefaults.AuthenticationScheme}")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<ApiConversationUser>> Post([FromRoute] Guid conversationId, [FromBody] ApiConversationAddUserModel model)
        {
            Guid userId = model.UserId;
            var currentUserId = Guid.Parse(User.Identity.GetSubjectId());
            var conversationUsers = await _context.ConversationUsers.Where(x => x.ConversationId == conversationId).ToListAsync();

            bool isIdentityMemberOfConversation = conversationUsers.Any(x => x.UserId == currentUserId); //TODO: think if any member can add users
            if (!isIdentityMemberOfConversation)
            {
                return ValidationProblem("You must be member of conversation in order to add other members", statusCode: StatusCodes.Status403Forbidden);
            }

            bool isUserToBeAddedAlreadyMember = conversationUsers.Any(x => x.UserId == userId);
            if (isUserToBeAddedAlreadyMember)
            {
                return ValidationProblem("User is already a member of the conversation");
            }

            var createdConversationUser = await _context.ConversationUsers.AddAsync(new ConversationUser
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ConversationId = conversationId
            });
            await _context.SaveChangesAsync();

            var createdConversationUserMeta = await _context.ConversationUsers
                    .Include(x => x.User)
                    .SingleAsync(x => x.Id == createdConversationUser.Entity.Id);

            var resultModel = CreateApiConversationUser(createdConversationUserMeta);

            // signalR notify
            var toBeNotifiedUserIds = conversationUsers.Select(x => x.UserId).ToList();
            toBeNotifiedUserIds.Add(userId);
            await _conversationHubContext.Clients.Users(toBeNotifiedUserIds.Select(x => x.ToString().ToLowerInvariant()).ToList()).ConversationUserAdded(resultModel);

            return CreatedAtAction("GetOne", new { conversationId = conversationId, userId = userId }, resultModel);
        }
    }
}