using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SettleChat.Models;
using SettleChat.Persistence;
using SettleChat.Persistence.Enums;
using SettleChat.Persistence.Models;

namespace SettleChat.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly SettleChatDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<ConversationsController> _logger;

        public UserController(SettleChatDbContext context, UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager, ILogger<ConversationsController> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }

        // GET: api/Conversation
        [HttpGet("/api/conversations/{conversationId}/users")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<IEnumerable<UserModel>>> GetUsers(Guid conversationId)
        {
            //TODO: authorize for specific conversation
            return await _context.Users
                .Where(x =>
                    x.ConversationUsers
                        .Any(cu => cu.ConversationId == conversationId))
                .Select(x => new UserModel
                {
                    Id = x.Id,
                    Email = x.Email,
                    UserName = x.UserName,
                    Status = x.Status,
                    LastActivityTimestamp = x.LastActivityTimestamp
                })
                .ToListAsync();
        }

        // To protect from overposting attacks, enable the specific properties you want to bind to, for
        // more details, see https://go.microsoft.com/fwlink/?linkid=2123754.
        [HttpPost("/api/conversations/{conversationId}/users")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<UninvitedUserModel>> PostUser(Guid conversationId, UserCreateModel model)
        {
            var conversation = await _context.Conversations.FindAsync(conversationId);

            UserSecret userSecret;
            var user = new ApplicationUser
            {
                //TODO: check if such email already exists
                UserName = string.IsNullOrEmpty(model.UserName)
                    ? $"Anonymous_{Guid.NewGuid():N}"
                    : model.UserName,
                Email = model.Email,
                Status = UserStatus.Offline
            };
            var result = await _userManager.CreateAsync(user);
            if (result.Succeeded)
            {
                userSecret = new UserSecret { Secret = Guid.NewGuid().ToString(), User = user };
                await _context.UserSecrets.AddAsync(userSecret); //TODO generate strong hash
            }
            else
            {
                throw new NotImplementedException(); //TODO:
            }

            var conversationUser = new ConversationUser
            {
                Conversation = conversation,
                User = user
            };
            await _context.ConversationUsers.AddAsync(conversationUser);
            await _context.SaveChangesAsync();

            var resultModel = new UninvitedUserModel
            {
                UserName = user.UserName,
                Email = user.Email,
                Id = user.Id,
                Token = userSecret.Secret
            };
            return resultModel;
        }
    }
}