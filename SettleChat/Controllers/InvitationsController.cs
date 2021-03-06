using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SettleChat.Factories.Interfaces;
using SettleChat.Hubs;
using SettleChat.Models;
using SettleChat.Persistence;
using SettleChat.Persistence.Enums;
using SettleChat.Persistence.Models;

namespace SettleChat.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InvitationsController : ControllerBase
    {
        private readonly SettleChatDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ILogger<InvitationsController> _logger;
        private readonly IHubContext<ConversationHub, IConversationClient> _conversationHubContext;
        private readonly ISignalRGroupNameFactory _signalRGroupNameFactory;

        public InvitationsController(
            SettleChatDbContext context,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            ILogger<InvitationsController> logger,
            IHubContext<ConversationHub, IConversationClient> conversationHubContext,
            ISignalRGroupNameFactory signalRGroupNameFactory)
        {
            _context = context;
            _userManager = userManager;
            _signInManager = signInManager;
            _logger = logger;
            _conversationHubContext = conversationHubContext;
            _signalRGroupNameFactory = signalRGroupNameFactory;
        }

        [HttpGet("/api/invitations/{token}")]
        [AllowAnonymous]
        public async Task<ActionResult<InvitationModel>> GetInvitation([FromRoute] string token)
        {
            try
            {
                return await RetrieveInvitationModel(token);
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Receiving invitation for token '{token}'", token);
                return Problem();
            }
        }

        [HttpGet("/api/conversations/{conversationId}/invitations")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<InvitationModel[]>> GetInvitations([FromRoute] Guid conversationId)
        {
            Guid identityUserId = Guid.Parse(User.Identity.GetSubjectId());
            return await RetrieveInvitationModels(conversationId, identityUserId);
        }

        // To protect from overposting attacks, enable the specific properties you want to bind to, for
        // more details, see https://go.microsoft.com/fwlink/?linkid=2123754.
        [HttpPost("/api/conversations/{conversationId}/invitations")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<InvitationModel>> CreateInvitation(Guid conversationId, [FromBody] InvitationCreateModel model)
        {
            Guid identityUserId = Guid.Parse(User.Identity.GetSubjectId());

            var dbInvitation = await _context.Invitations.AddAsync(
                new Invitation(
                    Guid.NewGuid(),
                    conversationId,
                    identityUserId,
                    Guid.NewGuid().ToString()
                    )
                {
                    IsPermanent = model.IsPermanent
                });
            await _context.SaveChangesAsync();

            return await RetrieveInvitationModel(dbInvitation.Entity.Id);
        }

        // To protect from overposting attacks, enable the specific properties you want to bind to, for
        // more details, see https://go.microsoft.com/fwlink/?linkid=2123754.
        [HttpPost("/api/invitations/{token}")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        [AllowAnonymous]
        public async Task<ActionResult<InvitationModel>> AcceptInvitation(string token, [FromBody] InvitationAcceptModel model)
        {
            Guid? userId;
            if (model.ShouldCreateAnonymousUser)
            {
                if (User.IsAuthenticated())
                {
                    return ValidationProblem("Anonymous account cannot be created when user is already signed in");
                }
                var user = await CreateAnonymousUser();
                if (user == null)
                {
                    return Problem("Could not create anonymous user");
                }
                await _signInManager.SignInAsync(user, false);
                userId = user.Id;
            }
            else
            {
                userId = Guid.Parse(User.Identity.GetSubjectId());
            }

            var dbInvitation = await _context.Invitations.Where(x => x.Token == token).SingleOrDefaultAsync();
            if (dbInvitation == null || !dbInvitation.IsActive)
            {
                return ValidationProblem("The invitation either doesn't exist or is not active anymore");
            }

            if (await _context.ConversationUsers.AnyAsync(x =>
                x.ConversationId == dbInvitation.ConversationId && x.UserId == userId.Value))
            {
                return ValidationProblem("The user is already a member of the conversation");
            }

            if (!dbInvitation.IsPermanent)
            {
                dbInvitation.IsActive = false;
            }

            _context.ConversationUsers.Add(new ConversationUser
            {
                UserId = userId.Value,
                ConversationId = dbInvitation.ConversationId,
                Id = Guid.NewGuid(),
                UserNickName = model.Nickname
            });
            await _context.SaveChangesAsync();
            var conversationUserModel = _context.ConversationUsers.Include(x => x.User)
                .Where(x => x.ConversationId == dbInvitation.ConversationId && x.UserId == userId.Value).Select(x => new ApiConversationUser(x.Id, x.UserId, x.ConversationId)
                {
                    User = new ApiUser(x.UserId, x.User.UserName, ConversationHub.Connections.GetConnections(x.UserId).Any() ? UserStatus.Online : UserStatus.Offline),//TODO: make it nicer
                    Nickname = x.UserNickName
                }).Single();
            await _conversationHubContext.Clients
                .Group(_signalRGroupNameFactory.CreateConversationGroupName(dbInvitation.ConversationId))
                .ConversationUserAdded(conversationUserModel);
            return await RetrieveInvitationModel(dbInvitation.Id);
        }

        private async Task<ApplicationUser?> CreateAnonymousUser()
        {
            var user = new ApplicationUser
            {
                UserName = $"Anonymous_{Guid.NewGuid():N}",
            };
            var result = await _userManager.CreateAsync(user);
            if (!result.Succeeded)
            {
                return null;
            }
            await _context.SaveChangesAsync();
            return user;
        }

        private async Task<ActionResult<InvitationModel[]>> RetrieveInvitationModels(Guid conversationId, Guid invitedByUserId)
        {
            var dbInvitationsMetadata = await _context.Invitations
                .Where(x => x.ConversationId == conversationId && x.InvitedByUserId == invitedByUserId)
                .Include(x => x.Conversation)
                .ThenInclude(x => x.ConversationUsers)
                .ThenInclude(x => x.User)
                .ToListAsync();

            return dbInvitationsMetadata.Select(MapInvitationModel).ToArray();
        }

        private async Task<ActionResult<InvitationModel>> RetrieveInvitationModel(string token)
        {
            var dbInvitationMetadata = await _context.Invitations
                .Where(x => x.Token == token)
                .Include(x => x.Conversation)
                    .ThenInclude(x => x.ConversationUsers)
                        .ThenInclude(x => x.User)
                .SingleAsync();

            return MapInvitationModel(dbInvitationMetadata);
        }

        private async Task<ActionResult<InvitationModel>> RetrieveInvitationModel(Guid invitationId)
        {
            var dbInvitationMetadata = await _context.Invitations
                .Where(x => x.Id == invitationId)
                .Include(x => x.Conversation)
                    .ThenInclude(x => x.ConversationUsers)
                        .ThenInclude(x => x.User)
                .SingleAsync();

            return MapInvitationModel(dbInvitationMetadata);
        }

        private static InvitationModel MapInvitationModel(Invitation dbInvitationMetadata)
        {
            return new InvitationModel(dbInvitationMetadata.Id, dbInvitationMetadata.ConversationId, dbInvitationMetadata.InvitedByUser.UserName, dbInvitationMetadata.Token)
            {
                Created = dbInvitationMetadata.Created,
                ConversationTitle = dbInvitationMetadata.Conversation.Title,
                IsPermanent = dbInvitationMetadata.IsPermanent,
                IsActive = dbInvitationMetadata.IsActive,
                ConversationUsers = dbInvitationMetadata.Conversation
                    .ConversationUsers
                    .Select(x => new InvitationModel.InvitationConversationUser(x.UserId, x.UserNickName ?? x.User.UserName))
                    .ToList()
            };
        }
    }
}
