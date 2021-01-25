using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SettleChat.Models;
using SettleChat.Persistence;
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

        public InvitationsController(SettleChatDbContext context, UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager)
        {
            _context = context;
            _userManager = userManager;
            _signInManager = signInManager;
        }

        [HttpGet("/api/invitations/{token}")]
        [AllowAnonymous]
        public async Task<ActionResult<InvitationModel>> GetInvitation([FromRoute] string token)
        {
            return await RetrieveInvitationModel(token);
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
            Guid? userId = null;
            if (model.ShouldCreateAnonymousUser)
            {
                if (User.IsAuthenticated())
                {
                    //TODO: return error in json nicely
                    throw new InvalidOperationException();
                }
                var user = await CreateAnonymousUser();
                await _signInManager.SignInAsync(user, false);
                userId = user.Id;
            }
            else
            {
                userId = Guid.Parse(User.Identity.GetSubjectId());
            }

            if (userId == null)
            {
                //TODO: return error in json nicely
                throw new InvalidOperationException("user ID missing");
            }

            var dbInvitation = await _context.Invitations.Where(x => x.Token == token).SingleOrDefaultAsync();
            if (dbInvitation == null || !dbInvitation.IsActive)
            {
                //TODO: return error in json nicely
                throw new InvalidOperationException("invitation either doesn't exist or is not active anymore");
            }

            if (await _context.ConversationUsers.AnyAsync(x =>
                x.ConversationId == dbInvitation.ConversationId && x.UserId == userId))
            {
                //TODO: return error in json nicely
                throw new InvalidOperationException("user is already member of the conversation");
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

            return await RetrieveInvitationModel(dbInvitation.Id);
        }

        private async Task<ApplicationUser> CreateAnonymousUser()
        {
            var user = new ApplicationUser
            {
                UserName = $"Anonymous_{Guid.NewGuid():N}",
            };
            var result = await _userManager.CreateAsync(user);
            if (!result.Succeeded)
            {
                throw new NotImplementedException(); //TODO:
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
                ConversationUserNames = dbInvitationMetadata.Conversation
                    .ConversationUsers
                    .Select(x => x.UserNickName ?? x.User.UserName)
                    .ToList()
            };
        }
    }
}
