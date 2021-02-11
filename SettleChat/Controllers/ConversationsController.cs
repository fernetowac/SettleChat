using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using Microsoft.AspNetCore.Authorization;
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

        // GET: api/Conversation
        [HttpGet]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<IEnumerable<ConversationListItemModel>>> GetConversations()
        {
            Guid userId = Guid.Parse(User.Identity.GetSubjectId());

            var queryResult = await _context.Conversations
                .Where(x => x.ConversationUsers
                    .Any(cu => cu.UserId == userId))
                // Get single (if exists) latest message per conversation https://stackoverflow.com/a/2111420/1651606
                // TODO: this solution might not be the most optimal when there are many messages per conversation, as it makes cartesian product of {messages x messages} internally
                // left join conversation with its messages
                .SelectMany(
                    conversation => conversation.Messages
                        .DefaultIfEmpty(),
                    (conversation, message) =>
                        new
                        {
                            Conversation = new
                            {
                                conversation.Id,
                                conversation.Title,
                                conversation.IsPublic,
                                conversation.Created
                            },
                            Message = new
                            {
                                message.Id,
                                message.AuthorId,
                                message.Text,
                                message.Created
                            }
                        })
                // outer apply with messages that are newer as messages in previous join
                .SelectMany(
                    combined =>
                        _context.Messages.Where(
                                message =>
                                    message.Conversation.Id == combined.Conversation.Id
                                    && combined.Message.Created < message.Created
                                    || (
                                        combined.Message.Created == message.Created
                                        && combined.Message.Id != message.Id
                                        )
                                    )
                            .Select(x => x.Id)
                            .DefaultIfEmpty(),
                    (combined, newerMessageId) => new
                    {
                        combined.Conversation,
                        combined.Message,
                        NewerMessageId = newerMessageId
                    })
                // join with conversationUsers meta table
                .Join(
                    _context.ConversationUsers,
                    combined => combined.Conversation.Id,
                    conversationUser => conversationUser.ConversationId,
                    (combined, conversationUser) => new
                    {
                        combined.Conversation,
                        combined.Message,
                        conversationUser.UserId,
                        conversationUser.UserNickName,
                        combined.NewerMessageId
                    })
                // join with users
                .Join(
                    _context.Users,
                    combined => combined.UserId,
                    user => user.Id,
                    (combined, user) => new
                    {
                        combined.Conversation,
                        combined.Message,
                        Users = new
                        {
                            user.Id,
                            user.UserName,
                            combined.UserNickName
                        },
                        combined.NewerMessageId
                    })
                // only message for which no newer message exists
                .Where(x => x.NewerMessageId == null)
                // materialize the query before grouping, because EF Core cannot translate it to sql otherwise
                .ToListAsync();
            var conversationsWithMetadata = queryResult
                .GroupBy(x => new { x.Conversation, x.Message }) // Message can be null (is selected by left join) here even though VS doesn't thing so
                .Select(group => new ConversationListItemModel
                {
                    Id = @group.Key.Conversation.Id,
                    Title = @group.Key.Conversation.Title,
                    LastMessageText = @group.Key.Message.Id == Guid.Empty ? null : @group.Key.Message.Text,
                    LastMessageUserId = @group.Key.Message.Id == Guid.Empty ? null : (Guid?)@group.Key.Message.AuthorId,
                    LastActivityTimestamp = @group.Key.Message.Id == Guid.Empty ? @group.Key.Conversation.Created : @group.Key.Message.Created,
                    Users = @group.Select(u => new ConversationListItemUserModel
                    {
                        Id = u.Users.Id,
                        UserName = u.Users.UserName,
                        UserNickName = u.Users.UserNickName
                    }).ToList()
                }).ToList();
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
                return Unauthorized();
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
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        //[AllowAnonymous]
        public async Task<ActionResult<ConversationDetailModel>> PostConversation(ConversationCreateModel model)
        {
            //string token =
            //    "eyJhbGciOiJSUzI1NiIsImtpZCI6IkRldmVsb3BtZW50IiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE1OTg4Nzc2MDQsImV4cCI6MTU5ODg4MTIwNCwiaXNzIjoiaHR0cHM6Ly9sb2NhbGhvc3Q6NDQzMDAiLCJhdWQiOiJTZXR0bGVDaGF0QVBJIiwiY2xpZW50X2lkIjoiUG9zdE1hbiIsInN1YiI6Ijg0ZGUyNzZiLTlkMTctNGExOS04YzA1LTA4ZDg0YzY5MWQzMyIsImF1dGhfdGltZSI6MTU5ODg3MDM4MCwiaWRwIjoiR29vZ2xlIiwic2NvcGUiOlsib3BlbmlkIiwicHJvZmlsZSIsIlNldHRsZUNoYXRBUEkiLCJvZmZsaW5lX2FjY2VzcyJdLCJhbXIiOlsiZXh0ZXJuYWwiXX0.QuG2g1t3zUYMUBPqEnMQ0Iy_3kVRxd205coSt9MjRaLcWcADIsczlFV5Nh1vGVRKrHiqMrVUNrHSuhmG6XIauxUj00zTiZ0d2-Fxomhb96muJhN4gGlP-lQo0upClCRKZkhT5IfDbrjjrtE-gAnCBeE6dz01i5YLM7b4U2vguk8VDwo3f952D9Loynf3e9CO4lZU4_PJQpte0RUfLc5S_eo_iUc8QAoV6USXsKAGdvOkOHtFrXyh_h71pGbbxwI1P-Em8a2XiySAExcohr1yzKkLiLuRB1GInL_r5ArgICZqL20boeDpAtISof3u081SuVs5Z62mx0POLGFeTG1NMA";
            //SecurityToken validatedToken;
            //var tokenValidationParameters = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerOptions()
            //    .TokenValidationParameters;
            //var validated=ValidateSignature(token, tokenValidationParameters);
            //var claimsPrincipal = new SettleChat.Controllers.JwtSecurityTokenHandler().ValidateToken(token,
            //    tokenValidationParameters,
            //    out validatedToken);
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

            ApplicationUser applicationUser = null;
            //UserSecret userSecret;
            //if (User.IsAuthenticated())
            //{
            applicationUser = await _context.Users.FindAsync(Guid.Parse(User.Identity.GetSubjectId()));
            //userSecret = await _context.UserSecrets.AsQueryable().Where(x => x.UserId == applicationUser.Id)
            //    .SingleAsync();
            //}
            //else
            //{
            //    var user = new ApplicationUser
            //    {
            //        UserName = string.IsNullOrEmpty(model.Creator.Name)
            //            ? $"Anonymous_{Guid.NewGuid():N}"
            //            : model.Creator.Name,
            //        Email = model.Creator.Email
            //    };
            //    var result = await _userManager.CreateAsync(user);
            //    if (result.Succeeded)
            //    {
            //        userSecret = new UserSecret { Secret = Guid.NewGuid().ToString(), User = user };
            //        _context.UserSecrets.Add(userSecret); //TODO generate strong hash
            //        applicationUser = user;
            //    }
            //    else
            //    {
            //        throw new NotImplementedException(); //TODO:
            //    }
            //}

            //_context.Users.Add(applicationUser);

            //var inputDbInvitedUsers = model.InvitedUsers.Select(invitedUser => new User
            //{
            //    Name = invitedUser.Name,
            //    Email = invitedUser.Email
            //}).ToList();
            //_context.Users.AddRange(inputDbInvitedUsers);
            var conversationUser = new ConversationUser
            {
                Conversation = inputDbConversation,
                User = applicationUser
            };
            _context.ConversationUsers.Add(conversationUser);
            //_context.ConversationUsers.AddRange(inputDbInvitedUsers.Select(invitedDbUser => new ConversationUser
            //{
            //    User = invitedDbUser,
            //    Conversation = inputDbConversation
            //}));
            await _context.SaveChangesAsync();
            //if (!User.IsAuthenticated())
            //{
            //    await _signInManager.SignInAsync(applicationUser, false);
            //}

            var resultModel =
                new ConversationDetailModelFactory().Create(inputDbConversation, applicationUser,
                    new List<ConversationUser>());
            //Response.Cookies.Append($"SettleAuth_{conversationUser.UserId}", userSecret.Secret);

            return CreatedAtAction("GetConversation", new { id = conversationUser.Id }, resultModel);
        }

        private bool ConversationExists(Guid id)
        {
            return _context.Conversations.Any(e => e.Id == id);
        }
    }
}