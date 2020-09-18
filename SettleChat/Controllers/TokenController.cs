using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SettleChat.Models;
using SettleChat.Persistence;
using SettleChat.Persistence.Models;

namespace SettleChat.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TokenController : ControllerBase
    {
        private readonly SettleChatDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ILogger<ConversationsController> _logger;

        public TokenController(SettleChatDbContext context, UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager, ILogger<ConversationsController> logger)
        {
            _context = context;
            _userManager = userManager;
            _signInManager = signInManager;
            _logger = logger;
        }

        // GET: api/Token/{token}
        [HttpGet("{token}")]
        public async Task<ActionResult<TokenModel>> ProcessToken(string token)
        {
            var user = (await _context.UserSecrets.Include(x => x.User).Where(x => x.Secret == token.ToUpperInvariant())
                .SingleAsync()).User;
            await _signInManager.SignInAsync(user, true);
            Guid conversationId = (await _context.Conversations
                .Where(x => x.ConversationUsers
                    .Any(cu => cu.User == user))
                .Select(x => x.Id)
                .SingleAsync());
            return new TokenModel
            {
                ConversationId = conversationId
            };
        }
    }
}