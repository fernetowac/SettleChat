using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using Microsoft.AspNetCore.Authorization;
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

        public InvitationsController(SettleChatDbContext context)
        {
            _context = context;
        }

        [HttpGet]
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
        public async Task<ActionResult<InvitationModel>> PostInvitation(Guid conversationId, [FromBody] InvitationCreateModel model)
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
