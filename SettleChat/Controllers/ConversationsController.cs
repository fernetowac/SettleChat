using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Internal;
using Microsoft.Extensions.Logging;
using SettleChat.Factories;
using SettleChat.Hubs;
using SettleChat.Models;
using SettleChat.Persistence;
using SettleChat.Persistence.Enums;
using SettleChat.Persistence.Models;

namespace SettleChat.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ConversationsController : ControllerBase
    {
        private readonly SettleChatDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ILogger<ConversationsController> _logger;
        private readonly ISystemClock _systemClock;
        private readonly IHubContext<ConversationHub, IConversationClient> _conversationHubContext;

        public ConversationsController(
            SettleChatDbContext context,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            ILogger<ConversationsController> logger,
            ISystemClock systemClock,
            IHubContext<ConversationHub, IConversationClient> conversationHubContext)
        {
            _context = context;
            _userManager = userManager;
            _signInManager = signInManager;
            _logger = logger;
            _systemClock = systemClock;
            _conversationHubContext = conversationHubContext;
        }

        // GET: api/Conversations
        [HttpGet]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<List<ApiConversation>>> GetConversations()
        {
            Guid userId = Guid.Parse(User.Identity.GetSubjectId());

            var queryResult = await _context.Conversations
                .Where(x => x.ConversationUsers
                    .Any(cu => cu.UserId == userId))
                // join with conversationUsers meta table
                .Join(
                    _context.ConversationUsers,
                    conversation => conversation.Id,
                    conversationUser => conversationUser.ConversationId,
                    (conversation, conversationUser) => new
                    {
                        Conversation = conversation,
                        ConversationUser = conversationUser
                    })
                // join with users
                .Join(
                    _context.Users,
                    combined => combined.ConversationUser.UserId,
                    user => user.Id,
                    (combined, user) => new
                    {
                        combined.Conversation,
                        combined.ConversationUser,
                        User = user
                    })
                // materialize the query before grouping, because EF Core cannot translate it to sql otherwise
                .ToListAsync();
            var conversationsWithMetadata = queryResult
                .GroupBy(x => x.Conversation)
                .Select(group => new ApiConversation(@group.Key.Id)
                {
                    Title = @group.Key.Title,
                    IsPublic = @group.Key.IsPublic,
                    Created = @group.Key.Created,
                    ConversationUsers = @group.Key
                        .ConversationUsers
                        .Select(conversationUser =>
                        new ApiConversationUser(conversationUser.Id, conversationUser.UserId, conversationUser.ConversationId,
                            new ApiUser(conversationUser.User.Id, conversationUser.User.UserName, ConversationHub.Connections.GetConnections(conversationUser.UserId).Any() ? UserStatus.Online : UserStatus.Offline)
                            {
                                LastActivityTimestamp = conversationUser.User.LastActivityTimestamp
                            })
                        {
                            Nickname = conversationUser.UserNickName
                        })
                        .ToList()
                })
                .ToList();
            return conversationsWithMetadata;
        }

        // GET: api/Conversations/5
        [HttpGet("{id}")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<ConversationModel>> GetConversation(Guid id)
        {
            var conversation = await _context.Conversations
                .Include(_conversation => _conversation.ConversationUsers)
                .ThenInclude(conversationUser => conversationUser.User)
                .Where(x => x.Id == id)
                .SingleOrDefaultAsync();

            if (conversation == null)
            {
                return NotFound();
            } //TODO: authorization (see POST method)

            //KeyValuePair<string, string> cookie = Request.Cookies.SingleOrDefault(x =>
            //    x.Key ==
            //    $"SettleAuth_{conversation.ConversationUsers.Select(conversationUser => conversationUser.Id)}");
            //if (Equals(cookie, default(KeyValuePair<string, string>)))
            //{
            //    return Unauthorized();
            //}

            //Guid userId = Guid.Parse(cookie.Key.TrimStart("SettleAuth_".ToCharArray()));
            //bool authorized = _context.UserSecrets.Any(x => x.UserId == userId && x.Secret == cookie.Value);
            //if (!authorized)
            //{
            //    return Unauthorized();
            //}

            Guid userId = Guid.Parse(User.Identity.GetSubjectId());
            if (!conversation.ConversationUsers.Exists(x => x.UserId == userId))
            {
                return Unauthorized();//TODO: return status 403
            }

            return new ConversationModel
            {
                Id = conversation.Id,
                IsPublic = conversation.IsPublic,
                Title = conversation.Title
            };
        }

        // PUT: api/Conversation/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for
        // more details, see https://go.microsoft.com/fwlink/?linkid=2123754.
        [HttpPut("{id}")]
        public async Task<ActionResult<ConversationModel>> PutConversation(Guid id, Conversation conversation)
        {
            if (id != conversation.Id)
            {
                return BadRequest();
            }

            _context.Entry(conversation).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ConversationExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            // notify conversation users
            var userIds = await _context.ConversationUsers
                .Where(x => x.ConversationId == conversation.Id)
                .Select(x => x.UserId.ToString().ToLowerInvariant())
                .ToListAsync();
            var updatedConversationModel = new ConversationModelFactory().Create(conversation);
            await _conversationHubContext.Clients.Users(userIds).ConversationUpdated(updatedConversationModel);
            return updatedConversationModel;
        }

        // TODO: consider alternative approach to this using JsonPatch: https://docs.microsoft.com/en-us/aspnet/core/web-api/jsonpatch?view=aspnetcore-3.0 , https://stackoverflow.com/questions/36767759/using-net-core-web-api-with-jsonpatchdocument
        [HttpPatch("{id}")]
        public async Task<ActionResult<ConversationModel>> PatchConversation(Guid id, ConversationPatchModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var conversation = await _context.Conversations.Include(x => x.ConversationUsers).SingleOrDefaultAsync(x => x.Id == id);
            //TODO: handle authorization (user must be admin in the conversation to be able to do changes)
            if (conversation == null)
            {
                return NotFound();
            }

            if (model.IsPublic.HasValue)
            {
                conversation.IsPublic = model.IsPublic.Value;
            }

            if (model.Title != null)
            {
                conversation.Title = model.Title;
            }

            await _context.SaveChangesAsync();

            var updatedConversation = new ConversationModelFactory().Create(conversation);
            var userIds = conversation.ConversationUsers.Select(x => x.UserId.ToString().ToLowerInvariant()).ToList();
            await _conversationHubContext.Clients.Users(userIds).ConversationUpdated(updatedConversation);
            return updatedConversation;
        }

        // POST: api/Conversation
        // To protect from overposting attacks, enable the specific properties you want to bind to, for
        // more details, see https://go.microsoft.com/fwlink/?linkid=2123754.
        [HttpPost]
        //[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        //[Authorize(AuthenticationSchemes = $"{JwtBearerDefaults.AuthenticationScheme},{CookieAuthenticationDefaults.AuthenticationScheme}")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        //[AllowAnonymous]
        public async Task<ActionResult<ApiConversation>> PostConversation(ApiConversationCreateModel model)
        {
            var inputDbConversation = new Conversation
            {
                Title = model.Title,
                Created = _systemClock.UtcNow
            };
            //if (User.Identity.IsAuthenticated)
            //{
            //    _logger.LogDebug(new EventId(5, "Testing EventId"), "Forbid result returned");
            //    return Forbid();
            //}
            //else
            //{
            //    _logger.LogDebug(new EventId(5, "Testing EventId"), "Challenge result returned");
            //    return Challenge();
            //}

            _context.Conversations.Add(inputDbConversation);

            //ApplicationUser applicationUser = await _context.Users.FindAsync(Guid.Parse(User.Identity.GetSubjectId()));
            var currentUserId = Guid.Parse(User.Identity.GetSubjectId());
            var currentUserEntry = _context.Entry(new ApplicationUser { Id = currentUserId });
            currentUserEntry.State = EntityState.Unchanged;//TODO: here it sometime crashes on "The instance of entity type 'ApplicationUser' cannot be tracked because another instance with the same key value for {'Id'} is already being tracked. When attaching existing entities, ensure that only one entity instance with a given key value is attached. Consider using 'DbContextOptionsBuilder.EnableSensitiveDataLogging' to see the conflicting key values."

            var conversationUser = new ConversationUser
            {
                Conversation = inputDbConversation,
                User = currentUserEntry.Entity
            };
            _context.ConversationUsers.Add(conversationUser);

            await _context.SaveChangesAsync();
            //if (!User.IsAuthenticated())
            //{
            //    await _signInManager.SignInAsync(applicationUser, false);
            //}

            var resultModel = new ApiConversation(inputDbConversation.Id)
            {
                Created = inputDbConversation.Created,
                IsPublic = inputDbConversation.IsPublic,
                Title = inputDbConversation.Title,
                ConversationUsers = new List<ApiConversationUser>
                {
                    new ApiConversationUser(
                        conversationUser.Id,
                        conversationUser.UserId,
                        conversationUser.ConversationId,
                        new ApiUser(currentUserId, User.FindFirstValue(ClaimTypes.NameIdentifier), UserStatus.Online)
                        )
                    {
                        Nickname = null
                    }
                }
            };

            return CreatedAtAction("GetConversation", new { id = conversationUser.Id }, resultModel);
        }

        private bool ConversationExists(Guid id)
        {
            return _context.Conversations.Any(e => e.Id == id);
        }
    }
}