using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SettleChat.Factories;
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

        public ConversationsController(SettleChatDbContext context, UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager, ILogger<ConversationsController> logger)
        {
            _context = context;
            _userManager = userManager;
            _signInManager = signInManager;
            _logger = logger;
        }

        // GET: api/Conversation
        [HttpGet]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<IEnumerable<Conversation>>> GetConversations()
        {
            Guid userId = Guid.Parse(User.Identity.GetSubjectId());
            return await _context.Conversations
                .Where(x => x.IsPublic || x.ConversationUsers
                    .Any(cu => cu.UserId == userId))
                .ToListAsync();
        }

        // GET: api/Conversation/5
        [HttpGet("{id}")]
        [Authorize(AuthenticationSchemes = "Identity.Application,Bearer")]
        public async Task<ActionResult<ConversationDetailModel>> GetConversation(Guid id)
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
            if (conversation.ConversationUsers.SingleOrDefault(x => x.UserId == userId) == null)
            {
                return Unauthorized();
            }

            var conversationModel = new ConversationDetailModelFactory().Create(conversation,
                conversation.ConversationUsers.Single(x => x.UserId == userId).User,
                conversation.ConversationUsers.Where(x => x.UserId != userId).Select(x => x.User).ToList());
            return conversationModel;
        }

        // PUT: api/Conversation/5
        // To protect from overposting attacks, enable the specific properties you want to bind to, for
        // more details, see https://go.microsoft.com/fwlink/?linkid=2123754.
        [HttpPut("{id}")]
        public async Task<IActionResult> PutConversation(Guid id, Conversation conversation)
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

            return NoContent();
        }

        // TODO: consider alternative approach to this using JsonPatch: https://docs.microsoft.com/en-us/aspnet/core/web-api/jsonpatch?view=aspnetcore-3.0 , https://stackoverflow.com/questions/36767759/using-net-core-web-api-with-jsonpatchdocument
        [HttpPatch("{id}")]
        public async Task<ActionResult<ConversationModel>> PatchConversation(Guid id, ConversationPatchModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var conversation = await _context.Conversations.SingleOrDefaultAsync(x => x.Id == id);
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
                Title = model.Title
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
                    new List<ApplicationUser>());
            //Response.Cookies.Append($"SettleAuth_{conversationUser.UserId}", userSecret.Secret);

            return CreatedAtAction("GetConversation", new { id = conversationUser.Id }, resultModel);
        }

        ///// <summary>
        ///// Reads and validates a 'JSON Web Token' (JWT) encoded as a JWS or JWE in Compact Serialized Format.
        ///// </summary>
        ///// <param name="token">the JWT encoded as JWE or JWS</param>
        ///// <param name="validationParameters">Contains validation parameters for the <see cref="JwtSecurityToken"/>.</param>
        ///// <param name="validatedToken">The <see cref="JwtSecurityToken"/> that was validated.</param>
        ///// <exception cref="ArgumentNullException"><paramref name="token"/> is null or whitespace.</exception>
        ///// <exception cref="ArgumentNullException"><paramref name="validationParameters"/> is null.</exception>
        ///// <exception cref="ArgumentException"><paramref name="token"/>.Length is greater than <see cref="TokenHandler.MaximumTokenSizeInBytes"/>.</exception>
        ///// <exception cref="ArgumentException"><paramref name="token"/> does not have 3 or 5 parts.</exception>
        ///// <exception cref="ArgumentException"><see cref="CanReadToken(string)"/> returns false.</exception>
        ///// <exception cref="SecurityTokenDecryptionFailedException"><paramref name="token"/> was a JWE was not able to be decrypted.</exception>
        ///// <exception cref="SecurityTokenEncryptionKeyNotFoundException"><paramref name="token"/> 'kid' header claim is not null AND decryption fails.</exception>
        ///// <exception cref="SecurityTokenException"><paramref name="token"/> 'enc' header claim is null or empty.</exception>
        ///// <exception cref="SecurityTokenExpiredException"><paramref name="token"/> 'exp' claim is &lt; DateTime.UtcNow.</exception>
        ///// <exception cref="SecurityTokenInvalidAudienceException"><see cref="TokenValidationParameters.ValidAudience"/> is null or whitespace and <see cref="TokenValidationParameters.ValidAudiences"/> is null. Audience is not validated if <see cref="TokenValidationParameters.ValidateAudience"/> is set to false.</exception>
        ///// <exception cref="SecurityTokenInvalidAudienceException"><paramref name="token"/> 'aud' claim did not match either <see cref="TokenValidationParameters.ValidAudience"/> or one of <see cref="TokenValidationParameters.ValidAudiences"/>.</exception>
        ///// <exception cref="SecurityTokenInvalidLifetimeException"><paramref name="token"/> 'nbf' claim is &gt; 'exp' claim.</exception>
        ///// <exception cref="SecurityTokenInvalidSignatureException"><paramref name="token"/>.signature is not properly formatted.</exception>
        ///// <exception cref="SecurityTokenNoExpirationException"><paramref name="token"/> 'exp' claim is missing and <see cref="TokenValidationParameters.RequireExpirationTime"/> is true.</exception>
        ///// <exception cref="SecurityTokenNoExpirationException"><see cref="TokenValidationParameters.TokenReplayCache"/> is not null and expirationTime.HasValue is false. When a TokenReplayCache is set, tokens require an expiration time.</exception>
        ///// <exception cref="SecurityTokenNotYetValidException"><paramref name="token"/> 'nbf' claim is &gt; DateTime.UtcNow.</exception>
        ///// <exception cref="SecurityTokenReplayAddFailedException"><paramref name="token"/> could not be added to the <see cref="TokenValidationParameters.TokenReplayCache"/>.</exception>
        ///// <exception cref="SecurityTokenReplayDetectedException"><paramref name="token"/> is found in the cache.</exception>
        ///// <returns> A <see cref="ClaimsPrincipal"/> from the JWT. Does not include claims found in the JWT header.</returns>
        ///// <remarks> 
        ///// Many of the exceptions listed above are not thrown directly from this method. See <see cref="Validators"/> to examin the call graph.
        ///// </remarks>
        //public ClaimsPrincipal ValidateToken(string token, TokenValidationParameters validationParameters, out SecurityToken validatedToken)
        //{
        //    if (string.IsNullOrWhiteSpace(token))
        //        throw LogHelper.LogArgumentNullException(nameof(token));

        //    if (validationParameters == null)
        //        throw LogHelper.LogArgumentNullException(nameof(validationParameters));

        //    if (token.Length > int.MaxValue)
        //        throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(TokenLogMessages.IDX10209, token.Length, int.MaxValue)));

        //    var tokenParts = token.Split(new char[] { '.' }, Microsoft.IdentityModel.JsonWebTokens.JwtConstants.MaxJwtSegmentCount + 1);
        //    if (tokenParts.Length != Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JwsSegmentCount && tokenParts.Length != Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JweSegmentCount)
        //        throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12741, token)));

        //    if (tokenParts.Length == Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JweSegmentCount)
        //    {
        //        var jwtToken = ReadJwtToken(token);
        //        var decryptedJwt = DecryptToken(jwtToken, validationParameters);
        //        var innerToken = ValidateSignature(decryptedJwt, validationParameters);
        //        InnerToken = innerToken;
        //        validatedToken = jwtToken;
        //        return ValidateTokenPayload(innerToken, validationParameters);
        //    }
        //    else
        //    {
        //        validatedToken = ValidateSignature(token, validationParameters);
        //        return ValidateTokenPayload(validatedToken as JwtSecurityToken, validationParameters);

        //    }
        //}

        ///// <summary>
        ///// Decrypts a JWE and returns the clear text 
        ///// </summary>
        ///// <param name="jwtToken">the JWE that contains the cypher text.</param>
        ///// <param name="validationParameters">contains crypto material.</param>
        ///// <returns>the decoded / cleartext contents of the JWE.</returns>
        ///// <exception cref="ArgumentNullException">if 'jwtToken' is null.</exception>
        ///// <exception cref="ArgumentNullException">if 'validationParameters' is null.</exception>
        ///// <exception cref="SecurityTokenException">if 'jwtToken.Header.enc' is null or empty.</exception>
        ///// <exception cref="SecurityTokenEncryptionKeyNotFoundException">if 'jwtToken.Header.kid' is not null AND decryption fails.</exception>
        ///// <exception cref="SecurityTokenDecryptionFailedException">if the JWE was not able to be decrypted.</exception>
        //protected string DecryptToken(JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
        //{
        //    if (jwtToken == null)
        //        throw LogHelper.LogArgumentNullException(nameof(jwtToken));

        //    if (validationParameters == null)
        //        throw LogHelper.LogArgumentNullException(nameof(validationParameters));

        //    if (string.IsNullOrEmpty(jwtToken.Header.Enc))
        //        throw LogHelper.LogExceptionMessage(new SecurityTokenException(LogHelper.FormatInvariant(TokenLogMessages.IDX10612)));

        //    var keys = GetContentEncryptionKeys(jwtToken, validationParameters);
        //    var decryptionSucceeded = false;
        //    byte[] decryptedTokenBytes = null;

        //    // keep track of exceptions thrown, keys that were tried
        //    var exceptionStrings = new StringBuilder();
        //    var keysAttempted = new StringBuilder();
        //    foreach (SecurityKey key in keys)
        //    {
        //        var cryptoProviderFactory = validationParameters.CryptoProviderFactory ?? key.CryptoProviderFactory;
        //        if (cryptoProviderFactory == null)
        //        {
        //            LogHelper.LogWarning(TokenLogMessages.IDX10607, key);
        //            continue;
        //        }

        //        if (!cryptoProviderFactory.IsSupportedAlgorithm(jwtToken.Header.Enc, key))
        //        {
        //            LogHelper.LogWarning(TokenLogMessages.IDX10611, jwtToken.Header.Enc, key);
        //            continue;
        //        }

        //        try
        //        {
        //            decryptedTokenBytes = DecryptToken(jwtToken, cryptoProviderFactory, key);
        //            decryptionSucceeded = true;
        //            break;
        //        }
        //        catch (Exception ex)
        //        {
        //            exceptionStrings.AppendLine(ex.ToString());
        //        }

        //        if (key != null)
        //            keysAttempted.AppendLine(key.ToString());
        //    }

        //    if (!decryptionSucceeded && keysAttempted.Length > 0)
        //        throw LogHelper.LogExceptionMessage(new SecurityTokenDecryptionFailedException(LogHelper.FormatInvariant(TokenLogMessages.IDX10603, keysAttempted, exceptionStrings, jwtToken.RawData)));

        //    if (!decryptionSucceeded)
        //        throw LogHelper.LogExceptionMessage(new SecurityTokenDecryptionFailedException(LogHelper.FormatInvariant(TokenLogMessages.IDX10609, jwtToken.RawData)));

        //    if (string.IsNullOrEmpty(jwtToken.Header.Zip))
        //        return Encoding.UTF8.GetString(decryptedTokenBytes);

        //    try
        //    {
        //        return JwtTokenUtilities.DecompressToken(decryptedTokenBytes, jwtToken.Header.Zip);
        //    }
        //    catch (Exception ex)
        //    {
        //        throw LogHelper.LogExceptionMessage(new SecurityTokenDecompressionFailedException(LogHelper.FormatInvariant(TokenLogMessages.IDX10679, jwtToken.Header.Zip), ex));
        //    }
        //}

        //public class TokenLogMessages
        //{
        //// 10500 - SignatureValidation
        //public const string IDX10500 = "IDX10500: Signature validation failed. No security keys were provided to validate the signature.";
        //public const string IDX10501 = "IDX10501: Signature validation failed. Unable to match key: \nkid: '{0}'.\nExceptions caught:\n '{1}'. \ntoken: '{2}'.";
        //public const string IDX10503 = "IDX10503: Signature validation failed. Keys tried: '{0}'.\nExceptions caught:\n '{1}'.\ntoken: '{2}'.";
        //public const string IDX10504 = "IDX10504: Unable to validate signature, token does not have a signature: '{0}'.";
        //public const string IDX10505 = "IDX10505: Signature validation failed. The user defined 'Delegate' specified on TokenValidationParameters returned null when validating token: '{0}'.";
        //public const string IDX10506 = "IDX10506: Signature validation failed. The user defined 'Delegate' specified on TokenValidationParameters did not return a '{0}', but returned a '{1}' when validating token: '{2}'.";
        //public const string IDX10507 = "IDX10507: Signature validation failed. ValidateSignature returned null when validating token: '{0}'.";
        //public const string IDX10508 = "IDX10508: Signature validation failed. Signature is improperly formatted.";
        //public const string IDX10509 = "IDX10509: Signature validation failed. The user defined 'Delegate' specified in TokenValidationParameters did not return a '{0}', but returned a '{1}' when reading token: '{2}'.";
        //public const string IDX10510 = "IDX10510: Signature validation failed. The user defined 'Delegate' specified in TokenValidationParameters returned null when reading token: '{0}'.";
        //public const string IDX10511 = "IDX10511: Signature validation failed. Keys tried: '{0}'. \nkid: '{1}'. \nExceptions caught:\n '{2}'.\ntoken: '{3}'.";

        //public const string IDX10209 = "IDX10209: Token has length: '{0}' which is larger than the MaximumTokenSizeInBytes: '{1}'.";
        //public const string IDX10242 = "IDX10242: Security token: '{0}' has a valid signature.";
        //public const string IDX10243 = "IDX10243: Reading issuer signing keys from validation parameters.";
        //public const string IDX10647 = "IDX10647: A CustomCryptoProvider was set and returned 'true' for IsSupportedAlgorithm(Algorithm: '{0}'), but Create.(algorithm, args) as '{1}' == NULL.";

        //// encryption / decryption
        //public const string IDX10600 = "IDX10600: Decryption failed. There are no security keys for decryption.";
        //public const string IDX10601 = "IDX10601: Decryption failed. Unable to match 'kid': '{0}', \ntoken: '{1}'.";
        //public const string IDX10603 = "IDX10603: Decryption failed. Keys tried: '{0}'.\nExceptions caught:\n '{1}'.\ntoken: '{2}'";
        //public const string IDX10604 = "IDX10604: Decryption failed. Exception: '{0}'.";
        //public const string IDX10605 = "IDX10605: Decryption failed. Only 'dir' is currently supported. JWE alg is: '{0}'.";
        //public const string IDX10606 = "IDX10606: Decryption failed. To decrypt a JWE there must be 5 parts. 'tokenParts' is of length: '{0}'.";
        //public const string IDX10607 = "IDX10607: Decryption skipping key: '{0}', both validationParameters.CryptoProviderFactory and key.CryptoProviderFactory are null.";
        //public const string IDX10608 = "IDX10608: Decryption skipping key: '{0}', it is not a '{1}'.";
        //public const string IDX10609 = "IDX10609: Decryption failed. No Keys tried: token: '{0}'.";
        //public const string IDX10610 = "IDX10610: Decryption failed. Could not create decryption provider. Key: '{0}', Algorithm: '{1}'.";
        //public const string IDX10611 = "IDX10611: Decryption failed. Encryption is not supported for: Algorithm: '{0}', SecurityKey: '{1}'.";
        //public const string IDX10612 = "IDX10612: Decryption failed. Header.Enc is null or empty, it must be specified.";
        //}

        //public class LogMessages
        //{
        //    // token creation
        //    internal const string IDX12401 = "IDX12401: Expires: '{0}' must be after NotBefore: '{1}'.";

        //    // JWT messages
        //    internal const string IDX12700 = "IDX12700: Error found while parsing date time. The '{0}' claim has value '{1}' which is could not be parsed to an integer.";
        //    internal const string IDX12701 = "IDX12701: Error found while parsing date time. The '{0}' claim has value '{1}' does not lie in the valid range.";
        //    internal const string IDX12706 = "IDX12706: '{0}' can only write SecurityTokens of type: '{1}', 'token' type is: '{2}'.";
        //    internal const string IDX12709 = "IDX12709: CanReadToken() returned false. JWT is not well formed: '{0}'.\nThe token needs to be in JWS or JWE Compact Serialization Format. (JWS): 'EncodedHeader.EndcodedPayload.EncodedSignature'. (JWE): 'EncodedProtectedHeader.EncodedEncryptedKey.EncodedInitializationVector.EncodedCiphertext.EncodedAuthenticationTag'.";
        //    internal const string IDX12710 = "IDX12710: Only a single 'Actor' is supported. Found second claim of type: '{0}', value: '{1}'";
        //    internal const string IDX12711 = "IDX12711: actor.BootstrapContext is not a string AND actor.BootstrapContext is not a JWT";
        //    internal const string IDX12712 = "IDX12712: actor.BootstrapContext is null. Creating the token using actor.Claims.";
        //    internal const string IDX12713 = "IDX12713: Creating actor value using actor.BootstrapContext(as string)";
        //    internal const string IDX12714 = "IDX12714: Creating actor value using actor.BootstrapContext.rawData";
        //    internal const string IDX12715 = "IDX12715: Creating actor value by writing the JwtSecurityToken created from actor.BootstrapContext";
        //    internal const string IDX12716 = "IDX12716: Decoding token: '{0}' into header, payload and signature.";
        //    internal const string IDX12720 = "IDX12720: Token string does not match the token formats: JWE (header.encryptedKey.iv.ciphertext.tag) or JWS (header.payload.signature)";
        //    internal const string IDX12721 = "IDX12721: Creating JwtSecurityToken: Issuer: '{0}', Audience: '{1}'";
        //    internal const string IDX12722 = "IDX12722: Creating security token from the header: '{0}', payload: '{1}' and raw signature: '{2}'.";
        //    internal const string IDX12723 = "IDX12723: Unable to decode the payload '{0}' as Base64Url encoded string. jwtEncodedString: '{1}'.";
        //    internal const string IDX12729 = "IDX12729: Unable to decode the header '{0}' as Base64Url encoded string. jwtEncodedString: '{1}'.";
        //    internal const string IDX12730 = "IDX12730: Failed to create the token encryption provider.";
        //    internal const string IDX12733 = "IDX12733: Unable to obtain a CryptoProviderFactory, both EncryptingCredentials.CryptoProviderFactory and EncryptingCredentials.Key.CrypoProviderFactory are both null.";
        //    internal const string IDX12735 = "IDX12735: If JwtSecurityToken.InnerToken != null, then JwtSecurityToken.Header.EncryptingCredentials must be set.";
        //    internal const string IDX12736 = "IDX12736: JwtSecurityToken.SigningCredentials is not supported when JwtSecurityToken.InnerToken is set.";
        //    internal const string IDX12737 = "IDX12737: EncryptingCredentials set on JwtSecurityToken.InnerToken is not supported.";
        //    internal const string IDX12738 = "IDX12738: Header.Cty != null, assuming JWS. Cty: '{0}'.";
        //    internal const string IDX12739 = "IDX12739: JWT: '{0}' has three segments but is not in proper JWS format.";
        //    internal const string IDX12740 = "IDX12740: JWT: '{0}' has five segments but is not in proper JWE format.";
        //    internal const string IDX12741 = "IDX12741: JWT: '{0}' must have three segments (JWS) or five segments (JWE).";
        //}

        //private JwtSecurityToken ValidateSignature(string token, TokenValidationParameters validationParameters)
        //{
        //    if (string.IsNullOrWhiteSpace(token))
        //        throw LogHelper.LogArgumentNullException(nameof(token));

        //    if (validationParameters == null)
        //        throw LogHelper.LogArgumentNullException(nameof(validationParameters));

        //    if (validationParameters.SignatureValidator != null)
        //    {
        //        var validatedJwtToken = validationParameters.SignatureValidator(token, validationParameters);
        //        if (validatedJwtToken == null)
        //            throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(TokenLogMessages.IDX10505, token)));

        //        var validatedJwt = validatedJwtToken as JwtSecurityToken;
        //        if (validatedJwt == null)
        //            throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(TokenLogMessages.IDX10506, typeof(JwtSecurityToken), validatedJwtToken.GetType(), token)));

        //        return validatedJwt;
        //    }

        //    JwtSecurityToken jwtToken = null;

        //    if (validationParameters.TokenReader != null)
        //    {
        //        var securityToken = validationParameters.TokenReader(token, validationParameters);
        //        if (securityToken == null)
        //            throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(TokenLogMessages.IDX10510, token)));

        //        jwtToken = securityToken as JwtSecurityToken;
        //        if (jwtToken == null)
        //            throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(TokenLogMessages.IDX10509, typeof(JwtSecurityToken), securityToken.GetType(), token)));
        //    }
        //    else
        //    {
        //        jwtToken = ReadJwtToken(token);
        //    }

        //    byte[] encodedBytes = Encoding.UTF8.GetBytes(jwtToken.RawHeader + "." + jwtToken.RawPayload);
        //    if (string.IsNullOrEmpty(jwtToken.RawSignature))
        //    {
        //        if (validationParameters.RequireSignedTokens)
        //            throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(TokenLogMessages.IDX10504, token)));
        //        else
        //            return jwtToken;
        //    }

        //    bool kidMatched = false;
        //    IEnumerable<SecurityKey> keys = null;
        //    if (validationParameters.IssuerSigningKeyResolver != null)
        //    {
        //        keys = validationParameters.IssuerSigningKeyResolver(token, jwtToken, jwtToken.Header.Kid, validationParameters);
        //    }
        //    else
        //    {
        //        var key = ResolveIssuerSigningKey(token, jwtToken, validationParameters);
        //        if (key != null)
        //        {
        //            kidMatched = true;
        //            keys = new List<SecurityKey> { key };
        //        }
        //    }

        //    if (keys == null)
        //    {
        //        // control gets here if:
        //        // 1. User specified delegate: IssuerSigningKeyResolver returned null
        //        // 2. ResolveIssuerSigningKey returned null
        //        // Try all the keys. This is the degenerate case, not concerned about perf.
        //        keys = GetAllSigningKeys(token, jwtToken, jwtToken.Header.Kid, validationParameters);
        //    }

        //    // keep track of exceptions thrown, keys that were tried
        //    var exceptionStrings = new StringBuilder();
        //    var keysAttempted = new StringBuilder();
        //    bool kidExists = !string.IsNullOrEmpty(jwtToken.Header.Kid);
        //    byte[] signatureBytes;

        //    try
        //    {
        //        signatureBytes = Base64UrlEncoder.DecodeBytes(jwtToken.RawSignature);
        //    }
        //    catch (FormatException e)
        //    {
        //        throw new SecurityTokenInvalidSignatureException(TokenLogMessages.IDX10508, e);
        //    }

        //    foreach (var key in keys)
        //    {
        //        try
        //        {
        //            if (ValidateSignature(encodedBytes, signatureBytes, key, jwtToken.Header.Alg, validationParameters))
        //            {
        //                LogHelper.LogInformation(TokenLogMessages.IDX10242, token);
        //                jwtToken.SigningKey = key;
        //                return jwtToken;
        //            }
        //        }
        //        catch (Exception ex)
        //        {
        //            exceptionStrings.AppendLine(ex.ToString());
        //        }

        //        if (key != null)
        //        {
        //            keysAttempted.AppendLine(key.ToString() + " , KeyId: " + key.KeyId);
        //            if (kidExists && !kidMatched && key.KeyId != null)
        //                kidMatched = jwtToken.Header.Kid.Equals(key.KeyId, key is X509SecurityKey ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
        //        }
        //    }

        //    if (kidExists)
        //    {
        //        if (kidMatched)
        //            throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(TokenLogMessages.IDX10511, keysAttempted, jwtToken.Header.Kid, exceptionStrings, jwtToken)));
        //        else
        //            throw LogHelper.LogExceptionMessage(new SecurityTokenSignatureKeyNotFoundException(LogHelper.FormatInvariant(TokenLogMessages.IDX10501, jwtToken.Header.Kid, exceptionStrings, jwtToken)));
        //    }
        //    else
        //    {
        //        if (keysAttempted.Length > 0)
        //            throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(TokenLogMessages.IDX10503, keysAttempted, exceptionStrings, jwtToken)));
        //        else
        //            throw LogHelper.LogExceptionMessage(new SecurityTokenSignatureKeyNotFoundException(TokenLogMessages.IDX10500));
        //    }
        //}

        ///// <summary>
        ///// Obtains a <see cref="SignatureProvider "/> and validates the signature.
        ///// </summary>
        ///// <param name="encodedBytes">Bytes to validate.</param>
        ///// <param name="signature">Signature to compare against.</param>
        ///// <param name="key"><See cref="SecurityKey"/> to use.</param>
        ///// <param name="algorithm">Crypto algorithm to use.</param>
        ///// <param name="validationParameters">Priority will be given to <see cref="TokenValidationParameters.CryptoProviderFactory"/> over <see cref="SecurityKey.CryptoProviderFactory"/>.</param>
        ///// <returns>'true' if signature is valid.</returns>
        //private bool ValidateSignature(byte[] encodedBytes, byte[] signature, SecurityKey key, string algorithm, TokenValidationParameters validationParameters)
        //{
        //    var cryptoProviderFactory = validationParameters.CryptoProviderFactory ?? key.CryptoProviderFactory;
        //    var signatureProvider = cryptoProviderFactory.CreateForVerifying(key, algorithm);
        //    if (signatureProvider == null)
        //        throw LogHelper.LogExceptionMessage(new InvalidOperationException(LogHelper.FormatInvariant(TokenLogMessages.IDX10647, (key == null ? "Null" : key.ToString()), (algorithm == null ? "Null" : algorithm))));

        //    try
        //    {
        //        return signatureProvider.Verify(encodedBytes, signature);
        //    }
        //    finally
        //    {
        //        cryptoProviderFactory.ReleaseSignatureProvider(signatureProvider);
        //    }
        //}

        //private IEnumerable<SecurityKey> GetAllSigningKeys(string token, JwtSecurityToken securityToken, string kid, TokenValidationParameters validationParameters)
        //{
        //    LogHelper.LogInformation(TokenLogMessages.IDX10243);
        //    if (validationParameters.IssuerSigningKey != null)
        //        yield return validationParameters.IssuerSigningKey;

        //    if (validationParameters.IssuerSigningKeys != null)
        //        foreach (SecurityKey key in validationParameters.IssuerSigningKeys)
        //            yield return key;
        //}

        ///// <summary>
        ///// Converts a string into an instance of <see cref="JwtSecurityToken"/>.
        ///// </summary>
        ///// <param name="token">A 'JSON Web Token' (JWT) in JWS or JWE Compact Serialization Format.</param>
        ///// <returns>A <see cref="JwtSecurityToken"/></returns>
        ///// <exception cref="ArgumentNullException">'token' is null or empty.</exception>
        ///// <exception cref="ArgumentException">'token.Length' is greater than <see cref="TokenHandler.MaximumTokenSizeInBytes"/>.</exception>
        ///// <exception cref="ArgumentException"><see cref="CanReadToken(string)"/></exception>
        ///// <remarks><para>If the 'token' is in JWE Compact Serialization format, only the protected header will be deserialized.</para>
        ///// This method is unable to decrypt the payload. Use <see cref="ValidateToken(string, TokenValidationParameters, out SecurityToken)"/>to obtain the payload.</remarks>
        //public JwtSecurityToken ReadJwtToken(string token)
        //{
        //    if (string.IsNullOrEmpty(token))
        //        throw LogHelper.LogArgumentNullException(nameof(token));

        //    if (token.Length > int.MaxValue)
        //        throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(TokenLogMessages.IDX10209, token.Length, int.MaxValue)));

        //    if (!CanReadToken(token))
        //        throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12709, token)));

        //    var jwtToken = new JwtSecurityToken();
        //    Decode(token.Split('.'), token);
        //    return jwtToken;
        //}


        ///// <summary>
        ///// Decodes the string into the header, payload and signature.
        ///// </summary>
        ///// <param name="tokenParts">the tokenized string.</param>
        ///// <param name="rawData">the original token.</param>
        //internal void Decode(string[] tokenParts, string rawData)
        //{
        //    LogHelper.LogInformation(LogMessages.IDX12716, rawData);
        //    try
        //    {
        //        Header = JwtHeader.Base64UrlDeserialize(tokenParts[0]);
        //    }
        //    catch (Exception ex)
        //    {
        //        throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12729, tokenParts[0], rawData), ex));
        //    }

        //    if (tokenParts.Length == Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JweSegmentCount)
        //        DecodeJwe(tokenParts);
        //    else
        //        DecodeJws(tokenParts);

        //    RawData = rawData;
        //}

        ///// <summary>
        ///// Decodes the payload and signature from the JWS parts.
        ///// </summary>
        ///// <param name="tokenParts">Parts of the JWS including the header.</param>
        ///// <remarks>Assumes Header has already been set.</remarks>
        //private void DecodeJws(string[] tokenParts)
        //{
        //    // Log if CTY is set, assume compact JWS
        //    if (Header.Cty != null)
        //        LogHelper.LogVerbose(LogHelper.FormatInvariant(LogMessages.IDX12738, Header.Cty));

        //    try
        //    {
        //        Payload = JwtPayload.Base64UrlDeserialize(tokenParts[1]);
        //    }
        //    catch (Exception ex)
        //    {
        //        throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12723, tokenParts[1], RawData), ex));
        //    }

        //    RawHeader = tokenParts[0];
        //    RawPayload = tokenParts[1];
        //    RawSignature = tokenParts[2];
        //}

        ///// <summary>
        ///// Decodes the payload and signature from the JWE parts.
        ///// </summary>
        ///// <param name="tokenParts">Parts of the JWE including the header.</param>
        ///// <remarks>Assumes Header has already been set.</remarks>
        //private void DecodeJwe(string[] tokenParts)
        //{
        //    RawHeader = tokenParts[0];
        //    RawEncryptedKey = tokenParts[1];
        //    RawInitializationVector = tokenParts[2];
        //    RawCiphertext = tokenParts[3];
        //    RawAuthenticationTag = tokenParts[4];
        //}

        ///// <summary>
        ///// Gets the original raw data of this instance when it was created.
        ///// </summary>
        ///// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="JwtSecurityToken(string)"/>
        ///// or <see cref="JwtSecurityToken( JwtHeader, JwtPayload, string, string, string )"/></remarks>
        //public string RawAuthenticationTag { get; private set; }

        ///// <summary>
        ///// Gets the original raw data of this instance when it was created.
        ///// </summary>
        ///// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="JwtSecurityToken(string)"/>
        ///// or <see cref="JwtSecurityToken( JwtHeader, JwtPayload, string, string, string )"/></remarks>
        //public string RawCiphertext { get; private set; }

        ///// <summary>
        ///// Gets the original raw data of this instance when it was created.
        ///// </summary>
        ///// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="JwtSecurityToken(string)"/>
        ///// or <see cref="JwtSecurityToken( JwtHeader, JwtPayload, string, string, string )"/></remarks>
        //public string RawData { get; private set; }

        ///// <summary>
        ///// Gets the original raw data of this instance when it was created.
        ///// </summary>
        ///// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="JwtSecurityToken(string)"/>
        ///// or <see cref="JwtSecurityToken( JwtHeader, JwtPayload, string, string, string )"/></remarks>
        //public string RawEncryptedKey { get; private set; }

        ///// <summary>
        ///// Gets the original raw data of this instance when it was created.
        ///// </summary>
        ///// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="JwtSecurityToken(string)"/>
        ///// or <see cref="JwtSecurityToken( JwtHeader, JwtPayload, string, string, string )"/></remarks>
        //public string RawInitializationVector { get; private set; }

        ///// <summary>
        ///// Gets the original raw data of this instance when it was created.
        ///// </summary>
        ///// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="JwtSecurityToken(string)"/>
        ///// or <see cref="JwtSecurityToken( JwtHeader, JwtPayload, string, string, string )"/></remarks>
        //public string RawHeader { get; internal set; }

        ///// <summary>
        ///// Gets the original raw data of this instance when it was created.
        ///// </summary>
        ///// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="JwtSecurityToken(string)"/>
        ///// or <see cref="JwtSecurityToken( JwtHeader, JwtPayload, string, string, string )"/></remarks>
        //public string RawPayload { get; internal set; }

        ///// <summary>
        ///// Gets the original raw data of this instance when it was created.
        ///// </summary>
        ///// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="JwtSecurityToken(string)"/>
        ///// or <see cref="JwtSecurityToken( JwtHeader, JwtPayload, string, string, string )"/></remarks>
        //public string RawSignature { get; internal set; }

        ///// <summary>/// <summary>
        ///// Gets the <see cref="JwtHeader"/> associated with this instance if the token is signed.
        ///// </summary>
        //public JwtHeader Header { get; internal set; }

        ///// <summary>
        ///// Gets the <see cref="JwtPayload"/> associated with this instance.
        ///// Note that if this JWT is nested ( <see cref="JwtSecurityToken.InnerToken"/> != null, this property represnts the payload of the most inner token.
        ///// This property can be null if the content type of the most inner token is unrecognized, in that case
        /////  the content of the token is the string returned by PlainText property.
        ///// </summary>
        //public JwtPayload Payload
        //{
        //    get
        //    {
        //        if (InnerToken != null)
        //            return InnerToken.Payload;
        //        return _payload;
        //    }
        //    internal set
        //    {
        //        _payload = value;
        //    }
        //}
        //private JwtPayload _payload;

        ///// <summary>
        ///// Gets the <see cref="JwtSecurityToken"/> associated with this instance.
        ///// </summary>
        //public JwtSecurityToken InnerToken { get; internal set; }

        ///// Determines if the string is a well formed Json Web Token (JWT).
        ///// <para>see: http://tools.ietf.org/html/rfc7519 </para>
        ///// </summary>
        ///// <param name="token">String that should represent a valid JWT.</param>
        ///// <remarks>Uses <see cref="Regex.IsMatch(string, string)"/> matching one of:
        ///// <para>JWS: @"^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$"</para>
        ///// <para>JWE: (dir): @"^[A-Za-z0-9-_]+\.\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$"</para>
        ///// <para>JWE: (wrappedkey): @"^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]$"</para>
        ///// </remarks>
        ///// <returns>
        ///// <para>'false' if the token is null or whitespace.</para>
        ///// <para>'false' if token.Length is greater than <see cref="TokenHandler.MaximumTokenSizeInBytes"/>.</para>
        ///// <para>'true' if the token is in JSON compact serialization format.</para>
        ///// </returns>
        //public bool CanReadToken(string token)
        //{
        //    if (string.IsNullOrWhiteSpace(token))
        //        return false;

        //    if (token.Length > int.MaxValue)
        //    {
        //        LogHelper.LogInformation(TokenLogMessages.IDX10209, token.Length, int.MaxValue);
        //        return false;
        //    }

        //    // Set the maximum number of segments to MaxJwtSegmentCount + 1. This controls the number of splits and allows detecting the number of segments is too large.
        //    // For example: "a.b.c.d.e.f.g.h" => [a], [b], [c], [d], [e], [f.g.h]. 6 segments.
        //    // If just MaxJwtSegmentCount was used, then [a], [b], [c], [d], [e.f.g.h] would be returned. 5 segments.
        //    string[] tokenParts = token.Split(new char[] { '.' }, Microsoft.IdentityModel.JsonWebTokens.JwtConstants.MaxJwtSegmentCount + 1);
        //    if (tokenParts.Length == Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JwsSegmentCount)
        //    {
        //        return JwtTokenUtilities.RegexJws.IsMatch(token);
        //    }
        //    else if (tokenParts.Length == Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JweSegmentCount)
        //    {
        //        return JwtTokenUtilities.RegexJwe.IsMatch(token);
        //    }

        //    LogHelper.LogInformation(LogMessages.IDX12720);
        //    return false;
        //}

        ///// <summary>
        ///// Returns a <see cref="SecurityKey"/> to use when validating the signature of a token.
        ///// </summary>
        ///// <param name="token">The <see cref="string"/> representation of the token that is being validated.</param>
        ///// <param name="jwtToken">The <see cref="JwtSecurityToken"/> that is being validated.</param>
        ///// <param name="validationParameters">A <see cref="TokenValidationParameters"/>  required for validation.</param>
        ///// <returns>Returns a <see cref="SecurityKey"/> to use for signature validation.</returns>
        ///// <remarks>If key fails to resolve, then null is returned</remarks>
        //protected virtual SecurityKey ResolveIssuerSigningKey(string token, JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
        //{
        //    if (validationParameters == null)
        //        throw LogHelper.LogArgumentNullException(nameof(validationParameters));

        //    if (jwtToken == null)
        //        throw LogHelper.LogArgumentNullException(nameof(jwtToken));

        //    return FindKeyMatch(jwtToken.Header.Kid, jwtToken.Header.X5t, validationParameters.IssuerSigningKey, validationParameters.IssuerSigningKeys);
        //}

        ///// <summary>
        ///// Has extra code for X509SecurityKey keys where the kid or x5t match in a case insensitive manner.
        ///// </summary>
        ///// <param name="kid"></param>
        ///// <param name="x5t"></param>
        ///// <param name="securityKey"></param>
        ///// <param name="keys"></param>
        ///// <returns>a key if found, null otherwise.</returns>
        //internal static SecurityKey FindKeyMatch(string kid, string x5t, SecurityKey securityKey, IEnumerable<SecurityKey> keys)
        //{
        //    // the code could be in a routine, but I chose to have duplicate code instead for performance
        //    if (keys == null && securityKey == null)
        //        return null;

        //    if (securityKey is X509SecurityKey x509SecurityKey1)
        //    {
        //        if (string.Equals(x5t, x509SecurityKey1.X5t, StringComparison.OrdinalIgnoreCase)
        //        || string.Equals(x5t, x509SecurityKey1.KeyId, StringComparison.OrdinalIgnoreCase)
        //        || string.Equals(kid, x509SecurityKey1.X5t, StringComparison.OrdinalIgnoreCase)
        //        || string.Equals(kid, x509SecurityKey1.KeyId, StringComparison.OrdinalIgnoreCase))
        //            return securityKey;
        //    }
        //    else if (string.Equals(securityKey?.KeyId, kid, StringComparison.Ordinal))
        //    {
        //        return securityKey;
        //    }

        //    if (keys != null)
        //    {
        //        foreach (var key in keys)
        //        {
        //            if (key is X509SecurityKey x509SecurityKey2)
        //            {
        //                if (string.Equals(x5t, x509SecurityKey2.X5t, StringComparison.OrdinalIgnoreCase)
        //                || string.Equals(x5t, x509SecurityKey2.KeyId, StringComparison.OrdinalIgnoreCase)
        //                || string.Equals(kid, x509SecurityKey2.X5t, StringComparison.OrdinalIgnoreCase)
        //                || string.Equals(kid, x509SecurityKey2.KeyId, StringComparison.OrdinalIgnoreCase))
        //                    return key;
        //            }
        //            else if (string.Equals(key?.KeyId, kid, StringComparison.Ordinal))
        //            {
        //                return key;
        //            }
        //        }
        //    }

        //    return null;
        //}

        // DELETE: api/Conversation/5
        [HttpDelete("{id}")]
        public async Task<ActionResult<Conversation>> DeleteConversation(Guid id)
        {
            var conversation = await _context.Conversations.FindAsync(id);
            if (conversation == null)
            {
                return NotFound();
            }

            _context.Conversations.Remove(conversation);
            await _context.SaveChangesAsync();

            return conversation;
        }

        private bool ConversationExists(Guid id)
        {
            return _context.Conversations.Any(e => e.Id == id);
        }
    }
}
//    public class JwtSecurityTokenHandler : SecurityTokenHandler
//    {

//        private delegate bool CertMatcher(X509Certificate2 cert);
//        private ISet<string> _inboundClaimFilter;
//        private IDictionary<string, string> _inboundClaimTypeMap;
//        private static string _jsonClaimType = _namespace + "/json_type";
//        private const string _namespace = "http://schemas.xmlsoap.org/ws/2005/05/identity/claimproperties";
//        private IDictionary<string, string> _outboundClaimTypeMap;
//        private IDictionary<string, string> _outboundAlgorithmMap = null;
//        private static string _shortClaimType = _namespace + "/ShortTypeName";
//        private bool _mapInboundClaims = DefaultMapInboundClaims;

//        /// <summary>
//        /// Default claim type mapping for inbound claims.
//        /// </summary>
//        public static IDictionary<string, string> DefaultInboundClaimTypeMap = ClaimTypeMapping.InboundClaimTypeMap;

//        /// <summary>
//        /// Default value for the flag that determines whether or not the InboundClaimTypeMap is used.
//        /// </summary>
//        public static bool DefaultMapInboundClaims = true;

//        /// <summary>
//        /// Default claim type mapping for outbound claims.
//        /// </summary>
//        public static IDictionary<string, string> DefaultOutboundClaimTypeMap = ClaimTypeMapping.OutboundClaimTypeMap;

//        /// <summary>
//        /// Default claim type filter list.
//        /// </summary>
//        public static ISet<string> DefaultInboundClaimFilter = ClaimTypeMapping.InboundClaimFilter;

//        /// <summary>
//        /// Default JwtHeader algorithm mapping
//        /// </summary>
//        public static IDictionary<string, string> DefaultOutboundAlgorithmMap;

//        /// <summary>
//        /// Static initializer for a new object. Static initializers run before the first instance of the type is created.
//        /// </summary>
//        static JwtSecurityTokenHandler()
//        {
//            LogHelper.LogVerbose("Assembly version info: " + typeof(System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler).AssemblyQualifiedName);
//            DefaultOutboundAlgorithmMap = new Dictionary<string, string>
//            {
//                 { SecurityAlgorithms.EcdsaSha256Signature, SecurityAlgorithms.EcdsaSha256 },
//                 { SecurityAlgorithms.EcdsaSha384Signature, SecurityAlgorithms.EcdsaSha384 },
//                 { SecurityAlgorithms.EcdsaSha512Signature, SecurityAlgorithms.EcdsaSha512 },
//                 { SecurityAlgorithms.HmacSha256Signature, SecurityAlgorithms.HmacSha256 },
//                 { SecurityAlgorithms.HmacSha384Signature, SecurityAlgorithms.HmacSha384 },
//                 { SecurityAlgorithms.HmacSha512Signature, SecurityAlgorithms.HmacSha512 },
//                 { SecurityAlgorithms.RsaSha256Signature, SecurityAlgorithms.RsaSha256 },
//                 { SecurityAlgorithms.RsaSha384Signature, SecurityAlgorithms.RsaSha384 },
//                 { SecurityAlgorithms.RsaSha512Signature, SecurityAlgorithms.RsaSha512 },
//            };
//        }

//        /// <summary>
//        /// Initializes a new instance of the <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler"/> class.
//        /// </summary>
//        public JwtSecurityTokenHandler()
//        {
//            if (_mapInboundClaims)
//                _inboundClaimTypeMap = new Dictionary<string, string>(DefaultInboundClaimTypeMap);
//            else
//                _inboundClaimTypeMap = new Dictionary<string, string>();

//            _outboundClaimTypeMap = new Dictionary<string, string>(DefaultOutboundClaimTypeMap);
//            _inboundClaimFilter = new HashSet<string>(DefaultInboundClaimFilter);
//            _outboundAlgorithmMap = new Dictionary<string, string>(DefaultOutboundAlgorithmMap);
//        }

//        /// <summary>
//        /// Gets or sets the <see cref="MapInboundClaims"/> property which is used when determining whether or not to map claim types that are extracted when validating a <see cref="JwtSecurityToken"/>. 
//        /// <para>If this is set to true, the <see cref="Claim.Type"/> is set to the JSON claim 'name' after translating using this mapping. Otherwise, no mapping occurs.</para>
//        /// <para>The default value is true.</para>
//        /// </summary>
//        public bool MapInboundClaims
//        {
//            get
//            {
//                return _mapInboundClaims;
//            }

//            set
//            {
//                // If the inbound claim type mapping was turned off and is being turned on for the first time, make sure that the _inboundClaimTypeMap is populated with the default mappings.
//                if (!_mapInboundClaims && value && _inboundClaimTypeMap.Count == 0)
//                    _inboundClaimTypeMap = new Dictionary<string, string>(DefaultInboundClaimTypeMap);

//                _mapInboundClaims = value;
//            }
//        }

//        /// <summary>
//        /// Gets or sets the <see cref="InboundClaimTypeMap"/> which is used when setting the <see cref="Claim.Type"/> for claims in the <see cref="ClaimsPrincipal"/> extracted when validating a <see cref="JwtSecurityToken"/>. 
//        /// <para>The <see cref="Claim.Type"/> is set to the JSON claim 'name' after translating using this mapping.</para>
//        /// <para>The default value is ClaimTypeMapping.InboundClaimTypeMap.</para>
//        /// </summary>
//        /// <exception cref="ArgumentNullException">'value' is null.</exception>
//        public IDictionary<string, string> InboundClaimTypeMap
//        {
//            get
//            {
//                return _inboundClaimTypeMap;
//            }

//            set
//            {
//                _inboundClaimTypeMap = value ?? throw LogHelper.LogArgumentNullException(nameof(value));
//            }
//        }

//        /// <summary>
//        /// <para>Gets or sets the <see cref="OutboundClaimTypeMap"/> which is used when creating a <see cref="JwtSecurityToken"/> from <see cref="Claim"/>(s).</para>
//        /// <para>The JSON claim 'name' value is set to <see cref="Claim.Type"/> after translating using this mapping.</para>
//        /// <para>The default value is ClaimTypeMapping.OutboundClaimTypeMap</para>
//        /// </summary>
//        /// <remarks>This mapping is applied only when using <see cref="JwtPayload.AddClaim"/> or <see cref="JwtPayload.AddClaims"/>. Adding values directly will not result in translation.</remarks>
//        /// <exception cref="ArgumentNullException">'value' is null.</exception>
//        public IDictionary<string, string> OutboundClaimTypeMap
//        {
//            get
//            {
//                return _outboundClaimTypeMap;
//            }

//            set
//            {
//                if (value == null)
//                    throw LogHelper.LogArgumentNullException(nameof(value));

//                _outboundClaimTypeMap = value;
//            }
//        }

//        /// <summary>
//        /// Gets the outbound algorithm map that is passed to the <see cref="JwtHeader"/> constructor.
//        /// </summary>
//        public IDictionary<string, string> OutboundAlgorithmMap
//        {
//            get
//            {
//                return _outboundAlgorithmMap;
//            }
//        }


//        /// <summary>Gets or sets the <see cref="ISet{String}"/> used to filter claims when populating a <see cref="ClaimsIdentity"/> claims form a <see cref="JwtSecurityToken"/>.
//        /// When a <see cref="JwtSecurityToken"/> is validated, claims with types found in this <see cref="ISet{String}"/> will not be added to the <see cref="ClaimsIdentity"/>.
//        /// <para>The default value is ClaimTypeMapping.InboundClaimFilter.</para>
//        /// </summary>
//        /// <exception cref="ArgumentNullException">'value' is null.</exception>
//        public ISet<string> InboundClaimFilter
//        {
//            get
//            {
//                return _inboundClaimFilter;
//            }

//            set
//            {
//                if (value == null)
//                    throw LogHelper.LogArgumentNullException(nameof(value));

//                _inboundClaimFilter = value;
//            }
//        }

//        /// <summary>
//        /// Gets or sets the property name of <see cref="Claim.Properties"/> the will contain the original JSON claim 'name' if a mapping occurred when the <see cref="Claim"/>(s) were created.
//        /// <para>See <seealso cref="InboundClaimTypeMap"/> for more information.</para>
//        /// </summary>
//        /// <exception cref="ArgumentException">If <see cref="string"/>.IsNullOrWhiteSpace('value') is true.</exception>
//        public static string ShortClaimTypeProperty
//        {
//            get
//            {
//                return _shortClaimType;
//            }

//            set
//            {
//                if (string.IsNullOrWhiteSpace(value))
//                    throw LogHelper.LogArgumentNullException(nameof(value));

//                _shortClaimType = value;
//            }
//        }

//        /// <summary>
//        /// Gets or sets the property name of <see cref="Claim.Properties"/> the will contain .Net type that was recognized when JwtPayload.Claims serialized the value to JSON.
//        /// <para>See <seealso cref="InboundClaimTypeMap"/> for more information.</para>
//        /// </summary>
//        /// <exception cref="ArgumentException">If <see cref="string"/>.IsNullOrWhiteSpace('value') is true.</exception>
//        public static string JsonClaimTypeProperty
//        {
//            get
//            {
//                return _jsonClaimType;
//            }

//            set
//            {
//                if (string.IsNullOrWhiteSpace(value))
//                    throw LogHelper.LogArgumentNullException(nameof(value));

//                _jsonClaimType = value;
//            }
//        }

//        /// <summary>
//        /// Returns a value that indicates if this handler can validate a <see cref="SecurityToken"/>.
//        /// </summary>
//        /// <returns>'true', indicating this instance can validate a <see cref="JwtSecurityToken"/>.</returns>
//        public override bool CanValidateToken
//        {
//            get { return true; }
//        }

//        /// <summary>
//        /// Gets the value that indicates if this instance can write a <see cref="SecurityToken"/>.
//        /// </summary>
//        /// <returns>'true', indicating this instance can write a <see cref="JwtSecurityToken"/>.</returns>
//        public override bool CanWriteToken
//        {
//            get { return true; }
//        }

//        /// <summary>
//        /// Gets the type of the <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/>.
//        /// </summary>
//        /// <return>The type of <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/></return>
//        public override Type TokenType
//        {
//            get { return typeof(JwtSecurityToken); }
//        }

//        /// <summary>
//        /// Determines if the string is a well formed Json Web Token (JWT).
//        /// <para>see: http://tools.ietf.org/html/rfc7519 </para>
//        /// </summary>
//        /// <param name="token">String that should represent a valid JWT.</param>
//        /// <remarks>Uses <see cref="Regex.IsMatch(string, string)"/> matching one of:
//        /// <para>JWS: @"^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$"</para>
//        /// <para>JWE: (dir): @"^[A-Za-z0-9-_]+\.\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$"</para>
//        /// <para>JWE: (wrappedkey): @"^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]$"</para>
//        /// </remarks>
//        /// <returns>
//        /// <para>'false' if the token is null or whitespace.</para>
//        /// <para>'false' if token.Length is greater than <see cref="TokenHandler.MaximumTokenSizeInBytes"/>.</para>
//        /// <para>'true' if the token is in JSON compact serialization format.</para>
//        /// </returns>
//        public override bool CanReadToken(string token)
//        {
//            if (string.IsNullOrWhiteSpace(token))
//                return false;

//            if (token.Length > MaximumTokenSizeInBytes)
//            {
//                LogHelper.LogInformation(Microsoft.IdentityModel.Tokens.LogMessages.IDX10209, token.Length, MaximumTokenSizeInBytes);
//                return false;
//            }

//            // Set the maximum number of segments to MaxJwtSegmentCount + 1. This controls the number of splits and allows detecting the number of segments is too large.
//            // For example: "a.b.c.d.e.f.g.h" => [a], [b], [c], [d], [e], [f.g.h]. 6 segments.
//            // If just MaxJwtSegmentCount was used, then [a], [b], [c], [d], [e.f.g.h] would be returned. 5 segments.
//            string[] tokenParts = token.Split(new char[] { '.' }, JwtConstants.MaxJwtSegmentCount + 1);
//            if (tokenParts.Length == JwtConstants.JwsSegmentCount)
//            {
//                return JwtTokenUtilities.RegexJws.IsMatch(token);
//            }
//            else if (tokenParts.Length == JwtConstants.JweSegmentCount)
//            {
//                return JwtTokenUtilities.RegexJwe.IsMatch(token);
//            }

//            LogHelper.LogInformation(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12720);
//            return false;
//        }

//        /// <summary>
//        /// Returns a Json Web Token (JWT).
//        /// </summary>
//        /// <param name="tokenDescriptor">A <see cref="SecurityTokenDescriptor"/> that contains details of contents of the token.</param>
//        /// <remarks>A JWS and JWE can be returned.
//        /// <para>If <see cref="SecurityTokenDescriptor.EncryptingCredentials"/>is provided, then a JWE will be created.</para>
//        /// <para>If <see cref="SecurityTokenDescriptor.SigningCredentials"/> is provided then a JWS will be created.</para>
//        /// <para>If both are provided then a JWE with an embedded JWS will be created.</para>
//        /// </remarks>
//        public virtual string CreateEncodedJwt(SecurityTokenDescriptor tokenDescriptor)
//        {
//            if (tokenDescriptor == null)
//                throw LogHelper.LogArgumentNullException(nameof(tokenDescriptor));

//            return CreateJwtSecurityToken(tokenDescriptor).RawData;
//        }

//        /// <summary>
//        /// Creates a JWT in 'Compact Serialization Format'.
//        /// </summary>
//        /// <param name="issuer">The issuer of the token.</param>
//        /// <param name="audience">The audience for this token.</param>
//        /// <param name="subject">The source of the <see cref="Claim"/>(s) for this token.</param>
//        /// <param name="notBefore">The notbefore time for this token.</param>
//        /// <param name="expires">The expiration time for this token.</param>
//        /// <param name="issuedAt">The issue time for this token.</param>
//        /// <param name="signingCredentials">Contains cryptographic material for generating a signature.</param>
//        /// <remarks>If <see cref="ClaimsIdentity.Actor"/> is not null, then a claim { actort, 'value' } will be added to the payload. See <see cref="CreateActorValue"/> for details on how the value is created.
//        /// <para>See <seealso cref="JwtHeader"/> for details on how the HeaderParameters are added to the header.</para>
//        /// <para>See <seealso cref="JwtPayload"/> for details on how the values are added to the payload.</para>
//        /// <para>Each <see cref="Claim"/> in the <paramref name="subject"/> will map <see cref="Claim.Type"/> by applying <see cref="OutboundClaimTypeMap"/>. Modifying <see cref="OutboundClaimTypeMap"/> could change the outbound JWT.</para>
//        /// <para>If <see cref="SigningCredentials"/> is provided, then a JWS will be created.</para>
//        /// </remarks>
//        /// <returns>A Base64UrlEncoded string in 'Compact Serialization Format'.</returns>
//        public virtual string CreateEncodedJwt(string issuer, string audience, ClaimsIdentity subject, DateTime? notBefore, DateTime? expires, DateTime? issuedAt, SigningCredentials signingCredentials)
//        {
//            return CreateJwtSecurityTokenPrivate(issuer, audience, subject, notBefore, expires, issuedAt, signingCredentials, null).RawData;
//        }

//        /// <summary>
//        /// Creates a JWT in 'Compact Serialization Format'.
//        /// </summary>
//        /// <param name="issuer">The issuer of the token.</param>
//        /// <param name="audience">The audience for this token.</param>
//        /// <param name="subject">The source of the <see cref="Claim"/>(s) for this token.</param>
//        /// <param name="notBefore">Translated into 'epoch time' and assigned to 'nbf'.</param>
//        /// <param name="expires">Translated into 'epoch time' and assigned to 'exp'.</param>
//        /// <param name="issuedAt">Translated into 'epoch time' and assigned to 'iat'.</param>
//        /// <param name="signingCredentials">Contains cryptographic material for signing.</param>
//        /// <param name="encryptingCredentials">Contains cryptographic material for encrypting.</param>
//        /// <remarks>If <see cref="ClaimsIdentity.Actor"/> is not null, then a claim { actort, 'value' } will be added to the payload. <see cref="CreateActorValue"/> for details on how the value is created.
//        /// <para>See <seealso cref="JwtHeader"/> for details on how the HeaderParameters are added to the header.</para>
//        /// <para>See <seealso cref="JwtPayload"/> for details on how the values are added to the payload.</para>
//        /// <para>Each <see cref="Claim"/> in the <paramref name="subject"/> will map <see cref="Claim.Type"/> by applying <see cref="OutboundClaimTypeMap"/>. Modifying <see cref="OutboundClaimTypeMap"/> could change the outbound JWT.</para>
//        /// </remarks>
//        /// <returns>A Base64UrlEncoded string in 'Compact Serialization Format'.</returns>
//        /// <exception cref="ArgumentException">If 'expires' &lt;= 'notBefore'.</exception>
//        public virtual string CreateEncodedJwt(string issuer, string audience, ClaimsIdentity subject, DateTime? notBefore, DateTime? expires, DateTime? issuedAt, SigningCredentials signingCredentials, EncryptingCredentials encryptingCredentials)
//        {
//            return CreateJwtSecurityTokenPrivate(issuer, audience, subject, notBefore, expires, issuedAt, signingCredentials, encryptingCredentials).RawData;
//        }

//        /// <summary>
//        /// Creates a Json Web Token (JWT).
//        /// </summary>
//        /// <param name="tokenDescriptor"> A <see cref="SecurityTokenDescriptor"/> that contains details of contents of the token.</param>
//        /// <remarks><see cref="SecurityTokenDescriptor.SigningCredentials"/> is used to sign <see cref="JwtSecurityToken.RawData"/>.</remarks>
//        public virtual JwtSecurityToken CreateJwtSecurityToken(SecurityTokenDescriptor tokenDescriptor)
//        {
//            if (tokenDescriptor == null)
//                throw LogHelper.LogArgumentNullException(nameof(tokenDescriptor));

//#pragma warning disable 0618 // 'SecurityTokenDescriptor.Subject' is obsolete.
//            return CreateJwtSecurityTokenPrivate(
//                tokenDescriptor.Issuer,
//                tokenDescriptor.Audience,
//                tokenDescriptor.Subject,
//                tokenDescriptor.NotBefore,
//                tokenDescriptor.Expires,
//                tokenDescriptor.IssuedAt,
//                tokenDescriptor.SigningCredentials,
//                tokenDescriptor.EncryptingCredentials);
//#pragma warning restore 0618 // 'SecurityTokenDescriptor.Subject' is obsolete.
//        }

//        /// <summary>
//        /// Creates a <see cref="JwtSecurityToken"/>
//        /// </summary>
//        /// <param name="issuer">The issuer of the token.</param>
//        /// <param name="audience">The audience for this token.</param>
//        /// <param name="subject">The source of the <see cref="Claim"/>(s) for this token.</param>
//        /// <param name="notBefore">The notbefore time for this token.</param>
//        /// <param name="expires">The expiration time for this token.</param>
//        /// <param name="issuedAt">The issue time for this token.</param>
//        /// <param name="signingCredentials">Contains cryptographic material for generating a signature.</param>
//        /// <param name="encryptingCredentials">Contains cryptographic material for encrypting the token.</param>
//        /// <remarks>If <see cref="ClaimsIdentity.Actor"/> is not null, then a claim { actort, 'value' } will be added to the payload. <see cref="CreateActorValue"/> for details on how the value is created.
//        /// <para>See <seealso cref="JwtHeader"/> for details on how the HeaderParameters are added to the header.</para>
//        /// <para>See <seealso cref="JwtPayload"/> for details on how the values are added to the payload.</para>
//        /// <para>Each <see cref="Claim"/> on the <paramref name="subject"/> added will have <see cref="Claim.Type"/> translated according to the mapping found in
//        /// <see cref="OutboundClaimTypeMap"/>. Adding and removing to <see cref="OutboundClaimTypeMap"/> will affect the name component of the Json claim.</para>
//        /// <para><see cref="SigningCredentials"/> is used to sign <see cref="JwtSecurityToken.RawData"/>.</para>
//        /// <para><see cref="EncryptingCredentials"/> is used to encrypt <see cref="JwtSecurityToken.RawData"/> or <see cref="JwtSecurityToken.RawPayload"/> .</para>
//        /// </remarks>
//        /// <returns>A <see cref="JwtSecurityToken"/>.</returns>
//        /// <exception cref="ArgumentException">If 'expires' &lt;= 'notBefore'.</exception>
//        public virtual JwtSecurityToken CreateJwtSecurityToken(string issuer, string audience, ClaimsIdentity subject, DateTime? notBefore, DateTime? expires, DateTime? issuedAt, SigningCredentials signingCredentials, EncryptingCredentials encryptingCredentials)
//        {
//            return CreateJwtSecurityTokenPrivate(issuer, audience, subject, notBefore, expires, issuedAt, signingCredentials, encryptingCredentials);
//        }

//        /// <summary>
//        /// Creates a <see cref="JwtSecurityToken"/>
//        /// </summary>
//        /// <param name="issuer">The issuer of the token.</param>
//        /// <param name="audience">The audience for this token.</param>
//        /// <param name="subject">The source of the <see cref="Claim"/>(s) for this token.</param>
//        /// <param name="notBefore">The notbefore time for this token.</param>
//        /// <param name="expires">The expiration time for this token.</param>
//        /// <param name="issuedAt">The issue time for this token.</param>
//        /// <param name="signingCredentials">Contains cryptographic material for generating a signature.</param>
//        /// <remarks>If <see cref="ClaimsIdentity.Actor"/> is not null, then a claim { actort, 'value' } will be added to the payload. <see cref="CreateActorValue"/> for details on how the value is created.
//        /// <para>See <seealso cref="JwtHeader"/> for details on how the HeaderParameters are added to the header.</para>
//        /// <para>See <seealso cref="JwtPayload"/> for details on how the values are added to the payload.</para>
//        /// <para>Each <see cref="Claim"/> on the <paramref name="subject"/> added will have <see cref="Claim.Type"/> translated according to the mapping found in
//        /// <see cref="OutboundClaimTypeMap"/>. Adding and removing to <see cref="OutboundClaimTypeMap"/> will affect the name component of the Json claim.</para>
//        /// <para><see cref="SigningCredentials"/> is used to sign <see cref="JwtSecurityToken.RawData"/>.</para>
//        /// </remarks>
//        /// <returns>A <see cref="JwtSecurityToken"/>.</returns>
//        /// <exception cref="ArgumentException">If 'expires' &lt;= 'notBefore'.</exception>
//        public virtual JwtSecurityToken CreateJwtSecurityToken(string issuer = null, string audience = null, ClaimsIdentity subject = null, DateTime? notBefore = null, DateTime? expires = null, DateTime? issuedAt = null, SigningCredentials signingCredentials = null)
//        {
//            return CreateJwtSecurityTokenPrivate(issuer, audience, subject, notBefore, expires, issuedAt, signingCredentials, null);
//        }

//        /// <summary>
//        /// Creates a Json Web Token (JWT).
//        /// </summary>
//        /// <param name="tokenDescriptor"> A <see cref="SecurityTokenDescriptor"/> that contains details of contents of the token.</param>
//        /// <remarks><see cref="SecurityTokenDescriptor.SigningCredentials"/> is used to sign <see cref="JwtSecurityToken.RawData"/>.</remarks>
//        public override SecurityToken CreateToken(SecurityTokenDescriptor tokenDescriptor)
//        {
//            if (tokenDescriptor == null)
//                throw LogHelper.LogArgumentNullException(nameof(tokenDescriptor));

//#pragma warning disable 0618 // 'SecurityTokenDescriptor.Subject' is obsolete.
//            return CreateJwtSecurityTokenPrivate(
//                tokenDescriptor.Issuer,
//                tokenDescriptor.Audience,
//                tokenDescriptor.Subject,
//                tokenDescriptor.NotBefore,
//                tokenDescriptor.Expires,
//                tokenDescriptor.IssuedAt,
//                tokenDescriptor.SigningCredentials,
//                tokenDescriptor.EncryptingCredentials);
//#pragma warning restore 0618 // 'SecurityTokenDescriptor.Subject' is obsolete.
//        }

//        private JwtSecurityToken CreateJwtSecurityTokenPrivate(string issuer, string audience, ClaimsIdentity subject, DateTime? notBefore, DateTime? expires, DateTime? issuedAt, SigningCredentials signingCredentials, EncryptingCredentials encryptingCredentials)
//        {
//            if (SetDefaultTimesOnTokenCreation && (!expires.HasValue || !issuedAt.HasValue || !notBefore.HasValue))
//            {
//                DateTime now = DateTime.UtcNow;
//                if (!expires.HasValue)
//                    expires = now + TimeSpan.FromMinutes(TokenLifetimeInMinutes);

//                if (!issuedAt.HasValue)
//                    issuedAt = now;

//                if (!notBefore.HasValue)
//                    notBefore = now;
//            }

//            LogHelper.LogVerbose(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12721, (audience ?? "null"), (issuer ?? "null"));
//            JwtPayload payload = new JwtPayload(issuer, audience, (subject == null ? null : OutboundClaimTypeTransform(subject.Claims)), notBefore, expires, issuedAt);
//            JwtHeader header = signingCredentials == null ? new JwtHeader() : new JwtHeader(signingCredentials, OutboundAlgorithmMap);

//            if (subject?.Actor != null)
//                payload.AddClaim(new Claim(JwtRegisteredClaimNames.Actort, CreateActorValue(subject.Actor)));

//            string rawHeader = header.Base64UrlEncode();
//            string rawPayload = payload.Base64UrlEncode();
//            string rawSignature = signingCredentials == null ? string.Empty : JwtTokenUtilities.CreateEncodedSignature(string.Concat(rawHeader, ".", rawPayload), signingCredentials);

//            LogHelper.LogInformation(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12722, rawHeader, rawPayload, rawSignature);

//            if (encryptingCredentials != null)
//                return EncryptToken(new JwtSecurityToken(header, payload, rawHeader, rawPayload, rawSignature), encryptingCredentials);
//            else
//                return new JwtSecurityToken(header, payload, rawHeader, rawPayload, rawSignature);
//        }

//        private JwtSecurityToken EncryptToken(JwtSecurityToken innerJwt, EncryptingCredentials encryptingCredentials)
//        {
//            var cryptoProviderFactory = encryptingCredentials.CryptoProviderFactory ?? encryptingCredentials.Key.CryptoProviderFactory;

//            if (cryptoProviderFactory == null)
//                throw LogHelper.LogExceptionMessage(new ArgumentException(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12733));

//            if (encryptingCredentials == null)
//                throw LogHelper.LogArgumentNullException(nameof(encryptingCredentials));

//            // if direct algorithm, look for support
//            if (JwtConstants.DirectKeyUseAlg.Equals(encryptingCredentials.Alg, StringComparison.Ordinal))
//            {
//                if (!cryptoProviderFactory.IsSupportedAlgorithm(encryptingCredentials.Enc, encryptingCredentials.Key))
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10615, encryptingCredentials.Enc, encryptingCredentials.Key)));

//                var header = new JwtHeader(encryptingCredentials, OutboundAlgorithmMap);
//                var encryptionProvider = cryptoProviderFactory.CreateAuthenticatedEncryptionProvider(encryptingCredentials.Key, encryptingCredentials.Enc);
//                if (encryptionProvider == null)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12730));

//                try
//                {
//                    var encryptionResult = encryptionProvider.Encrypt(Encoding.UTF8.GetBytes(innerJwt.RawData), Encoding.ASCII.GetBytes(header.Base64UrlEncode()));
//                    return new JwtSecurityToken(
//                                    header,
//                                    innerJwt,
//                                    header.Base64UrlEncode(),
//                                    string.Empty,
//                                    Base64UrlEncoder.Encode(encryptionResult.IV),
//                                    Base64UrlEncoder.Encode(encryptionResult.Ciphertext),
//                                    Base64UrlEncoder.Encode(encryptionResult.AuthenticationTag));
//                }
//                catch (Exception ex)
//                {
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10616, encryptingCredentials.Enc, encryptingCredentials.Key), ex));
//                }
//            }
//            else
//            {
//                if (!cryptoProviderFactory.IsSupportedAlgorithm(encryptingCredentials.Alg, encryptingCredentials.Key))
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10615, encryptingCredentials.Alg, encryptingCredentials.Key)));

//                SymmetricSecurityKey symmetricKey = null;

//                // only 128, 384 and 512 AesCbcHmac for CEK algorithm
//                if (SecurityAlgorithms.Aes128CbcHmacSha256.Equals(encryptingCredentials.Enc, StringComparison.Ordinal))
//                    symmetricKey = new SymmetricSecurityKey(JwtTokenUtilities.GenerateKeyBytes(256));
//                else if (SecurityAlgorithms.Aes192CbcHmacSha384.Equals(encryptingCredentials.Enc, StringComparison.Ordinal))
//                    symmetricKey = new SymmetricSecurityKey(JwtTokenUtilities.GenerateKeyBytes(384));
//                else if (SecurityAlgorithms.Aes256CbcHmacSha512.Equals(encryptingCredentials.Enc, StringComparison.Ordinal))
//                    symmetricKey = new SymmetricSecurityKey(JwtTokenUtilities.GenerateKeyBytes(512));
//                else
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10617, SecurityAlgorithms.Aes128CbcHmacSha256, SecurityAlgorithms.Aes192CbcHmacSha384, SecurityAlgorithms.Aes256CbcHmacSha512, encryptingCredentials.Enc)));

//                var kwProvider = cryptoProviderFactory.CreateKeyWrapProvider(encryptingCredentials.Key, encryptingCredentials.Alg);
//                var wrappedKey = kwProvider.WrapKey(symmetricKey.Key);
//                var encryptionProvider = cryptoProviderFactory.CreateAuthenticatedEncryptionProvider(symmetricKey, encryptingCredentials.Enc);
//                if (encryptionProvider == null)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12730));

//                try
//                {
//                    var header = new JwtHeader(encryptingCredentials, OutboundAlgorithmMap);
//                    var encryptionResult = encryptionProvider.Encrypt(Encoding.UTF8.GetBytes(innerJwt.RawData), Encoding.ASCII.GetBytes(header.Base64UrlEncode()));
//                    return new JwtSecurityToken(
//                                    header,
//                                    innerJwt,
//                                    header.Base64UrlEncode(),
//                                    Base64UrlEncoder.Encode(wrappedKey),
//                                    Base64UrlEncoder.Encode(encryptionResult.IV),
//                                    Base64UrlEncoder.Encode(encryptionResult.Ciphertext),
//                                    Base64UrlEncoder.Encode(encryptionResult.AuthenticationTag));
//                }
//                catch (Exception ex)
//                {
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10616, encryptingCredentials.Enc, encryptingCredentials.Key), ex));
//                }
//            }
//        }

//        private IEnumerable<Claim> OutboundClaimTypeTransform(IEnumerable<Claim> claims)
//        {
//            foreach (Claim claim in claims)
//            {
//                string type = null;
//                if (_outboundClaimTypeMap.TryGetValue(claim.Type, out type))
//                {
//                    yield return new Claim(type, claim.Value, claim.ValueType, claim.Issuer, claim.OriginalIssuer, claim.Subject);
//                }
//                else
//                {
//                    yield return claim;
//                }
//            }
//        }

//        /// <summary>
//        /// Converts a string into an instance of <see cref="JwtSecurityToken"/>.
//        /// </summary>
//        /// <param name="token">A 'JSON Web Token' (JWT) in JWS or JWE Compact Serialization Format.</param>
//        /// <returns>A <see cref="JwtSecurityToken"/></returns>
//        /// <exception cref="ArgumentNullException">'token' is null or empty.</exception>
//        /// <exception cref="ArgumentException">'token.Length' is greater than <see cref="TokenHandler.MaximumTokenSizeInBytes"/>.</exception>
//        /// <exception cref="ArgumentException"><see cref="CanReadToken(string)"/></exception>
//        /// <remarks><para>If the 'token' is in JWE Compact Serialization format, only the protected header will be deserialized.</para>
//        /// This method is unable to decrypt the payload. Use <see cref="ValidateToken(string, TokenValidationParameters, out SecurityToken)"/>to obtain the payload.</remarks>
//        public JwtSecurityToken ReadJwtToken(string token)
//        {
//            if (string.IsNullOrEmpty(token))
//                throw LogHelper.LogArgumentNullException(nameof(token));

//            if (token.Length > MaximumTokenSizeInBytes)
//                throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10209, token.Length, MaximumTokenSizeInBytes)));

//            if (!CanReadToken(token))
//                throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12709, token)));

//            var jwtToken = new JwtSecurityToken();
//            jwtToken.Decode(token.Split('.'), token);
//            return jwtToken;
//        }

//        /// <summary>
//        /// Converts a string into an instance of <see cref="JwtSecurityToken"/>.
//        /// </summary>
//        /// <param name="token">A 'JSON Web Token' (JWT) in JWS or JWE Compact Serialization Format.</param>
//        /// <returns>A <see cref="JwtSecurityToken"/></returns>
//        /// <exception cref="ArgumentNullException">'token' is null or empty.</exception>
//        /// <exception cref="ArgumentException">'token.Length' is greater than <see cref="TokenHandler.MaximumTokenSizeInBytes"/>.</exception>
//        /// <exception cref="ArgumentException"><see cref="CanReadToken(string)"/></exception>
//        /// <remarks><para>If the 'token' is in JWE Compact Serialization format, only the protected header will be deserialized.</para>
//        /// This method is unable to decrypt the payload. Use <see cref="ValidateToken(string, TokenValidationParameters, out SecurityToken)"/>to obtain the payload.</remarks>
//        public override SecurityToken ReadToken(string token)
//        {
//            return ReadJwtToken(token);
//        }

//        /// <summary>
//        /// Deserializes token with the provided <see cref="TokenValidationParameters"/>.
//        /// </summary>
//        /// <param name="reader"><see cref="XmlReader"/>.</param>
//        /// <param name="validationParameters">The current <see cref="TokenValidationParameters"/>.</param>
//        /// <returns>The <see cref="SecurityToken"/></returns>
//        /// <remarks>This method is not current supported.</remarks>
//        public override SecurityToken ReadToken(XmlReader reader, TokenValidationParameters validationParameters)
//        {
//            throw new NotImplementedException();
//        }

//        /// <summary>
//        /// Reads and validates a 'JSON Web Token' (JWT) encoded as a JWS or JWE in Compact Serialized Format.
//        /// </summary>
//        /// <param name="token">the JWT encoded as JWE or JWS</param>
//        /// <param name="validationParameters">Contains validation parameters for the <see cref="JwtSecurityToken"/>.</param>
//        /// <param name="validatedToken">The <see cref="JwtSecurityToken"/> that was validated.</param>
//        /// <exception cref="ArgumentNullException"><paramref name="token"/> is null or whitespace.</exception>
//        /// <exception cref="ArgumentNullException"><paramref name="validationParameters"/> is null.</exception>
//        /// <exception cref="ArgumentException"><paramref name="token"/>.Length is greater than <see cref="TokenHandler.MaximumTokenSizeInBytes"/>.</exception>
//        /// <exception cref="ArgumentException"><paramref name="token"/> does not have 3 or 5 parts.</exception>
//        /// <exception cref="ArgumentException"><see cref="CanReadToken(string)"/> returns false.</exception>
//        /// <exception cref="SecurityTokenDecryptionFailedException"><paramref name="token"/> was a JWE was not able to be decrypted.</exception>
//        /// <exception cref="SecurityTokenEncryptionKeyNotFoundException"><paramref name="token"/> 'kid' header claim is not null AND decryption fails.</exception>
//        /// <exception cref="SecurityTokenException"><paramref name="token"/> 'enc' header claim is null or empty.</exception>
//        /// <exception cref="SecurityTokenExpiredException"><paramref name="token"/> 'exp' claim is &lt; DateTime.UtcNow.</exception>
//        /// <exception cref="SecurityTokenInvalidAudienceException"><see cref="TokenValidationParameters.ValidAudience"/> is null or whitespace and <see cref="TokenValidationParameters.ValidAudiences"/> is null. Audience is not validated if <see cref="TokenValidationParameters.ValidateAudience"/> is set to false.</exception>
//        /// <exception cref="SecurityTokenInvalidAudienceException"><paramref name="token"/> 'aud' claim did not match either <see cref="TokenValidationParameters.ValidAudience"/> or one of <see cref="TokenValidationParameters.ValidAudiences"/>.</exception>
//        /// <exception cref="SecurityTokenInvalidLifetimeException"><paramref name="token"/> 'nbf' claim is &gt; 'exp' claim.</exception>
//        /// <exception cref="SecurityTokenInvalidSignatureException"><paramref name="token"/>.signature is not properly formatted.</exception>
//        /// <exception cref="SecurityTokenNoExpirationException"><paramref name="token"/> 'exp' claim is missing and <see cref="TokenValidationParameters.RequireExpirationTime"/> is true.</exception>
//        /// <exception cref="SecurityTokenNoExpirationException"><see cref="TokenValidationParameters.TokenReplayCache"/> is not null and expirationTime.HasValue is false. When a TokenReplayCache is set, tokens require an expiration time.</exception>
//        /// <exception cref="SecurityTokenNotYetValidException"><paramref name="token"/> 'nbf' claim is &gt; DateTime.UtcNow.</exception>
//        /// <exception cref="SecurityTokenReplayAddFailedException"><paramref name="token"/> could not be added to the <see cref="TokenValidationParameters.TokenReplayCache"/>.</exception>
//        /// <exception cref="SecurityTokenReplayDetectedException"><paramref name="token"/> is found in the cache.</exception>
//        /// <returns> A <see cref="ClaimsPrincipal"/> from the JWT. Does not include claims found in the JWT header.</returns>
//        /// <remarks> 
//        /// Many of the exceptions listed above are not thrown directly from this method. See <see cref="Validators"/> to examin the call graph.
//        /// </remarks>
//        public override ClaimsPrincipal ValidateToken(string token, TokenValidationParameters validationParameters, out SecurityToken validatedToken)
//        {
//            if (string.IsNullOrWhiteSpace(token))
//                throw LogHelper.LogArgumentNullException(nameof(token));

//            if (validationParameters == null)
//                throw LogHelper.LogArgumentNullException(nameof(validationParameters));

//            if (token.Length > MaximumTokenSizeInBytes)
//                throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10209, token.Length, MaximumTokenSizeInBytes)));

//            var tokenParts = token.Split(new char[] { '.' }, JwtConstants.MaxJwtSegmentCount + 1);
//            if (tokenParts.Length != JwtConstants.JwsSegmentCount && tokenParts.Length != JwtConstants.JweSegmentCount)
//                throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12741, token)));

//            if (tokenParts.Length == JwtConstants.JweSegmentCount)
//            {
//                var jwtToken = ReadJwtToken(token);
//                var decryptedJwt = DecryptToken(jwtToken, validationParameters);
//                var innerToken = ValidateSignature(decryptedJwt, validationParameters);
//                jwtToken.InnerToken = innerToken;
//                validatedToken = jwtToken;
//                return ValidateTokenPayload(innerToken, validationParameters);
//            }
//            else
//            {
//                validatedToken = ValidateSignature(token, validationParameters);
//                return ValidateTokenPayload(validatedToken as JwtSecurityToken, validationParameters);

//            }
//        }

//        /// <summary>
//        /// Validates the JSON payload of a <see cref="JwtSecurityToken"/>.
//        /// </summary>
//        /// <param name="jwtToken">The token to validate.</param>
//        /// <param name="validationParameters">Contains validation parameters for the <see cref="JwtSecurityToken"/>.</param>
//        /// <returns>A <see cref="ClaimsPrincipal"/> from the jwt. Does not include the header claims.</returns>
//        protected ClaimsPrincipal ValidateTokenPayload(JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
//        {
//            DateTime? expires = (jwtToken.Payload.Exp == null) ? null : new DateTime?(jwtToken.ValidTo);
//            DateTime? notBefore = (jwtToken.Payload.Nbf == null) ? null : new DateTime?(jwtToken.ValidFrom);

//            ValidateLifetime(notBefore, expires, jwtToken, validationParameters);
//            ValidateAudience(jwtToken.Audiences, jwtToken, validationParameters);
//            string issuer = ValidateIssuer(jwtToken.Issuer, jwtToken, validationParameters);
//            ValidateTokenReplay(expires, jwtToken.RawData, validationParameters);
//            if (validationParameters.ValidateActor && !string.IsNullOrWhiteSpace(jwtToken.Actor))
//            {
//                ValidateToken(jwtToken.Actor, validationParameters.ActorValidationParameters ?? validationParameters, out _);
//            }
//            ValidateIssuerSecurityKey(jwtToken.SigningKey, jwtToken, validationParameters);
//            var identity = CreateClaimsIdentity(jwtToken, issuer, validationParameters);
//            if (validationParameters.SaveSigninToken)
//                identity.BootstrapContext = jwtToken.RawData;

//            LogHelper.LogInformation(Microsoft.IdentityModel.Tokens.LogMessages.IDX10241, jwtToken.RawData);
//            return new ClaimsPrincipal(identity);
//        }

//        /// <summary>
//        /// Serializes a <see cref="JwtSecurityToken"/> into a JWT in Compact Serialization Format.
//        /// </summary>
//        /// <param name="token"><see cref="JwtSecurityToken"/> to serialize.</param>
//        /// <remarks>
//        /// <para>The JWT will be serialized as a JWE or JWS.</para>
//        /// <para><see cref="JwtSecurityToken.Payload"/> will be used to create the JWT. If there is an inner token, the inner token's payload will be used.</para>
//        /// <para>If either <see cref="JwtSecurityToken.SigningCredentials"/> or <see cref="JwtSecurityToken.InnerToken"/>.SigningCredentials are set, the JWT will be signed.</para>
//        /// <para>If <see cref="JwtSecurityToken.EncryptingCredentials"/> is set, a JWE will be created using the JWT above as the plaintext.</para>
//        /// </remarks>
//        /// <exception cref="ArgumentNullException">'token' is null.</exception>
//        /// <exception cref="ArgumentException">'token' is not a not <see cref="JwtSecurityToken"/>.</exception>
//        /// <exception cref="SecurityTokenEncryptionFailedException">both <see cref="JwtSecurityToken.SigningCredentials"/> and <see cref="JwtSecurityToken.InnerToken"/> are set.</exception>
//        /// <exception cref="SecurityTokenEncryptionFailedException">both <see cref="JwtSecurityToken.InnerToken"/> and <see cref="JwtSecurityToken.InnerToken"/>.EncryptingCredentials are set.</exception>
//        /// <exception cref="SecurityTokenEncryptionFailedException">if <see cref="JwtSecurityToken.InnerToken"/> is set and <see cref="JwtSecurityToken.EncryptingCredentials"/> is not set.</exception>
//        /// <returns>A JWE or JWS in 'Compact Serialization Format'.</returns>
//        public override string WriteToken(SecurityToken token)
//        {
//            if (token == null)
//                throw LogHelper.LogArgumentNullException(nameof(token));

//            JwtSecurityToken jwtToken = token as JwtSecurityToken;
//            if (jwtToken == null)
//                throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12706, GetType(), typeof(JwtSecurityToken), token.GetType()), nameof(token)));

//            var encodedPayload = jwtToken.EncodedPayload;
//            var encodedSignature = string.Empty;
//            var encodedHeader = string.Empty;
//            if (jwtToken.InnerToken != null)
//            {
//                if (jwtToken.SigningCredentials != null)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12736));

//                if (jwtToken.InnerToken.Header.EncryptingCredentials != null)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12737));

//                if (jwtToken.Header.EncryptingCredentials == null)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenEncryptionFailedException(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12735));

//                if (jwtToken.InnerToken.SigningCredentials != null)
//                    encodedSignature = JwtTokenUtilities.CreateEncodedSignature(string.Concat(jwtToken.InnerToken.EncodedHeader, ".", jwtToken.EncodedPayload), jwtToken.InnerToken.SigningCredentials);

//                return EncryptToken(new JwtSecurityToken(jwtToken.InnerToken.Header, jwtToken.InnerToken.Payload, jwtToken.InnerToken.EncodedHeader, encodedPayload, encodedSignature), jwtToken.EncryptingCredentials).RawData;
//            }

//            // if EncryptingCredentials isn't set, then we need to create JWE
//            // first create a new header with the SigningCredentials, Create a JWS then wrap it in a JWE
//            var header = jwtToken.EncryptingCredentials == null ? jwtToken.Header : new JwtHeader(jwtToken.SigningCredentials);
//            encodedHeader = header.Base64UrlEncode();
//            if (jwtToken.SigningCredentials != null)
//                encodedSignature = JwtTokenUtilities.CreateEncodedSignature(string.Concat(encodedHeader, ".", encodedPayload), jwtToken.SigningCredentials);

//            if (jwtToken.EncryptingCredentials != null)
//                return EncryptToken(new JwtSecurityToken(header, jwtToken.Payload, encodedHeader, encodedPayload, encodedSignature), jwtToken.EncryptingCredentials).RawData;
//            else
//                return string.Concat(encodedHeader, ".", encodedPayload, ".", encodedSignature);
//        }

//        /// <summary>
//        /// Obtains a <see cref="SignatureProvider "/> and validates the signature.
//        /// </summary>
//        /// <param name="encodedBytes">Bytes to validate.</param>
//        /// <param name="signature">Signature to compare against.</param>
//        /// <param name="key"><See cref="SecurityKey"/> to use.</param>
//        /// <param name="algorithm">Crypto algorithm to use.</param>
//        /// <param name="validationParameters">Priority will be given to <see cref="TokenValidationParameters.CryptoProviderFactory"/> over <see cref="SecurityKey.CryptoProviderFactory"/>.</param>
//        /// <returns>'true' if signature is valid.</returns>
//        private bool ValidateSignature(byte[] encodedBytes, byte[] signature, SecurityKey key, string algorithm, TokenValidationParameters validationParameters)
//        {
//            var cryptoProviderFactory = validationParameters.CryptoProviderFactory ?? key.CryptoProviderFactory;
//            var signatureProvider = cryptoProviderFactory.CreateForVerifying(key, algorithm);
//            if (signatureProvider == null)
//                throw LogHelper.LogExceptionMessage(new InvalidOperationException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10647, (key == null ? "Null" : key.ToString()), (algorithm == null ? "Null" : algorithm))));

//            try
//            {
//                return signatureProvider.Verify(encodedBytes, signature);
//            }
//            finally
//            {
//                cryptoProviderFactory.ReleaseSignatureProvider(signatureProvider);
//            }
//        }

//        /// <summary>
//        /// Validates that the signature, if found or required, is valid.
//        /// </summary>
//        /// <param name="token">A JWS token.</param>
//        /// <param name="validationParameters"><see cref="TokenValidationParameters"/> that contains signing keys.</param>
//        /// <exception cref="ArgumentNullException">If 'jwt' is null or whitespace.</exception>
//        /// <exception cref="ArgumentNullException">If 'validationParameters' is null.</exception>
//        /// <exception cref="SecurityTokenValidationException">If a signature is not found and <see cref="TokenValidationParameters.RequireSignedTokens"/> is true.</exception>
//        /// <exception cref="SecurityTokenSignatureKeyNotFoundException">If the 'token' has a key identifier and none of the <see cref="SecurityKey"/>(s) provided result in a validated signature. 
//        /// This can indicate that a key refresh is required.</exception>
//        /// <exception cref="SecurityTokenInvalidSignatureException">If after trying all the <see cref="SecurityKey"/>(s), none result in a validated signature AND the 'token' does not have a key identifier.</exception>
//        /// <returns>A <see cref="JwtSecurityToken"/> that has the signature validated if token was signed.</returns>
//        /// <remarks><para>If the 'token' is signed, the signature is validated even if <see cref="TokenValidationParameters.RequireSignedTokens"/> is false.</para>
//        /// <para>If the 'token' signature is validated, then the <see cref="JwtSecurityToken.SigningKey"/> will be set to the key that signed the 'token'.It is the responsibility of <see cref="TokenValidationParameters.SignatureValidator"/> to set the <see cref="JwtSecurityToken.SigningKey"/></para></remarks>
//        protected virtual JwtSecurityToken ValidateSignature(string token, TokenValidationParameters validationParameters)
//        {
//            if (string.IsNullOrWhiteSpace(token))
//                throw LogHelper.LogArgumentNullException(nameof(token));

//            if (validationParameters == null)
//                throw LogHelper.LogArgumentNullException(nameof(validationParameters));

//            if (validationParameters.SignatureValidator != null)
//            {
//                var validatedJwtToken = validationParameters.SignatureValidator(token, validationParameters);
//                if (validatedJwtToken == null)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10505, token)));

//                var validatedJwt = validatedJwtToken as JwtSecurityToken;
//                if (validatedJwt == null)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10506, typeof(JwtSecurityToken), validatedJwtToken.GetType(), token)));

//                return validatedJwt;
//            }

//            JwtSecurityToken jwtToken = null;

//            if (validationParameters.TokenReader != null)
//            {
//                var securityToken = validationParameters.TokenReader(token, validationParameters);
//                if (securityToken == null)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10510, token)));

//                jwtToken = securityToken as JwtSecurityToken;
//                if (jwtToken == null)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10509, typeof(JwtSecurityToken), securityToken.GetType(), token)));
//            }
//            else
//            {
//                jwtToken = ReadJwtToken(token);
//            }

//            byte[] encodedBytes = Encoding.UTF8.GetBytes(jwtToken.RawHeader + "." + jwtToken.RawPayload);
//            if (string.IsNullOrEmpty(jwtToken.RawSignature))
//            {
//                if (validationParameters.RequireSignedTokens)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10504, token)));
//                else
//                    return jwtToken;
//            }

//            bool kidMatched = false;
//            IEnumerable<SecurityKey> keys = null;
//            if (validationParameters.IssuerSigningKeyResolver != null)
//            {
//                keys = validationParameters.IssuerSigningKeyResolver(token, jwtToken, jwtToken.Header.Kid, validationParameters);
//            }
//            else
//            {
//                var key = ResolveIssuerSigningKey(token, jwtToken, validationParameters);
//                if (key != null)
//                {
//                    kidMatched = true;
//                    keys = new List<SecurityKey> { key };
//                }
//            }

//            if (keys == null)
//            {
//                // control gets here if:
//                // 1. User specified delegate: IssuerSigningKeyResolver returned null
//                // 2. ResolveIssuerSigningKey returned null
//                // Try all the keys. This is the degenerate case, not concerned about perf.
//                keys = GetAllSigningKeys(token, jwtToken, jwtToken.Header.Kid, validationParameters);
//            }

//            // keep track of exceptions thrown, keys that were tried
//            var exceptionStrings = new StringBuilder();
//            var keysAttempted = new StringBuilder();
//            bool kidExists = !string.IsNullOrEmpty(jwtToken.Header.Kid);
//            byte[] signatureBytes;

//            try
//            {
//                signatureBytes = Base64UrlEncoder.DecodeBytes(jwtToken.RawSignature);
//            }
//            catch (FormatException e)
//            {
//                throw new SecurityTokenInvalidSignatureException(Microsoft.IdentityModel.Tokens.LogMessages.IDX10508, e);
//            }

//            foreach (var key in keys)
//            {
//                try
//                {
//                    if (ValidateSignature(encodedBytes, signatureBytes, key, jwtToken.Header.Alg, validationParameters))
//                    {
//                        LogHelper.LogInformation(Microsoft.IdentityModel.Tokens.LogMessages.IDX10242, token);
//                        jwtToken.SigningKey = key;
//                        return jwtToken;
//                    }
//                }
//                catch (Exception ex)
//                {
//                    exceptionStrings.AppendLine(ex.ToString());
//                }

//                if (key != null)
//                {
//                    keysAttempted.AppendLine(key.ToString() + " , KeyId: " + key.KeyId);
//                    if (kidExists && !kidMatched && key.KeyId != null)
//                        kidMatched = jwtToken.Header.Kid.Equals(key.KeyId, key is X509SecurityKey ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
//                }
//            }

//            if (kidExists)
//            {
//                if (kidMatched)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10511, keysAttempted, jwtToken.Header.Kid, exceptionStrings, jwtToken)));
//                else
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenSignatureKeyNotFoundException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10501, jwtToken.Header.Kid, exceptionStrings, jwtToken)));
//            }
//            else
//            {
//                if (keysAttempted.Length > 0)
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenInvalidSignatureException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10503, keysAttempted, exceptionStrings, jwtToken)));
//                else
//                    throw LogHelper.LogExceptionMessage(new SecurityTokenSignatureKeyNotFoundException(Microsoft.IdentityModel.Tokens.LogMessages.IDX10500));
//            }
//        }

//        private IEnumerable<SecurityKey> GetAllSigningKeys(string token, JwtSecurityToken securityToken, string kid, TokenValidationParameters validationParameters)
//        {
//            LogHelper.LogInformation(Microsoft.IdentityModel.Tokens.LogMessages.IDX10243);
//            if (validationParameters.IssuerSigningKey != null)
//                yield return validationParameters.IssuerSigningKey;

//            if (validationParameters.IssuerSigningKeys != null)
//                foreach (SecurityKey key in validationParameters.IssuerSigningKeys)
//                    yield return key;
//        }

//        private IEnumerable<SecurityKey> GetAllDecryptionKeys(TokenValidationParameters validationParameters)
//        {
//            if (validationParameters.TokenDecryptionKey != null)
//                yield return validationParameters.TokenDecryptionKey;

//            if (validationParameters.TokenDecryptionKeys != null)
//                foreach (SecurityKey key in validationParameters.TokenDecryptionKeys)
//                    yield return key;
//        }

//        /// <summary>
//        /// Creates a <see cref="ClaimsIdentity"/> from a <see cref="JwtSecurityToken"/>.
//        /// </summary>
//        /// <param name="jwtToken">The <see cref="JwtSecurityToken"/> to use as a <see cref="Claim"/> source.</param>
//        /// <param name="issuer">The value to set <see cref="Claim.Issuer"/></param>
//        /// <param name="validationParameters"> Contains parameters for validating the token.</param>
//        /// <returns>A <see cref="ClaimsIdentity"/> containing the <see cref="JwtSecurityToken.Claims"/>.</returns>
//        protected virtual ClaimsIdentity CreateClaimsIdentity(JwtSecurityToken jwtToken, string issuer, TokenValidationParameters validationParameters)
//        {
//            if (jwtToken == null)
//                throw LogHelper.LogArgumentNullException(nameof(jwtToken));

//            if (validationParameters == null)
//                throw LogHelper.LogArgumentNullException(nameof(validationParameters));

//            var actualIssuer = issuer;
//            if (string.IsNullOrWhiteSpace(issuer))
//            {
//                LogHelper.LogVerbose(Microsoft.IdentityModel.Tokens.LogMessages.IDX10244, ClaimsIdentity.DefaultIssuer);
//                actualIssuer = ClaimsIdentity.DefaultIssuer;
//            }

//            return MapInboundClaims ? CreateClaimsIdentityWithMapping(jwtToken, actualIssuer, validationParameters) : CreateClaimsIdentityWithoutMapping(jwtToken, actualIssuer, validationParameters);
//        }

//        private ClaimsIdentity CreateClaimsIdentityWithMapping(JwtSecurityToken jwtToken, string actualIssuer, TokenValidationParameters validationParameters)
//        {
//            ClaimsIdentity identity = validationParameters.CreateClaimsIdentity(jwtToken, actualIssuer);
//            foreach (Claim jwtClaim in jwtToken.Claims)
//            {
//                if (_inboundClaimFilter.Contains(jwtClaim.Type))
//                    continue;

//                string claimType;
//                bool wasMapped = true;
//                if (!_inboundClaimTypeMap.TryGetValue(jwtClaim.Type, out claimType))
//                {
//                    claimType = jwtClaim.Type;
//                    wasMapped = false;
//                }

//                if (claimType == ClaimTypes.Actor)
//                {
//                    if (identity.Actor != null)
//                        throw LogHelper.LogExceptionMessage(new InvalidOperationException(LogHelper.FormatInvariant(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12710, JwtRegisteredClaimNames.Actort, jwtClaim.Value)));

//                    if (CanReadToken(jwtClaim.Value))
//                    {
//                        JwtSecurityToken actor = ReadToken(jwtClaim.Value) as JwtSecurityToken;
//                        identity.Actor = CreateClaimsIdentity(actor, actualIssuer, validationParameters);
//                    }
//                }

//                Claim claim = new Claim(claimType, jwtClaim.Value, jwtClaim.ValueType, actualIssuer, actualIssuer, identity);

//                if (jwtClaim.Properties.Count > 0)
//                {
//                    foreach (var kv in jwtClaim.Properties)
//                    {
//                        claim.Properties[kv.Key] = kv.Value;
//                    }
//                }
//                if (wasMapped)
//                    claim.Properties[ShortClaimTypeProperty] = jwtClaim.Type;

//                identity.AddClaim(claim);
//            }

//            return identity;
//        }

//        private ClaimsIdentity CreateClaimsIdentityWithoutMapping(JwtSecurityToken jwtToken, string actualIssuer, TokenValidationParameters validationParameters)
//        {
//            ClaimsIdentity identity = validationParameters.CreateClaimsIdentity(jwtToken, actualIssuer);
//            foreach (Claim jwtClaim in jwtToken.Claims)
//            {
//                if (_inboundClaimFilter.Contains(jwtClaim.Type))
//                    continue;

//                string claimType = jwtClaim.Type;
//                if (claimType == ClaimTypes.Actor)
//                {
//                    if (identity.Actor != null)
//                        throw LogHelper.LogExceptionMessage(new InvalidOperationException(LogHelper.FormatInvariant(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12710, JwtRegisteredClaimNames.Actort, jwtClaim.Value)));

//                    if (CanReadToken(jwtClaim.Value))
//                    {
//                        JwtSecurityToken actor = ReadToken(jwtClaim.Value) as JwtSecurityToken;
//                        identity.Actor = CreateClaimsIdentity(actor, actualIssuer, validationParameters);
//                    }
//                }

//                Claim claim = new Claim(claimType, jwtClaim.Value, jwtClaim.ValueType, actualIssuer, actualIssuer, identity);
//                if (jwtClaim.Properties.Count > 0)
//                {
//                    foreach (var kv in jwtClaim.Properties)
//                        claim.Properties[kv.Key] = kv.Value;
//                }

//                identity.AddClaim(claim);
//            }

//            return identity;
//        }

//        /// <summary>
//        /// Creates the 'value' for the actor claim: { actort, 'value' }
//        /// </summary>
//        /// <param name="actor"><see cref="ClaimsIdentity"/> as actor.</param>
//        /// <returns><see cref="string"/> representing the actor.</returns>
//        /// <remarks>If <see cref="ClaimsIdentity.BootstrapContext"/> is not null:
//        /// <para>&#160;&#160;If 'type' is 'string', return as string.</para>
//        /// <para>&#160;&#160;if 'type' is 'BootstrapContext' and 'BootstrapContext.SecurityToken' is 'JwtSecurityToken'</para>
//        /// <para>&#160;&#160;&#160;&#160;if 'JwtSecurityToken.RawData' != null, return RawData.</para>        
//        /// <para>&#160;&#160;&#160;&#160;else return <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.WriteToken( SecurityToken )"/>.</para>        
//        /// <para>&#160;&#160;if 'BootstrapContext.Token' != null, return 'Token'.</para>
//        /// <para>default: <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.WriteToken(SecurityToken)"/> new ( <see cref="JwtSecurityToken"/>( actor.Claims ).</para>
//        /// </remarks>
//        /// <exception cref="ArgumentNullException">'actor' is null.</exception>
//        protected virtual string CreateActorValue(ClaimsIdentity actor)
//        {
//            if (actor == null)
//                throw LogHelper.LogArgumentNullException(nameof(actor));

//            if (actor.BootstrapContext != null)
//            {
//                string encodedJwt = actor.BootstrapContext as string;
//                if (encodedJwt != null)
//                {
//                    LogHelper.LogVerbose(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12713);
//                    return encodedJwt;
//                }

//                JwtSecurityToken jwtToken = actor.BootstrapContext as JwtSecurityToken;
//                if (jwtToken != null)
//                {
//                    if (jwtToken.RawData != null)
//                    {
//                        LogHelper.LogVerbose(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12714);
//                        return jwtToken.RawData;
//                    }
//                    else
//                    {
//                        LogHelper.LogVerbose(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12715);
//                        return this.WriteToken(jwtToken);
//                    }
//                }

//                LogHelper.LogVerbose(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12711);
//            }

//            LogHelper.LogVerbose(System.IdentityModel.Tokens.Jwt.LogMessages.IDX12712);
//            return WriteToken(new JwtSecurityToken(claims: actor.Claims));
//        }

//        /// <summary>
//        /// Determines if the audiences found in a <see cref="JwtSecurityToken"/> are valid.
//        /// </summary>
//        /// <param name="audiences">The audiences found in the <see cref="JwtSecurityToken"/>.</param>
//        /// <param name="jwtToken">The <see cref="JwtSecurityToken"/> being validated.</param>
//        /// <param name="validationParameters"><see cref="TokenValidationParameters"/> required for validation.</param>
//        /// <remarks>See <see cref="Validators.ValidateAudience"/> for additional details.</remarks>
//        protected virtual void ValidateAudience(IEnumerable<string> audiences, JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
//        {
//            Validators.ValidateAudience(audiences, jwtToken, validationParameters);
//        }

//        /// <summary>
//        /// Validates the lifetime of a <see cref="JwtSecurityToken"/>.
//        /// </summary>
//        /// <param name="notBefore">The <see cref="DateTime"/> value of the 'nbf' claim if it exists in the 'jwtToken'.</param>
//        /// <param name="expires">The <see cref="DateTime"/> value of the 'exp' claim if it exists in the 'jwtToken'.</param>
//        /// <param name="jwtToken">The <see cref="JwtSecurityToken"/> being validated.</param>
//        /// <param name="validationParameters"><see cref="TokenValidationParameters"/> required for validation.</param>
//        /// <remarks><see cref="Validators.ValidateLifetime"/> for additional details.</remarks>
//        protected virtual void ValidateLifetime(DateTime? notBefore, DateTime? expires, JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
//        {
//            Validators.ValidateLifetime(notBefore, expires, jwtToken, validationParameters);
//        }

//        /// <summary>
//        /// Determines if the issuer found in a <see cref="JwtSecurityToken"/> is valid.
//        /// </summary>
//        /// <param name="issuer">The issuer to validate</param>
//        /// <param name="jwtToken">The <see cref="JwtSecurityToken"/> that is being validated.</param>
//        /// <param name="validationParameters"><see cref="TokenValidationParameters"/> required for validation.</param>
//        /// <returns>The issuer to use when creating the <see cref="Claim"/>(s) in the <see cref="ClaimsIdentity"/>.</returns>
//        /// <remarks><see cref="Validators.ValidateIssuer"/> for additional details.</remarks>
//        protected virtual string ValidateIssuer(string issuer, JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
//        {
//            return Validators.ValidateIssuer(issuer, jwtToken, validationParameters);
//        }

//        /// <summary>
//        /// Determines if a <see cref="JwtSecurityToken"/> is already validated.
//        /// </summary>
//        /// <param name="expires">The <see cref="DateTime"/> value of the 'exp' claim if it exists in the <see cref="JwtSecurityToken"/>'.</param>
//        /// <param name="securityToken">The <see cref="JwtSecurityToken"/> that is being validated.</param>
//        /// <param name="validationParameters"><see cref="TokenValidationParameters"/> required for validation.</param>
//        protected virtual void ValidateTokenReplay(DateTime? expires, string securityToken, TokenValidationParameters validationParameters)
//        {
//            Validators.ValidateTokenReplay(expires, securityToken, validationParameters);
//        }

//        /// <summary>
//        /// Returns a <see cref="SecurityKey"/> to use when validating the signature of a token.
//        /// </summary>
//        /// <param name="token">The <see cref="string"/> representation of the token that is being validated.</param>
//        /// <param name="jwtToken">The <see cref="JwtSecurityToken"/> that is being validated.</param>
//        /// <param name="validationParameters">A <see cref="TokenValidationParameters"/>  required for validation.</param>
//        /// <returns>Returns a <see cref="SecurityKey"/> to use for signature validation.</returns>
//        /// <remarks>If key fails to resolve, then null is returned</remarks>
//        protected virtual SecurityKey ResolveIssuerSigningKey(string token, JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
//        {
//            if (validationParameters == null)
//                throw LogHelper.LogArgumentNullException(nameof(validationParameters));

//            if (jwtToken == null)
//                throw LogHelper.LogArgumentNullException(nameof(jwtToken));

//            return JwtTokenUtilities.FindKeyMatch(jwtToken.Header.Kid, jwtToken.Header.X5t, validationParameters.IssuerSigningKey, validationParameters.IssuerSigningKeys);
//        }

//        /// <summary>
//        /// Returns a <see cref="SecurityKey"/> to use when decryption a JWE.
//        /// </summary>
//        /// <param name="token">The <see cref="string"/> the token that is being decrypted.</param>
//        /// <param name="jwtToken">The <see cref="JwtSecurityToken"/> that is being decrypted.</param>
//        /// <param name="validationParameters">A <see cref="TokenValidationParameters"/>  required for validation.</param>
//        /// <returns>Returns a <see cref="SecurityKey"/> to use for signature validation.</returns>
//        /// <remarks>If key fails to resolve, then null is returned</remarks>
//        protected virtual SecurityKey ResolveTokenDecryptionKey(string token, JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
//        {
//            if (jwtToken == null)
//                throw LogHelper.LogArgumentNullException(nameof(jwtToken));

//            if (validationParameters == null)
//                throw LogHelper.LogArgumentNullException(nameof(validationParameters));

//            return JwtTokenUtilities.FindKeyMatch(jwtToken.Header.Kid, jwtToken.Header.X5t, validationParameters.TokenDecryptionKey, validationParameters.TokenDecryptionKeys);
//        }

//        private byte[] DecryptToken(JwtSecurityToken jwtToken, CryptoProviderFactory cryptoProviderFactory, SecurityKey key)
//        {
//            var decryptionProvider = cryptoProviderFactory.CreateAuthenticatedEncryptionProvider(key, jwtToken.Header.Enc);
//            if (decryptionProvider == null)
//                throw LogHelper.LogExceptionMessage(new InvalidOperationException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10610, key, jwtToken.Header.Enc)));

//            return decryptionProvider.Decrypt(
//                    Base64UrlEncoder.DecodeBytes(jwtToken.RawCiphertext),
//                    Encoding.ASCII.GetBytes(jwtToken.RawHeader),
//                    Base64UrlEncoder.DecodeBytes(jwtToken.RawInitializationVector),
//                    Base64UrlEncoder.DecodeBytes(jwtToken.RawAuthenticationTag)
//                );
//        }

//        /// <summary>
//        /// Decrypts a JWE and returns the clear text 
//        /// </summary>
//        /// <param name="jwtToken">the JWE that contains the cypher text.</param>
//        /// <param name="validationParameters">contains crypto material.</param>
//        /// <returns>the decoded / cleartext contents of the JWE.</returns>
//        /// <exception cref="ArgumentNullException">if 'jwtToken' is null.</exception>
//        /// <exception cref="ArgumentNullException">if 'validationParameters' is null.</exception>
//        /// <exception cref="SecurityTokenException">if 'jwtToken.Header.enc' is null or empty.</exception>
//        /// <exception cref="SecurityTokenEncryptionKeyNotFoundException">if 'jwtToken.Header.kid' is not null AND decryption fails.</exception>
//        /// <exception cref="SecurityTokenDecryptionFailedException">if the JWE was not able to be decrypted.</exception>
//        protected string DecryptToken(JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
//        {
//            if (jwtToken == null)
//                throw LogHelper.LogArgumentNullException(nameof(jwtToken));

//            if (validationParameters == null)
//                throw LogHelper.LogArgumentNullException(nameof(validationParameters));

//            if (string.IsNullOrEmpty(jwtToken.Header.Enc))
//                throw LogHelper.LogExceptionMessage(new SecurityTokenException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10612)));

//            var keys = GetContentEncryptionKeys(jwtToken, validationParameters);
//            var decryptionSucceeded = false;
//            byte[] decryptedTokenBytes = null;

//            // keep track of exceptions thrown, keys that were tried
//            var exceptionStrings = new StringBuilder();
//            var keysAttempted = new StringBuilder();
//            foreach (SecurityKey key in keys)
//            {
//                var cryptoProviderFactory = validationParameters.CryptoProviderFactory ?? key.CryptoProviderFactory;
//                if (cryptoProviderFactory == null)
//                {
//                    LogHelper.LogWarning(Microsoft.IdentityModel.Tokens.LogMessages.IDX10607, key);
//                    continue;
//                }

//                if (!cryptoProviderFactory.IsSupportedAlgorithm(jwtToken.Header.Enc, key))
//                {
//                    LogHelper.LogWarning(Microsoft.IdentityModel.Tokens.LogMessages.IDX10611, jwtToken.Header.Enc, key);
//                    continue;
//                }

//                try
//                {
//                    decryptedTokenBytes = DecryptToken(jwtToken, cryptoProviderFactory, key);
//                    decryptionSucceeded = true;
//                    break;
//                }
//                catch (Exception ex)
//                {
//                    exceptionStrings.AppendLine(ex.ToString());
//                }

//                if (key != null)
//                    keysAttempted.AppendLine(key.ToString());
//            }

//            if (!decryptionSucceeded && keysAttempted.Length > 0)
//                throw LogHelper.LogExceptionMessage(new SecurityTokenDecryptionFailedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10603, keysAttempted, exceptionStrings, jwtToken.RawData)));

//            if (!decryptionSucceeded)
//                throw LogHelper.LogExceptionMessage(new SecurityTokenDecryptionFailedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10609, jwtToken.RawData)));

//            if (string.IsNullOrEmpty(jwtToken.Header.Zip))
//                return Encoding.UTF8.GetString(decryptedTokenBytes);

//            try
//            {
//                return JwtTokenUtilities.DecompressToken(decryptedTokenBytes, jwtToken.Header.Zip);
//            }
//            catch (Exception ex)
//            {
//                throw LogHelper.LogExceptionMessage(new SecurityTokenDecompressionFailedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10679, jwtToken.Header.Zip), ex));
//            }
//        }

//        private IEnumerable<SecurityKey> GetContentEncryptionKeys(JwtSecurityToken jwtToken, TokenValidationParameters validationParameters)
//        {
//            IEnumerable<SecurityKey> keys = null;

//            if (validationParameters.TokenDecryptionKeyResolver != null)
//                keys = validationParameters.TokenDecryptionKeyResolver(jwtToken.RawData, jwtToken, jwtToken.Header.Kid, validationParameters);
//            else
//            {
//                var key = ResolveTokenDecryptionKey(jwtToken.RawData, jwtToken, validationParameters);
//                if (key != null)
//                    keys = new List<SecurityKey> { key };
//            }

//            // control gets here if:
//            // 1. User specified delegate: TokenDecryptionKeyResolver returned null
//            // 2. ResolveTokenDecryptionKey returned null
//            // Try all the keys. This is the degenerate case, not concerned about perf.
//            if (keys == null)
//                keys = GetAllDecryptionKeys(validationParameters);

//            if (jwtToken.Header.Alg.Equals(JwtConstants.DirectKeyUseAlg))
//                return keys;

//            var unwrappedKeys = new List<SecurityKey>();
//            foreach (var key in keys)
//            {
//                if (key.CryptoProviderFactory.IsSupportedAlgorithm(jwtToken.Header.Alg, key))
//                {
//                    var kwp = key.CryptoProviderFactory.CreateKeyWrapProviderForUnwrap(key, jwtToken.Header.Alg);
//                    var unwrappedKey = kwp.UnwrapKey(Base64UrlEncoder.DecodeBytes(jwtToken.RawEncryptedKey));
//                    unwrappedKeys.Add(new SymmetricSecurityKey(unwrappedKey));
//                }
//            }

//            return unwrappedKeys;
//        }

//        private byte[] GetSymmetricSecurityKey(SecurityKey key)
//        {
//            if (key == null)
//                throw LogHelper.LogArgumentNullException(nameof(key));

//            // try to use the provided key directly.
//            SymmetricSecurityKey symmetricSecurityKey = key as SymmetricSecurityKey;
//            if (symmetricSecurityKey != null)
//                return symmetricSecurityKey.Key;
//            else
//            {
//                JsonWebKey jsonWebKey = key as JsonWebKey;
//                if (jsonWebKey != null && jsonWebKey.K != null)
//                    return Base64UrlEncoder.DecodeBytes(jsonWebKey.K);
//            }

//            return null;
//        }

//        /// <summary>
//        /// Validates the <see cref="JwtSecurityToken.SigningKey"/> is an expected value.
//        /// </summary>
//        /// <param name="key">The <see cref="SecurityKey"/> that signed the <see cref="SecurityToken"/>.</param>
//        /// <param name="securityToken">The <see cref="JwtSecurityToken"/> to validate.</param>
//        /// <param name="validationParameters">The current <see cref="TokenValidationParameters"/>.</param>
//        /// <remarks>If the <see cref="JwtSecurityToken.SigningKey"/> is a <see cref="X509SecurityKey"/> then the X509Certificate2 will be validated using the CertificateValidator.</remarks>
//        protected virtual void ValidateIssuerSecurityKey(SecurityKey key, JwtSecurityToken securityToken, TokenValidationParameters validationParameters)
//        {
//            Validators.ValidateIssuerSecurityKey(key, securityToken, validationParameters);
//        }

//        /// <summary>
//        /// Serializes to XML a token of the type handled by this instance.
//        /// </summary>
//        /// <param name="writer">The XML writer.</param>
//        /// <param name="token">A token of type <see cref="TokenType"/>.</param>
//        public override void WriteToken(XmlWriter writer, SecurityToken token)
//        {
//            throw new NotImplementedException();
//        }
//    }

//    /// <summary>
//    /// A class which contains useful methods for processing JWT tokens.
//    /// </summary>
//    public class JwtTokenUtilities
//    {
//        /// <summary>
//        /// Regex that is used to figure out if a token is in JWS format.
//        /// </summary>
//        public static Regex RegexJws = new Regex(Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JsonCompactSerializationRegex, RegexOptions.Compiled | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100));

//        /// <summary>
//        /// Regex that is used to figure out if a token is in JWE format.
//        /// </summary>
//        public static Regex RegexJwe = new Regex(Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JweCompactSerializationRegex, RegexOptions.Compiled | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100));

//        /// <summary>
//        /// Produces a signature over the 'input'.
//        /// </summary>
//        /// <param name="input">String to be signed</param>
//        /// <param name="signingCredentials">The <see cref="SigningCredentials"/> that contain crypto specs used to sign the token.</param>
//        /// <returns>The bse64urlendcoded signature over the bytes obtained from UTF8Encoding.GetBytes( 'input' ).</returns>
//        /// <exception cref="ArgumentNullException">'input' or 'signingCredentials' is null.</exception>
//        public static string CreateEncodedSignature(string input, SigningCredentials signingCredentials)
//        {
//            if (input == null)
//                throw LogHelper.LogArgumentNullException(nameof(input));

//            if (signingCredentials == null)
//                throw LogHelper.LogArgumentNullException(nameof(signingCredentials));

//            var cryptoProviderFactory = signingCredentials.CryptoProviderFactory ?? signingCredentials.Key.CryptoProviderFactory;
//            var signatureProvider = cryptoProviderFactory.CreateForSigning(signingCredentials.Key, signingCredentials.Algorithm);
//            if (signatureProvider == null)
//                throw LogHelper.LogExceptionMessage(new InvalidOperationException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10636, (signingCredentials.Key == null ? "Null" : signingCredentials.Key.ToString()), (signingCredentials.Algorithm ?? "Null"))));

//            try
//            {
//                LogHelper.LogVerbose(LogMessages.IDX14200);
//                return Base64UrlEncoder.Encode(signatureProvider.Sign(Encoding.UTF8.GetBytes(input)));
//            }
//            finally
//            {
//                cryptoProviderFactory.ReleaseSignatureProvider(signatureProvider);
//            }
//        }

//        /// <summary>
//        /// Decompress JWT token bytes.
//        /// </summary>
//        /// <param name="tokenBytes"></param>
//        /// <param name="algorithm"></param>
//        /// <exception cref="ArgumentNullException">if <paramref name="tokenBytes"/> is null.</exception>
//        /// <exception cref="ArgumentNullException">if <paramref name="algorithm"/> is null.</exception>
//        /// <exception cref="NotSupportedException">if the decompression <paramref name="algorithm"/> is not supported.</exception>
//        /// <exception cref="SecurityTokenDecompressionFailedException">if decompression using <paramref name="algorithm"/> fails.</exception>
//        /// <returns>Decompressed JWT token</returns>
//        internal static string DecompressToken(byte[] tokenBytes, string algorithm)
//        {
//            if (tokenBytes == null)
//                throw LogHelper.LogArgumentNullException(nameof(tokenBytes));

//            if (string.IsNullOrEmpty(algorithm))
//                throw LogHelper.LogArgumentNullException(nameof(algorithm));

//            if (!CompressionProviderFactory.Default.IsSupportedAlgorithm(algorithm))
//                throw LogHelper.LogExceptionMessage(new NotSupportedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10682, algorithm)));

//            var compressionProvider = CompressionProviderFactory.Default.CreateCompressionProvider(algorithm);

//            var decompressedBytes = compressionProvider.Decompress(tokenBytes);

//            return decompressedBytes != null ? Encoding.UTF8.GetString(decompressedBytes) : throw LogHelper.LogExceptionMessage(new SecurityTokenDecompressionFailedException(LogHelper.FormatInvariant(Microsoft.IdentityModel.Tokens.LogMessages.IDX10679, algorithm)));
//        }

//        /// <summary>
//        /// Has extra code for X509SecurityKey keys where the kid or x5t match in a case insensitive manner.
//        /// </summary>
//        /// <param name="kid"></param>
//        /// <param name="x5t"></param>
//        /// <param name="securityKey"></param>
//        /// <param name="keys"></param>
//        /// <returns>a key if found, null otherwise.</returns>
//        internal static SecurityKey FindKeyMatch(string kid, string x5t, SecurityKey securityKey, IEnumerable<SecurityKey> keys)
//        {
//            // the code could be in a routine, but I chose to have duplicate code instead for performance
//            if (keys == null && securityKey == null)
//                return null;

//            if (securityKey is X509SecurityKey x509SecurityKey1)
//            {
//                if (string.Equals(x5t, x509SecurityKey1.X5t, StringComparison.OrdinalIgnoreCase)
//                || string.Equals(x5t, x509SecurityKey1.KeyId, StringComparison.OrdinalIgnoreCase)
//                || string.Equals(kid, x509SecurityKey1.X5t, StringComparison.OrdinalIgnoreCase)
//                || string.Equals(kid, x509SecurityKey1.KeyId, StringComparison.OrdinalIgnoreCase))
//                    return securityKey;
//            }
//            else if (string.Equals(securityKey?.KeyId, kid, StringComparison.Ordinal))
//            {
//                return securityKey;
//            }

//            if (keys != null)
//            {
//                foreach (var key in keys)
//                {
//                    if (key is X509SecurityKey x509SecurityKey2)
//                    {
//                        if (string.Equals(x5t, x509SecurityKey2.X5t, StringComparison.OrdinalIgnoreCase)
//                        || string.Equals(x5t, x509SecurityKey2.KeyId, StringComparison.OrdinalIgnoreCase)
//                        || string.Equals(kid, x509SecurityKey2.X5t, StringComparison.OrdinalIgnoreCase)
//                        || string.Equals(kid, x509SecurityKey2.KeyId, StringComparison.OrdinalIgnoreCase))
//                            return key;
//                    }
//                    else if (string.Equals(key?.KeyId, kid, StringComparison.Ordinal))
//                    {
//                        return key;
//                    }
//                }
//            }

//            return null;
//        }

//        /// <summary>
//        /// Generates key bytes.
//        /// </summary>
//        public static byte[] GenerateKeyBytes(int sizeInBits)
//        {
//            byte[] key = null;
//            if (sizeInBits != 256 && sizeInBits != 384 && sizeInBits != 512)
//                throw LogHelper.LogExceptionMessage(new ArgumentException(Microsoft.IdentityModel.Tokens.LogMessages.IDX10401, nameof(sizeInBits)));

//            var aes = Aes.Create();
//            int halfSizeInBytes = sizeInBits >> 4;
//            key = new byte[halfSizeInBytes << 1];
//            aes.KeySize = sizeInBits >> 1;
//            // The design of AuthenticatedEncryption needs two keys of the same size - generate them, each half size of what's required
//            aes.GenerateKey();
//            Array.Copy(aes.Key, key, halfSizeInBytes);
//            aes.GenerateKey();
//            Array.Copy(aes.Key, 0, key, halfSizeInBytes, halfSizeInBytes);

//            return key;
//        }

//        /// <summary>
//        /// Gets all decryption keys.
//        /// </summary>
//        public static IEnumerable<SecurityKey> GetAllDecryptionKeys(TokenValidationParameters validationParameters)
//        {
//            var decryptionKeys = new Collection<SecurityKey>();
//            if (validationParameters.TokenDecryptionKey != null)
//                decryptionKeys.Add(validationParameters.TokenDecryptionKey);

//            if (validationParameters.TokenDecryptionKeys != null)
//                foreach (SecurityKey key in validationParameters.TokenDecryptionKeys)
//                    decryptionKeys.Add(key);

//            return decryptionKeys;

//        }
//        /// <summary>
//        /// Gets the DateTime using the number of seconds from 1970-01-01T0:0:0Z (UTC)
//        /// </summary>
//        /// <param name="key">Claim in the payload that should map to an integer, float, or string.</param>
//        /// <param name="payload">The payload that contains the desired claim value.</param>
//        /// <remarks>If the claim is not found, the function returns: DateTime.MinValue
//        /// </remarks>
//        /// <exception cref="FormatException">If the value of the claim cannot be parsed into a long.</exception>
//        /// <returns>The DateTime representation of a claim.</returns>
//        internal static DateTime GetDateTime(string key, JObject payload)
//        {
//            if (!payload.TryGetValue(key, out var jToken))
//                return DateTime.MinValue;

//            return EpochTime.DateTime(Convert.ToInt64(Math.Truncate(Convert.ToDouble(ParseTimeValue(jToken, key), CultureInfo.InvariantCulture))));
//        }

//        private static long ParseTimeValue(JToken jToken, string claimName)
//        {
//            if (jToken.Type == JTokenType.Integer || jToken.Type == JTokenType.Float)
//            {
//                return (long)jToken;
//            }
//            else if (jToken.Type == JTokenType.String)
//            {
//                if (long.TryParse((string)jToken, out long resultLong))
//                    return resultLong;

//                if (float.TryParse((string)jToken, out float resultFloat))
//                    return (long)resultFloat;

//                if (double.TryParse((string)jToken, out double resultDouble))
//                    return (long)resultDouble;
//            }

//            throw LogHelper.LogExceptionMessage(new FormatException(LogHelper.FormatInvariant(LogMessages.IDX14300, claimName, jToken.ToString(), typeof(long))));
//        }
//    }

//    public static class LogMessages
//    {
//#pragma warning disable 1591

//        // signature creation / validation
//        internal const string IDX14000 = "IDX14000: Signing JWT is not supported for: Algorithm: '{0}', SecurityKey: '{1}'.";

//        // JWT messages
//        internal const string IDX14100 = "IDX14100: JWT is not well formed: '{0}'.\nThe token needs to be in JWS or JWE Compact Serialization Format. (JWS): 'EncodedHeader.EndcodedPayload.EncodedSignature'. (JWE): 'EncodedProtectedHeader.EncodedEncryptedKey.EncodedInitializationVector.EncodedCiphertext.EncodedAuthenticationTag'.";
//        internal const string IDX14101 = "IDX14101: Unable to decode the payload '{0}' as Base64Url encoded string. jwtEncodedString: '{1}'.";
//        internal const string IDX14102 = "IDX14102: Unable to decode the header '{0}' as Base64Url encoded string. jwtEncodedString: '{1}'.";
//        internal const string IDX14103 = "IDX14103: Failed to create the token encryption provider.";
//        internal const string IDX14104 = "IDX14104: Unable to obtain a CryptoProviderFactory, EncryptingCredentials.CryptoProviderFactory and EncryptingCredentials.Key.CrypoProviderFactory are both null.";
//        internal const string IDX14105 = "IDX14105: Header.Cty != null, assuming JWS. Cty: '{0}'.";
//        internal const string IDX14106 = "IDX14106: Decoding token: '{0}' into header, payload and signature.";
//        internal const string IDX14107 = "IDX14107: Token string does not match the token formats: JWE (header.encryptedKey.iv.ciphertext.tag) or JWS (header.payload.signature)";
//        internal const string IDX14111 = "IDX14111: JWT: '{0}' must have three segments (JWS) or five segments (JWE).";
//        internal const string IDX14112 = "IDX14112: Only a single 'Actor' is supported. Found second claim of type: '{0}', value: '{1}'";
//        internal const string IDX14113 = "IDX14113: A duplicate value for 'SecurityTokenDescriptor.{0}' exists in 'SecurityTokenDescriptor.Claims'. \nThe value of 'SecurityTokenDescriptor.{0}' is used.";
//        internal const string IDX14114 = "IDX14114: No claims were added to the SecurityTokenDescriptor.";
//        internal const string IDX14115 = "IDX14115: A JWT cannot be created with an empty payload.";

//        // logging
//        internal const string IDX14200 = "IDX14200: Creating raw signature using the signature credentials.";

//        // parsing
//        internal const string IDX14300 = "IDX14300: Could not parse '{0}' : '{1}' as a '{2}'.";
//        internal const string IDX14301 = "IDX14301: Unable to parse the header into a JSON object. \nHeader: '{0}'.";
//        internal const string IDX14302 = "IDX14302: Unable to parse the payload into a JSON object. \nPayload: '{0}'.";
//        internal const string IDX14303 = "IDX14303: Claim with name '{0}' does not exist in the header.";
//        internal const string IDX14304 = "IDX14304: Claim with name '{0}' does not exist in the payload.";
//        internal const string IDX14305 = "IDX14305: Unable to convert the '{0}' claim to the following type: '{1}'. Claim type was: '{2}'.";
//#pragma warning restore 1591
//    }

//}

//namespace Microsoft.IdentityModel.Tokens
//{
//    /// <summary>
//    /// Log messages and codes
//    /// </summary>
//    internal static class LogMessages
//    {
//#pragma warning disable 1591
//        // general
//        public const string IDX10000 = "IDX10000: The parameter '{0}' cannot be a 'null' or an empty object.";

//        // properties, configuration 
//        public const string IDX10101 = "IDX10101: MaximumTokenSizeInBytes must be greater than zero. value: '{0}'";
//        public const string IDX10100 = "IDX10100: ClockSkew must be greater than TimeSpan.Zero. value: '{0}'";
//        public const string IDX10102 = "IDX10102: NameClaimType cannot be null or whitespace.";
//        public const string IDX10103 = "IDX10103: RoleClaimType cannot be null or whitespace.";
//        public const string IDX10104 = "IDX10104: TokenLifetimeInMinutes must be greater than zero. value: '{0}'";

//        // token validation
//        public const string IDX10204 = "IDX10204: Unable to validate issuer. validationParameters.ValidIssuer is null or whitespace AND validationParameters.ValidIssuers is null.";
//        public const string IDX10205 = "IDX10205: Issuer validation failed. Issuer: '{0}'. Did not match: validationParameters.ValidIssuer: '{1}' or validationParameters.ValidIssuers: '{2}'.";
//        public const string IDX10207 = "IDX10207: Unable to validate audience. The 'audiences' parameter is null.";
//        public const string IDX10208 = "IDX10208: Unable to validate audience. validationParameters.ValidAudience is null or whitespace and validationParameters.ValidAudiences is null.";
//        public const string IDX10209 = "IDX10209: Token has length: '{0}' which is larger than the MaximumTokenSizeInBytes: '{1}'.";
//        public const string IDX10211 = "IDX10211: Unable to validate issuer. The 'issuer' parameter is null or whitespace";
//        public const string IDX10214 = "IDX10214: Audience validation failed. Audiences: '{0}'. Did not match: validationParameters.ValidAudience: '{1}' or validationParameters.ValidAudiences: '{2}'.";
//        public const string IDX10222 = "IDX10222: Lifetime validation failed. The token is not yet valid. ValidFrom: '{0}', Current time: '{1}'.";
//        public const string IDX10223 = "IDX10223: Lifetime validation failed. The token is expired. ValidTo: '{0}', Current time: '{1}'.";
//        public const string IDX10224 = "IDX10224: Lifetime validation failed. The NotBefore: '{0}' is after Expires: '{1}'.";
//        public const string IDX10225 = "IDX10225: Lifetime validation failed. The token is missing an Expiration Time. Tokentype: '{0}'.";
//        public const string IDX10227 = "IDX10227: TokenValidationParameters.TokenReplayCache is not null, indicating to check for token replay but the security token has no expiration time: token '{0}'.";
//        public const string IDX10228 = "IDX10228: The securityToken has previously been validated, securityToken: '{0}'.";
//        public const string IDX10229 = "IDX10229: TokenValidationParameters.TokenReplayCache was unable to add the securityToken: '{0}'.";
//        public const string IDX10230 = "IDX10230: Lifetime validation failed. Delegate returned false, securitytoken: '{0}'.";
//        public const string IDX10231 = "IDX10231: Audience validation failed. Delegate returned false, securitytoken: '{0}'.";
//        public const string IDX10232 = "IDX10232: IssuerSigningKey validation failed. Delegate returned false, securityKey: '{0}'.";
//        public const string IDX10233 = "IDX10233: ValidateAudience property on ValidationParameters is set to false. Exiting without validating the audience.";
//        public const string IDX10234 = "IDX10234: Audience Validated.Audience: '{0}'";
//        public const string IDX10235 = "IDX10235: ValidateIssuer property on ValidationParameters is set to false. Exiting without validating the issuer.";
//        public const string IDX10236 = "IDX10236: Issuer Validated.Issuer: '{0}'";
//        public const string IDX10237 = "IDX10237: ValidateIssuerSigningKey property on ValidationParameters is set to false. Exiting without validating the issuer signing key.";
//        public const string IDX10238 = "IDX10238: ValidateLifetime property on ValidationParameters is set to false. Exiting without validating the lifetime.";
//        public const string IDX10239 = "IDX10239: Lifetime of the token is valid.";
//        public const string IDX10240 = "IDX10240: No token replay is detected.";
//        public const string IDX10241 = "IDX10241: Security token validated. token: '{0}'.";
//        public const string IDX10242 = "IDX10242: Security token: '{0}' has a valid signature.";
//        public const string IDX10243 = "IDX10243: Reading issuer signing keys from validation parameters.";
//        public const string IDX10244 = "IDX10244: Issuer is null or empty. Using runtime default for creating claims '{0}'.";
//        public const string IDX10245 = "IDX10245: Creating claims identity from the validated token: '{0}'.";
//        public const string IDX10246 = "IDX10246: ValidateTokenReplay property on ValidationParameters is set to false. Exiting without validating the token replay.";
//        public const string IDX10247 = "IDX10247: The current issuer value in ValidateIssuers property on ValidationParameters is null or empty, skipping it for issuer validation.";
//        public const string IDX10248 = "IDX10248: X509SecurityKey validation failed. The associated certificate is not yet valid. ValidFrom (UTC): '{0}', Current time (UTC): '{1}'.";
//        public const string IDX10249 = "IDX10249: X509SecurityKey validation failed. The associated certificate has expired. ValidTo (UTC): '{0}', Current time (UTC): '{1}'.";
//        public const string IDX10250 = "IDX10250: The associated certificate is valid. ValidFrom (UTC): '{0}', Current time (UTC): '{1}'.";
//        public const string IDX10251 = "IDX10251: The associated certificate is valid. ValidTo (UTC): '{0}', Current time (UTC): '{1}'.";
//        public const string IDX10252 = "IDX10252: RequireSignedTokens property on ValidationParameters is set to false and the issuer signing key is null. Exiting without validating the issuer signing key.";
//        public const string IDX10253 = "IDX10253: RequireSignedTokens property on ValidationParameters is set to true, but the issuer signing key is null.";
//        public const string IDX10254 = "IDX10254: '{0}.{1}' failed. The virtual method '{2}.{3}' returned null. If this method was overridden, ensure a valid '{4}' is returned.";

//        // 10500 - SignatureValidation
//        public const string IDX10500 = "IDX10500: Signature validation failed. No security keys were provided to validate the signature.";
//        public const string IDX10501 = "IDX10501: Signature validation failed. Unable to match key: \nkid: '{0}'.\nExceptions caught:\n '{1}'. \ntoken: '{2}'.";
//        public const string IDX10503 = "IDX10503: Signature validation failed. Keys tried: '{0}'.\nExceptions caught:\n '{1}'.\ntoken: '{2}'.";
//        public const string IDX10504 = "IDX10504: Unable to validate signature, token does not have a signature: '{0}'.";
//        public const string IDX10505 = "IDX10505: Signature validation failed. The user defined 'Delegate' specified on TokenValidationParameters returned null when validating token: '{0}'.";
//        public const string IDX10506 = "IDX10506: Signature validation failed. The user defined 'Delegate' specified on TokenValidationParameters did not return a '{0}', but returned a '{1}' when validating token: '{2}'.";
//        public const string IDX10507 = "IDX10507: Signature validation failed. ValidateSignature returned null when validating token: '{0}'.";
//        public const string IDX10508 = "IDX10508: Signature validation failed. Signature is improperly formatted.";
//        public const string IDX10509 = "IDX10509: Signature validation failed. The user defined 'Delegate' specified in TokenValidationParameters did not return a '{0}', but returned a '{1}' when reading token: '{2}'.";
//        public const string IDX10510 = "IDX10510: Signature validation failed. The user defined 'Delegate' specified in TokenValidationParameters returned null when reading token: '{0}'.";
//        public const string IDX10511 = "IDX10511: Signature validation failed. Keys tried: '{0}'. \nkid: '{1}'. \nExceptions caught:\n '{2}'.\ntoken: '{3}'.";

//        // encryption / decryption
//        public const string IDX10600 = "IDX10600: Decryption failed. There are no security keys for decryption.";
//        public const string IDX10601 = "IDX10601: Decryption failed. Unable to match 'kid': '{0}', \ntoken: '{1}'.";
//        public const string IDX10603 = "IDX10603: Decryption failed. Keys tried: '{0}'.\nExceptions caught:\n '{1}'.\ntoken: '{2}'";
//        public const string IDX10604 = "IDX10604: Decryption failed. Exception: '{0}'.";
//        public const string IDX10605 = "IDX10605: Decryption failed. Only 'dir' is currently supported. JWE alg is: '{0}'.";
//        public const string IDX10606 = "IDX10606: Decryption failed. To decrypt a JWE there must be 5 parts. 'tokenParts' is of length: '{0}'.";
//        public const string IDX10607 = "IDX10607: Decryption skipping key: '{0}', both validationParameters.CryptoProviderFactory and key.CryptoProviderFactory are null.";
//        public const string IDX10608 = "IDX10608: Decryption skipping key: '{0}', it is not a '{1}'.";
//        public const string IDX10609 = "IDX10609: Decryption failed. No Keys tried: token: '{0}'.";
//        public const string IDX10610 = "IDX10610: Decryption failed. Could not create decryption provider. Key: '{0}', Algorithm: '{1}'.";
//        public const string IDX10611 = "IDX10611: Decryption failed. Encryption is not supported for: Algorithm: '{0}', SecurityKey: '{1}'.";
//        public const string IDX10612 = "IDX10612: Decryption failed. Header.Enc is null or empty, it must be specified.";
//        //public const string IDX10613 = "IDX10613:"
//        public const string IDX10614 = "IDX10614: Decryption failed. JwtHeader.Base64UrlDeserialize(tokenParts[0]): '{0}'. Inner exception: '{1}'.";
//        public const string IDX10615 = "IDX10615: Encryption failed. No support for: Algorithm: '{0}', SecurityKey: '{1}'.";
//        public const string IDX10616 = "IDX10616: Encryption failed. EncryptionProvider failed for: Algorithm: '{0}', SecurityKey: '{1}'. See inner exception.";
//        public const string IDX10617 = "IDX10617: Encryption failed. Keywrap is only supported for: '{0}', '{1}' and '{2}'. The content encryption specified is: '{3}'.";

//        // Formating
//        public const string IDX10400 = "IDX10400: Unable to decode: '{0}' as Base64url encoded string.";
//        public const string IDX10401 = "IDX10401: Invalid requested key size. Valid key sizes are: 256, 384, and 512.";

//        // Crypto Errors
//        public const string IDX10621 = "IDX10621: '{0}' supports: '{1}' of types: '{2}' or '{3}'. SecurityKey received was of type '{4}'.";
//        public const string IDX10622 = "IDX10622: The algorithm: '{0}' requires the SecurityKey.KeySize to be greater than '{1}' bits. KeySize reported: '{2}'.";
//        public const string IDX10623 = "IDX10623: Cannot sign data because the KeyedHashAlgorithm is null.";
//        public const string IDX10624 = "IDX10624: Cannot verify data because the KeyedHashAlgorithm is null.";
//        public const string IDX10627 = "IDX10627: Cannot set the MinimumAsymmetricKeySizeInBitsForVerifying to less than '{0}'.";
//        public const string IDX10628 = "IDX10628: Cannot set the MinimumSymmetricKeySizeInBits to less than '{0}'.";
//        public const string IDX10630 = "IDX10630: The '{0}' for signing cannot be smaller than '{1}' bits. KeySize: '{2}'.";
//        public const string IDX10631 = "IDX10631: The '{0}' for verifying cannot be smaller than '{1}' bits. KeySize: '{2}'.";
//        public const string IDX10634 = "IDX10634: Unable to create the SignatureProvider.\nAlgorithm: '{0}', SecurityKey: '{1}'\n is not supported. The list of supported algorithms is available here: https://aka.ms/IdentityModel/supported-algorithms";
//        public const string IDX10635 = "IDX10635: Unable to create signature. '{0}' returned a null '{1}'. SecurityKey: '{2}', Algorithm: '{3}'";
//        public const string IDX10636 = "IDX10636: CryptoProviderFactory.CreateForVerifying returned null for key: '{0}', signatureAlgorithm: '{1}'.";
//        public const string IDX10638 = "IDX10638: Cannot create the SignatureProvider, 'key.HasPrivateKey' is false, cannot create signatures. Key: {0}.";
//        public const string IDX10640 = "IDX10640: Algorithm is not supported: '{0}'.";
//        public const string IDX10641 = "IDX10641: Key is not supported: '{0}'.";
//        public const string IDX10642 = "IDX10642: Creating signature using the input: '{0}'.";
//        public const string IDX10643 = "IDX10643: Comparing the signature created over the input with the token signature: '{0}'.";
//        public const string IDX10644 = "IDX10644: UnwrapKey failed. Algorithm: '{0}'.";
//        public const string IDX10645 = "IDX10645: Elliptical Curve not supported for curveId: '{0}'";
//        public const string IDX10646 = "IDX10646: A CustomCryptoProvider was set and returned 'true' for IsSupportedAlgorithm(Algorithm: '{0}', Key: '{1}'), but Create.(algorithm, args) as '{2}' == NULL.";
//        public const string IDX10647 = "IDX10647: A CustomCryptoProvider was set and returned 'true' for IsSupportedAlgorithm(Algorithm: '{0}'), but Create.(algorithm, args) as '{1}' == NULL.";
//        public const string IDX10648 = "IDX10648: The SecurityKey provided for AuthenticatedEncryption must be a SymmetricSecurityKey. Type is: '{0}'.";
//        public const string IDX10649 = "IDX10649: Failed to create a SymmetricSignatureProvider for the algorithm '{0}'.";
//        public const string IDX10650 = "IDX10650: Failed to verify ciphertext with aad '{0}'; iv '{1}'; and authenticationTag '{2}'.";
//        public const string IDX10651 = "IDX10651: The key length for the algorithm '{0]' cannot be less than '{1}'.";
//        public const string IDX10652 = "IDX10652: The algorithm '{0}' is not supported.";
//        public const string IDX10653 = "IDX10653: The encryption algorithm '{0}' requires a key size of at least '{1}' bits. Key '{2}', is of size: '{3}'.";
//        public const string IDX10654 = "IDX10654: Decryption failed. Cryptographic operation exception: '{0}'.";
//        public const string IDX10655 = "IDX10655: 'length' must be greater than 1: '{0}'";
//        public const string IDX10656 = "IDX10656: 'length' cannot be greater than signature.Length. length: '{0}', signature.Length: '{1}'.";
//        public const string IDX10657 = "IDX10657: The SecurityKey provided for the symmetric key wrap algorithm cannot be converted to byte array. Type is: '{0}'.";
//        public const string IDX10658 = "IDX10658: WrapKey failed, exception from cryptographic operation: '{0}'";
//        public const string IDX10659 = "IDX10659: UnwrapKey failed, exception from cryptographic operation: '{0}'";
//        public const string IDX10660 = "IDX10660: The Key: '{0}' and algorithm: '{1}' pair are not supported.";
//        public const string IDX10661 = "IDX10661: Unable to create the KeyWrapProvider.\nKeyWrapAlgorithm: '{0}', SecurityKey: '{1}'\n is not supported.";
//        public const string IDX10662 = "IDX10662: The KeyWrap algorithm '{0}' requires a key size of '{1}' bits. Key '{2}', is of size:'{3}'.";
//        public const string IDX10663 = "IDX10663: Failed to create symmetric algorithm with SecurityKey: '{0}', KeyWrapAlgorithm: '{1}'.";
//        public const string IDX10664 = "IDX10664: The length of input must be a multiple of 64 bits. The input size is: '{0}' bits.";
//        public const string IDX10665 = "IDX10665: Data is not authentic";
//        public const string IDX10666 = "IDX10666: Unable to create KeyedHashAlgorithm for algorithm '{0}'.";
//        public const string IDX10667 = "IDX10667: Unable to obtain required byte array for KeyHashAlgorithm from SecurityKey: '{0}'.";
//        public const string IDX10668 = "IDX10668: Unable to create '{0}', algorithm '{1}'; key: '{2}' is not supported.";
//        public const string IDX10669 = "IDX10669: Failed to create symmetric algorithm.";
//        public const string IDX10670 = "IDX10670: The lengths of the two byte arrays do not match. The first one has: '{0}' bytes, the second one has: '{1}' bytes.";
//        public const string IDX10671 = "IDX10671: The ECDsa Key: '{0}' must be '{1}' bits. KeySize: '{2}'.";
//        public const string IDX10672 = "IDX10672: GetKeyedHashAlgorithm returned null, key: {0}, algorithm {1}.";
//        public const string IDX10673 = "IDX10673: CryptoProviderFactory.GetHashAlgorithm returned null, factory: {0}, algorithm: {1}.";
//        public const string IDX10674 = "IDX10674: JsonWebKeyConverter does not support SecurityKey of type: {0}";
//        public const string IDX10675 = "IDX10675: The byte count of '{0}' must be less than or equal to '{1}', but was {2}.";
//        //public const string IDX10676 = "IDX10676:"
//        public const string IDX10677 = "IDX10677: GetKeyedHashAlgorithm threw, key: {0}, algorithm {1}.";
//        public const string IDX10678 = "IDX10678: Unable to Sign, provider is not available, Algorithm, Key: '{0}', '{1}'.";
//        public const string IDX10679 = "IDX10679: Failed to decompress using algorithm '{0}'.";
//        public const string IDX10680 = "IDX10680: Failed to compress using algorithm '{0}'.";
//        public const string IDX10681 = "IDX10681: Unable to create the CompressionProvider.\nAlgorithm: '{0}' is not supported.";
//        public const string IDX10682 = "IDX10682: Compression algorithm '{0}' is not supported.";
//        public const string IDX10683 = "IDX10683: Unable to create a AsymmetricSignatureProvider Algorithm: '{0}', Key: '{1}'.";
//        public const string IDX10684 = "IDX10684: Unable to create a AsymmetricAdapter, Algorithm: '{0}', Key: '{1}'.";
//        public const string IDX10685 = "IDX10685: Unable to Sign, Internal SignFunction is not available.";
//        public const string IDX10686 = "IDX10686: Unable to Verify, Internal VerifyFunction is not available.";
//        public const string IDX10687 = "IDX10687: Unable to create a AsymmetricAdapter. For NET45 or NET451 only types: '{0}' or '{1}' are supported. RSA is of type: '{2}'..";
//        //public const string IDX10688 = "IDX10688:"
//        public const string IDX10689 = "IDX10689: Unable to create an ECDsa object. See inner exception for more details.";
//        public const string IDX10690 = "IDX10690: ECDsa creation is not supported by NETSTANDARD1.4, when running on platforms other than Windows. For more details, see https://aka.ms/IdentityModel/create-ecdsa";
//        //public const string IDX10691 = "IDX10691:"
//        public const string IDX10692 = "IDX10692: The RSASS-PSS signature algorithm is not available on .NET 4.5 and .NET 4.5.1 targets. The list of supported algorithms is available here: https://aka.ms/IdentityModel/supported-algorithms";
//        public const string IDX10693 = "IDX10693: RSACryptoServiceProvider doesn't support the RSASSA-PSS signature algorithm. The list of supported algorithms is available here: https://aka.ms/IdentityModel/supported-algorithms";

//        // security keys
//        public const string IDX10700 = "IDX10700: {0} is unable to use 'rsaParameters'. {1} is null.";
//        //public const string IDX10701 = "IDX10701:"
//        //public const string IDX10702 = "IDX10702:"
//        public const string IDX10703 = "IDX10703: Cannot create a '{0}', key length is zero.";

//        // Json specific errors
//        //public const string IDX10801 = "IDX10801:"
//        //public const string IDX10802 = "IDX10802:"
//        //public const string IDX10804 = "IDX10804:"
//        public const string IDX10805 = "IDX10805: Error deserializing json: '{0}' into '{1}'.";
//        public const string IDX10806 = "IDX10806: Deserializing json: '{0}' into '{1}'.";
//        //public const string IDX10807 = "IDX10807:"
//        public const string IDX10808 = "IDX10808: The 'use' parameter of a JsonWebKey: '{0}' was expected to be 'sig' or empty, but was '{1}'.";
//        //public const string IDX10809 = "IDX10809:"
//        public const string IDX10810 = "IDX10810: Unable to convert the JsonWebKey: '{0}' to a X509SecurityKey, RsaSecurityKey or ECDSASecurityKey.";
//        //public const string IDX10811 = "IDX10811:"
//        public const string IDX10812 = "IDX10812: Unable to create a {0} from the properties found in the JsonWebKey: '{1}'.";
//        public const string IDX10813 = "IDX10813: Unable to create a {0} from the properties found in the JsonWebKey: '{1}', Exception '{2}'.";

//#pragma warning restore 1591
//    }
//}

//namespace System.IdentityModel.Tokens.Jwt
//{
//    /// <summary>
//    /// Log messages and codes
//    /// </summary>
//    public static class LogMessages
//    {
//#pragma warning disable 1591
//        // token creation
//        internal const string IDX12401 = "IDX12401: Expires: '{0}' must be after NotBefore: '{1}'.";

//        // JWT messages
//        internal const string IDX12700 = "IDX12700: Error found while parsing date time. The '{0}' claim has value '{1}' which is could not be parsed to an integer.";
//        internal const string IDX12701 = "IDX12701: Error found while parsing date time. The '{0}' claim has value '{1}' does not lie in the valid range.";
//        internal const string IDX12706 = "IDX12706: '{0}' can only write SecurityTokens of type: '{1}', 'token' type is: '{2}'.";
//        internal const string IDX12709 = "IDX12709: CanReadToken() returned false. JWT is not well formed: '{0}'.\nThe token needs to be in JWS or JWE Compact Serialization Format. (JWS): 'EncodedHeader.EndcodedPayload.EncodedSignature'. (JWE): 'EncodedProtectedHeader.EncodedEncryptedKey.EncodedInitializationVector.EncodedCiphertext.EncodedAuthenticationTag'.";
//        internal const string IDX12710 = "IDX12710: Only a single 'Actor' is supported. Found second claim of type: '{0}', value: '{1}'";
//        internal const string IDX12711 = "IDX12711: actor.BootstrapContext is not a string AND actor.BootstrapContext is not a JWT";
//        internal const string IDX12712 = "IDX12712: actor.BootstrapContext is null. Creating the token using actor.Claims.";
//        internal const string IDX12713 = "IDX12713: Creating actor value using actor.BootstrapContext(as string)";
//        internal const string IDX12714 = "IDX12714: Creating actor value using actor.BootstrapContext.rawData";
//        internal const string IDX12715 = "IDX12715: Creating actor value by writing the JwtSecurityToken created from actor.BootstrapContext";
//        internal const string IDX12716 = "IDX12716: Decoding token: '{0}' into header, payload and signature.";
//        internal const string IDX12720 = "IDX12720: Token string does not match the token formats: JWE (header.encryptedKey.iv.ciphertext.tag) or JWS (header.payload.signature)";
//        internal const string IDX12721 = "IDX12721: Creating JwtSecurityToken: Issuer: '{0}', Audience: '{1}'";
//        internal const string IDX12722 = "IDX12722: Creating security token from the header: '{0}', payload: '{1}' and raw signature: '{2}'.";
//        internal const string IDX12723 = "IDX12723: Unable to decode the payload '{0}' as Base64Url encoded string. jwtEncodedString: '{1}'.";
//        internal const string IDX12729 = "IDX12729: Unable to decode the header '{0}' as Base64Url encoded string. jwtEncodedString: '{1}'.";
//        internal const string IDX12730 = "IDX12730: Failed to create the token encryption provider.";
//        internal const string IDX12733 = "IDX12733: Unable to obtain a CryptoProviderFactory, both EncryptingCredentials.CryptoProviderFactory and EncryptingCredentials.Key.CrypoProviderFactory are both null.";
//        internal const string IDX12735 = "IDX12735: If JwtSecurityToken.InnerToken != null, then JwtSecurityToken.Header.EncryptingCredentials must be set.";
//        internal const string IDX12736 = "IDX12736: JwtSecurityToken.SigningCredentials is not supported when JwtSecurityToken.InnerToken is set.";
//        internal const string IDX12737 = "IDX12737: EncryptingCredentials set on JwtSecurityToken.InnerToken is not supported.";
//        internal const string IDX12738 = "IDX12738: Header.Cty != null, assuming JWS. Cty: '{0}'.";
//        internal const string IDX12739 = "IDX12739: JWT: '{0}' has three segments but is not in proper JWS format.";
//        internal const string IDX12740 = "IDX12740: JWT: '{0}' has five segments but is not in proper JWE format.";
//        internal const string IDX12741 = "IDX12741: JWT: '{0}' must have three segments (JWS) or five segments (JWE).";
//#pragma warning restore 1591
//    }
//}
//namespace System.IdentityModel.Tokens.Jwt
//{
//    /// <summary>
//    /// Defines the inbound and outbound mapping for claim claim types from jwt to .net claim 
//    /// </summary>
//    internal static class ClaimTypeMapping
//    {
//        // This is the short to long mapping.
//        // key      is the long  claim type
//        // value    is the short claim type
//        private static Dictionary<string, string> shortToLongClaimTypeMapping = null;
//        private static IDictionary<string, string> longToShortClaimTypeMapping = null;
//        private static HashSet<string> inboundClaimFilter = null;

//        /// <summary>
//        /// Initializes static members of the <see cref="ClaimTypeMapping"/> class. 
//        /// </summary>
//        static ClaimTypeMapping()
//        {
//            shortToLongClaimTypeMapping = new Dictionary<string, string>
//            {
//                { JwtRegisteredClaimNames.Actort, ClaimTypes.Actor },
//                { JwtRegisteredClaimNames.Birthdate, ClaimTypes.DateOfBirth },
//                { JwtRegisteredClaimNames.Email, ClaimTypes.Email },
//                { JwtRegisteredClaimNames.FamilyName, ClaimTypes.Surname },
//                { JwtRegisteredClaimNames.Gender, ClaimTypes.Gender },
//                { JwtRegisteredClaimNames.GivenName, ClaimTypes.GivenName },
//                { JwtRegisteredClaimNames.NameId, ClaimTypes.NameIdentifier },
//                { JwtRegisteredClaimNames.Sub, ClaimTypes.NameIdentifier },
//                { JwtRegisteredClaimNames.Website, ClaimTypes.Webpage },
//                { JwtRegisteredClaimNames.UniqueName, ClaimTypes.Name },
//                { "oid", "http://schemas.microsoft.com/identity/claims/objectidentifier" },
//                { "scp", "http://schemas.microsoft.com/identity/claims/scope" },
//                { "tid", "http://schemas.microsoft.com/identity/claims/tenantid" },
//                { "acr", "http://schemas.microsoft.com/claims/authnclassreference" },
//                { "adfs1email", "http://schemas.xmlsoap.org/claims/EmailAddress" },
//                { "adfs1upn", "http://schemas.xmlsoap.org/claims/UPN" },
//                { "amr", "http://schemas.microsoft.com/claims/authnmethodsreferences" },
//                { "authmethod", ClaimTypes.AuthenticationMethod },
//                { "certapppolicy", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/applicationpolicy" },
//                { "certauthoritykeyidentifier", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/authoritykeyidentifier" },
//                { "certbasicconstraints", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/basicconstraints" },
//                { "certeku", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/eku" },
//                { "certissuer", "http://schemas.microsoft.com/2012/12/certificatecontext/field/issuer" },
//                { "certissuername", "http://schemas.microsoft.com/2012/12/certificatecontext/field/issuername" },
//                { "certkeyusage", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/keyusage" },
//                { "certnotafter", "http://schemas.microsoft.com/2012/12/certificatecontext/field/notafter" },
//                { "certnotbefore", "http://schemas.microsoft.com/2012/12/certificatecontext/field/notbefore" },
//                { "certpolicy", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/certificatepolicy" },
//                { "certpublickey", ClaimTypes.Rsa },
//                { "certrawdata", "http://schemas.microsoft.com/2012/12/certificatecontext/field/rawdata" },
//                { "certserialnumber", ClaimTypes.SerialNumber },
//                { "certsignaturealgorithm", "http://schemas.microsoft.com/2012/12/certificatecontext/field/signaturealgorithm" },
//                { "certsubject", "http://schemas.microsoft.com/2012/12/certificatecontext/field/subject" },
//                { "certsubjectaltname", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/san" },
//                { "certsubjectkeyidentifier", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/subjectkeyidentifier" },
//                { "certsubjectname", "http://schemas.microsoft.com/2012/12/certificatecontext/field/subjectname" },
//                { "certtemplateinformation", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/certificatetemplateinformation" },
//                { "certtemplatename", "http://schemas.microsoft.com/2012/12/certificatecontext/extension/certificatetemplatename" },
//                { "certthumbprint", ClaimTypes.Thumbprint },
//                { "certx509version", "http://schemas.microsoft.com/2012/12/certificatecontext/field/x509version" },
//                { "clientapplication", "http://schemas.microsoft.com/2012/01/requestcontext/claims/x-ms-client-application" },
//                { "clientip", "http://schemas.microsoft.com/2012/01/requestcontext/claims/x-ms-client-ip" },
//                { "clientuseragent", "http://schemas.microsoft.com/2012/01/requestcontext/claims/x-ms-client-user-agent" },
//                { "commonname", "http://schemas.xmlsoap.org/claims/CommonName" },
//                { "denyonlyprimarygroupsid", ClaimTypes.DenyOnlyPrimaryGroupSid },
//                { "denyonlyprimarysid", ClaimTypes.DenyOnlyPrimarySid },
//                { "denyonlysid", ClaimTypes.DenyOnlySid },
//                { "devicedispname", "http://schemas.microsoft.com/2012/01/devicecontext/claims/displayname" },
//                { "deviceid", "http://schemas.microsoft.com/2012/01/devicecontext/claims/identifier" },
//                { "deviceismanaged", "http://schemas.microsoft.com/2012/01/devicecontext/claims/ismanaged" },
//                { "deviceostype", "http://schemas.microsoft.com/2012/01/devicecontext/claims/ostype" },
//                { "deviceosver", "http://schemas.microsoft.com/2012/01/devicecontext/claims/osversion" },
//                { "deviceowner", "http://schemas.microsoft.com/2012/01/devicecontext/claims/userowner" },
//                { "deviceregid", "http://schemas.microsoft.com/2012/01/devicecontext/claims/registrationid" },
//                { "endpointpath", "http://schemas.microsoft.com/2012/01/requestcontext/claims/x-ms-endpoint-absolute-path" },
//                { "forwardedclientip", "http://schemas.microsoft.com/2012/01/requestcontext/claims/x-ms-forwarded-client-ip" },
//                { "group", "http://schemas.xmlsoap.org/claims/Group" },
//                { "groupsid", ClaimTypes.GroupSid },
//                { "idp", "http://schemas.microsoft.com/identity/claims/identityprovider" },
//                { "insidecorporatenetwork", "http://schemas.microsoft.com/ws/2012/01/insidecorporatenetwork" },
//                { "isregistereduser", "http://schemas.microsoft.com/2012/01/devicecontext/claims/isregistereduser" },
//                { "ppid", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/privatepersonalidentifier" },
//                { "primarygroupsid", ClaimTypes.PrimaryGroupSid },
//                { "primarysid", ClaimTypes.PrimarySid },
//                { "proxy", "http://schemas.microsoft.com/2012/01/requestcontext/claims/x-ms-proxy" },
//                { "pwdchgurl", "http://schemas.microsoft.com/ws/2012/01/passwordchangeurl" },
//                { "pwdexpdays", "http://schemas.microsoft.com/ws/2012/01/passwordexpirationdays" },
//                { "pwdexptime", "http://schemas.microsoft.com/ws/2012/01/passwordexpirationtime" },
//                { "relyingpartytrustid", "http://schemas.microsoft.com/2012/01/requestcontext/claims/relyingpartytrustid" },
//                { "role", ClaimTypes.Role },
//                { "roles", ClaimTypes.Role },
//                { "upn", ClaimTypes.Upn },
//                { "winaccountname", ClaimTypes.WindowsAccountName },
//            };

//            longToShortClaimTypeMapping = new Dictionary<string, string>();
//            foreach (KeyValuePair<string, string> kv in shortToLongClaimTypeMapping)
//            {
//                if (longToShortClaimTypeMapping.ContainsKey(kv.Value))
//                {
//                    continue;
//                }

//                longToShortClaimTypeMapping.Add(kv.Value, kv.Key);
//            }

//            inboundClaimFilter = new HashSet<string>();
//        }

//        /// <summary>
//        /// Gets the InboundClaimTypeMap used by JwtSecurityTokenHandler when producing claims from jwt. 
//        /// </summary>
//        public static IDictionary<string, string> InboundClaimTypeMap
//        {
//            get
//            {
//                return shortToLongClaimTypeMapping;
//            }
//        }

//        /// <summary>
//        /// Gets the OutboundClaimTypeMap is used by JwtSecurityTokenHandler to shorten claim types when creating a jwt. 
//        /// </summary>
//        public static IDictionary<string, string> OutboundClaimTypeMap
//        {
//            get
//            {
//                return longToShortClaimTypeMapping;
//            }
//        }

//        public static ISet<string> InboundClaimFilter
//        {
//            get
//            {
//                return inboundClaimFilter;
//            }
//        }
//    }
//}

//namespace System.IdentityModel.Tokens.Jwt
//{
//    /// <summary>
//    /// Constants for Json Web tokens.
//    /// </summary>
//    public static class JwtConstants
//    {
//        /// <summary>
//        /// Short header type.
//        /// </summary>
//        public const string HeaderType = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.HeaderType;

//        /// <summary>
//        /// Long header type.
//        /// </summary>
//        public const string HeaderTypeAlt = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.HeaderTypeAlt;

//        /// <summary>
//        /// Short token type.
//        /// </summary>
//        public const string TokenType = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.TokenType;

//        /// <summary>
//        /// Long token type.
//        /// </summary>
//        public const string TokenTypeAlt = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.TokenTypeAlt;

//        /// <summary>
//        /// JWS - Token format: 'header.payload.signature'. Signature is optional, but '.' is required.
//        /// </summary>
//        public const string JsonCompactSerializationRegex = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JsonCompactSerializationRegex;

//        /// <summary>
//        /// JWE - Token format: 'protectedheader.encryptedkey.iv.cyphertext.authenticationtag'.
//        /// </summary>
//        public const string JweCompactSerializationRegex = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JweCompactSerializationRegex;

//        /// <summary>
//        /// The number of parts in a JWE token.
//        /// </summary>
//        internal const int JweSegmentCount = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JweSegmentCount;

//        /// <summary>
//        /// The number of parts in a JWS token.
//        /// </summary>
//        internal const int JwsSegmentCount = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.JwsSegmentCount;

//        /// <summary>
//        /// The maximum number of parts in a JWT.
//        /// </summary>
//        internal const int MaxJwtSegmentCount = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.MaxJwtSegmentCount;

//        /// <summary>
//        /// JWE header alg indicating a shared symmetric key is directly used as CEK.
//        /// </summary>
//        public const string DirectKeyUseAlg = Microsoft.IdentityModel.JsonWebTokens.JwtConstants.DirectKeyUseAlg;
//    }
//}

//namespace System.IdentityModel.Tokens.Jwt
//{
//    /// <summary>
//    /// A <see cref="SecurityToken"/> designed for representing a JSON Web Token (JWT).
//    /// </summary>
//    public class JwtSecurityToken : SecurityToken
//    {
//        private JwtPayload _payload;

//        /// <summary>
//        /// Initializes a new instance of <see cref="JwtSecurityToken"/> from a string in JWS Compact serialized format.
//        /// </summary>
//        /// <param name="jwtEncodedString">A JSON Web Token that has been serialized in JWS Compact serialized format.</param>
//        /// <exception cref="ArgumentNullException">'jwtEncodedString' is null.</exception>
//        /// <exception cref="ArgumentException">'jwtEncodedString' contains only whitespace.</exception>
//        /// <exception cref="ArgumentException">'jwtEncodedString' is not in JWS Compact serialized format.</exception>
//        /// <remarks>
//        /// The contents of this <see cref="JwtSecurityToken"/> have not been validated, the JSON Web Token is simply decoded. Validation can be accomplished using <see cref="JwtSecurityTokenHandler.ValidateToken(String, TokenValidationParameters, out SecurityToken)"/>
//        /// </remarks>
//        public JwtSecurityToken(string jwtEncodedString)
//        {
//            if (string.IsNullOrWhiteSpace(jwtEncodedString))
//                throw LogHelper.LogArgumentNullException(nameof(jwtEncodedString));

//            // Set the maximum number of segments to MaxJwtSegmentCount + 1. This controls the number of splits and allows detecting the number of segments is too large.
//            // For example: "a.b.c.d.e.f.g.h" => [a], [b], [c], [d], [e], [f.g.h]. 6 segments.
//            // If just MaxJwtSegmentCount was used, then [a], [b], [c], [d], [e.f.g.h] would be returned. 5 segments.
//            string[] tokenParts = jwtEncodedString.Split(new char[] { '.' }, JwtConstants.MaxJwtSegmentCount + 1);
//            if (tokenParts.Length == JwtConstants.JwsSegmentCount)
//            {
//                if (!JwtTokenUtilities.RegexJws.IsMatch(jwtEncodedString))
//                    throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12739, jwtEncodedString)));
//            }
//            else if (tokenParts.Length == JwtConstants.JweSegmentCount)
//            {
//                if (!JwtTokenUtilities.RegexJwe.IsMatch(jwtEncodedString))
//                    throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12740, jwtEncodedString)));
//            }
//            else
//                throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12741, jwtEncodedString)));

//            Decode(tokenParts, jwtEncodedString);
//        }

//        /// <summary>
//        /// Initializes a new instance of the <see cref="JwtSecurityToken"/> class where the <see cref="JwtHeader"/> contains the crypto algorithms applied to the encoded <see cref="JwtHeader"/> and <see cref="JwtPayload"/>. The jwtEncodedString is the result of those operations.
//        /// </summary>
//        /// <param name="header">Contains JSON objects representing the cryptographic operations applied to the JWT and optionally any additional properties of the JWT</param>
//        /// <param name="payload">Contains JSON objects representing the claims contained in the JWT. Each claim is a JSON object of the form { Name, Value }</param>
//        /// <param name="rawHeader">base64urlencoded JwtHeader</param>
//        /// <param name="rawPayload">base64urlencoded JwtPayload</param>
//        /// <param name="rawSignature">base64urlencoded JwtSignature</param>
//        /// <exception cref="ArgumentNullException">'header' is null.</exception>
//        /// <exception cref="ArgumentNullException">'payload' is null.</exception>
//        /// <exception cref="ArgumentNullException">'rawSignature' is null.</exception>
//        /// <exception cref="ArgumentException">'rawHeader' or 'rawPayload' is null or whitespace.</exception>
//        public JwtSecurityToken(JwtHeader header, JwtPayload payload, string rawHeader, string rawPayload, string rawSignature)
//        {
//            if (header == null)
//                throw LogHelper.LogArgumentNullException(nameof(header));

//            if (payload == null)
//                throw LogHelper.LogArgumentNullException(nameof(payload));

//            if (string.IsNullOrWhiteSpace(rawHeader))
//                throw LogHelper.LogArgumentNullException(nameof(rawHeader));

//            if (string.IsNullOrWhiteSpace(rawPayload))
//                throw LogHelper.LogArgumentNullException(nameof(rawPayload));

//            if (rawSignature == null)
//                throw LogHelper.LogArgumentNullException(nameof(rawSignature));

//            Header = header;
//            Payload = payload;
//            RawData = string.Concat(rawHeader, ".", rawPayload, ".", rawSignature);

//            RawHeader = rawHeader;
//            RawPayload = rawPayload;
//            RawSignature = rawSignature;
//        }

//        /// <summary>
//        /// Initializes an instance of <see cref="JwtSecurityToken"/> where the <see cref="JwtHeader"/> contains the crypto algorithms applied to the innerToken <see cref="JwtSecurityToken"/>.
//        /// </summary>
//        /// <param name="header">Defines cryptographic operations applied to the 'innerToken'.</param>
//        /// <param name="innerToken"></param>
//        /// <param name="rawEncryptedKey">base64urlencoded key</param>
//        /// <param name="rawHeader">base64urlencoded JwtHeader</param>
//        /// <param name="rawInitializationVector">base64urlencoded initialization vector.</param>
//        /// <param name="rawCiphertext">base64urlencoded encrypted innerToken</param>
//        /// <param name="rawAuthenticationTag">base64urlencoded authentication tag.</param>
//        /// <exception cref="ArgumentNullException">'header' is null.</exception>
//        /// <exception cref="ArgumentNullException">'innerToken' is null.</exception>
//        /// <exception cref="ArgumentNullException">'rawHeader' is null.</exception>
//        /// <exception cref="ArgumentNullException">'rawEncryptedKey' is null.</exception>
//        /// <exception cref="ArgumentNullException">'rawInitialVector' is null or empty.</exception>
//        /// <exception cref="ArgumentNullException">'rawCiphertext' is null or empty.</exception>
//        /// <exception cref="ArgumentNullException">'rawAuthenticationTag' is null or empty.</exception>
//        public JwtSecurityToken(JwtHeader header,
//                                JwtSecurityToken innerToken,
//                                string rawHeader,
//                                string rawEncryptedKey,
//                                string rawInitializationVector,
//                                string rawCiphertext,
//                                string rawAuthenticationTag)
//        {
//            if (header == null)
//                throw LogHelper.LogArgumentNullException(nameof(header));

//            if (innerToken == null)
//                throw LogHelper.LogArgumentNullException(nameof(innerToken));

//            if (rawEncryptedKey == null)
//                throw LogHelper.LogArgumentNullException(nameof(rawEncryptedKey));

//            if (string.IsNullOrEmpty(rawInitializationVector))
//                throw LogHelper.LogArgumentNullException(nameof(rawInitializationVector));

//            if (string.IsNullOrEmpty(rawCiphertext))
//                throw LogHelper.LogArgumentNullException(nameof(rawCiphertext));

//            if (string.IsNullOrEmpty(rawAuthenticationTag))
//                throw LogHelper.LogArgumentNullException(nameof(rawAuthenticationTag));

//            Header = header;
//            InnerToken = innerToken;
//            RawData = string.Join(".", rawHeader, rawEncryptedKey, rawInitializationVector, rawCiphertext, rawAuthenticationTag);
//            RawHeader = rawHeader;
//            RawEncryptedKey = rawEncryptedKey;
//            RawInitializationVector = rawInitializationVector;
//            RawCiphertext = rawCiphertext;
//            RawAuthenticationTag = rawAuthenticationTag;
//        }

//        /// <summary>
//        /// Initializes a new instance of the <see cref="JwtSecurityToken"/> class where the <see cref="JwtHeader"/> contains the crypto algorithms applied to the encoded <see cref="JwtHeader"/> and <see cref="JwtPayload"/>. The jwtEncodedString is the result of those operations.
//        /// </summary>
//        /// <param name="header">Contains JSON objects representing the cryptographic operations applied to the JWT and optionally any additional properties of the JWT</param>
//        /// <param name="payload">Contains JSON objects representing the claims contained in the JWT. Each claim is a JSON object of the form { Name, Value }</param>
//        /// <exception cref="ArgumentNullException">'header' is null.</exception>
//        /// <exception cref="ArgumentNullException">'payload' is null.</exception>
//        public JwtSecurityToken(JwtHeader header, JwtPayload payload)
//        {
//            if (header == null)
//                throw LogHelper.LogArgumentNullException(nameof(header));

//            if (payload == null)
//                throw LogHelper.LogArgumentNullException(nameof(payload));

//            Header = header;
//            Payload = payload;
//            RawSignature = string.Empty;
//        }

//        /// <summary>
//        /// Initializes a new instance of the <see cref="JwtSecurityToken"/> class specifying optional parameters.
//        /// </summary>
//        /// <param name="issuer">If this value is not null, a { iss, 'issuer' } claim will be added.</param>
//        /// <param name="audience">If this value is not null, a { aud, 'audience' } claim will be added</param>
//        /// <param name="claims">If this value is not null then for each <see cref="Claim"/> a { 'Claim.Type', 'Claim.Value' } is added. If duplicate claims are found then a { 'Claim.Type', List&lt;object&gt; } will be created to contain the duplicate values.</param>
//        /// <param name="expires">If expires.HasValue a { exp, 'value' } claim is added.</param>
//        /// <param name="notBefore">If notbefore.HasValue a { nbf, 'value' } claim is added.</param>
//        /// <param name="signingCredentials">The <see cref="SigningCredentials"/> that will be used to sign the <see cref="JwtSecurityToken"/>. See <see cref="JwtHeader(SigningCredentials)"/> for details pertaining to the Header Parameter(s).</param>
//        /// <exception cref="ArgumentException">If 'expires' &lt;= 'notbefore'.</exception>
//        public JwtSecurityToken(string issuer = null, string audience = null, IEnumerable<Claim> claims = null, DateTime? notBefore = null, DateTime? expires = null, SigningCredentials signingCredentials = null)
//        {
//            if (expires.HasValue && notBefore.HasValue)
//            {
//                if (notBefore >= expires)
//                    throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12401, expires.Value, notBefore.Value)));
//            }

//            Payload = new JwtPayload(issuer, audience, claims, notBefore, expires);
//            Header = new JwtHeader(signingCredentials);
//            RawSignature = string.Empty;
//        }

//        /// <summary>
//        /// Gets the 'value' of the 'actor' claim { actort, 'value' }.
//        /// </summary>
//        /// <remarks>If the 'actor' claim is not found, null is returned.</remarks> 
//        public string Actor
//        {
//            get
//            {
//                if (Payload != null)
//                    return Payload.Actort;
//                return String.Empty;
//            }
//        }

//        /// <summary>
//        /// Gets the list of 'audience' claim { aud, 'value' }.
//        /// </summary>
//        /// <remarks>If the 'audience' claim is not found, enumeration will be empty.</remarks>
//        public IEnumerable<string> Audiences
//        {
//            get
//            {
//                if (Payload != null)
//                    return Payload.Aud;
//                return new List<string>();
//            }
//        }

//        /// <summary>
//        /// Gets the <see cref="Claim"/>(s) for this token.
//        /// If this is a JWE token, this property only returns the encrypted claims;
//        ///  the unencrypted claims should be read from the header seperately.
//        /// </summary>
//        /// <remarks><para><see cref="Claim"/>(s) returned will NOT have the <see cref="Claim.Type"/> translated according to <see cref="JwtSecurityTokenHandler.InboundClaimTypeMap"/></para></remarks>
//        public IEnumerable<Claim> Claims
//        {
//            get
//            {
//                if (Payload != null)
//                    return Payload.Claims;
//                return new List<Claim>();
//            }
//        }

//        /// <summary>
//        /// Gets the Base64UrlEncoded <see cref="JwtHeader"/> associated with this instance.
//        /// </summary>
//        public virtual string EncodedHeader
//        {
//            get { return Header.Base64UrlEncode(); }
//        }

//        /// <summary>
//        /// Gets the Base64UrlEncoded <see cref="JwtPayload"/> associated with this instance.
//        /// </summary>
//        public virtual string EncodedPayload
//        {
//            get
//            {
//                if (Payload != null)
//                    return Payload.Base64UrlEncode();
//                return String.Empty;
//            }
//        }

//        /// <summary>
//        /// Gets the <see cref="JwtHeader"/> associated with this instance if the token is signed.
//        /// </summary>
//        public JwtHeader Header { get; internal set; }

//        /// <summary>
//        /// Gets the 'value' of the 'JWT ID' claim { jti, ''value' }.
//        /// </summary>
//        /// <remarks>If the 'JWT ID' claim is not found, an empty string is returned.</remarks>
//        public override string Id
//        {
//            get
//            {
//                if (Payload != null)
//                    return Payload.Jti;
//                return String.Empty;

//            }
//        }

//        /// <summary>
//        /// Gets the 'value' of the 'issuer' claim { iss, 'value' }.
//        /// </summary>
//        /// <remarks>If the 'issuer' claim is not found, an empty string is returned.</remarks>
//        public override string Issuer
//        {
//            get
//            {
//                if (Payload != null)
//                    return Payload.Iss;
//                return String.Empty;
//            }
//        }

//        /// <summary>
//        /// Gets the <see cref="JwtPayload"/> associated with this instance.
//        /// Note that if this JWT is nested ( <see cref="JwtSecurityToken.InnerToken"/> != null, this property represnts the payload of the most inner token.
//        /// This property can be null if the content type of the most inner token is unrecognized, in that case
//        ///  the content of the token is the string returned by PlainText property.
//        /// </summary>
//        public JwtPayload Payload
//        {
//            get
//            {
//                if (InnerToken != null)
//                    return InnerToken.Payload;
//                return _payload;
//            }
//            internal set
//            {
//                _payload = value;
//            }
//        }

//        /// <summary>
//        /// Gets the <see cref="JwtSecurityToken"/> associated with this instance.
//        /// </summary>
//        public JwtSecurityToken InnerToken { get; internal set; }

//        /// <summary>
//        /// Gets the original raw data of this instance when it was created.
//        /// </summary>
//        /// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/>
//        /// or <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/></remarks>
//        public string RawAuthenticationTag { get; private set; }

//        /// <summary>
//        /// Gets the original raw data of this instance when it was created.
//        /// </summary>
//        /// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/>
//        /// or <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/></remarks>
//        public string RawCiphertext { get; private set; }

//        /// <summary>
//        /// Gets the original raw data of this instance when it was created.
//        /// </summary>
//        /// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/>
//        /// or <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/></remarks>
//        public string RawData { get; private set; }

//        /// <summary>
//        /// Gets the original raw data of this instance when it was created.
//        /// </summary>
//        /// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/>
//        /// or <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/></remarks>
//        public string RawEncryptedKey { get; private set; }

//        /// <summary>
//        /// Gets the original raw data of this instance when it was created.
//        /// </summary>
//        /// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/>
//        /// or <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/></remarks>
//        public string RawInitializationVector { get; private set; }

//        /// <summary>
//        /// Gets the original raw data of this instance when it was created.
//        /// </summary>
//        /// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/>
//        /// or <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/></remarks>
//        public string RawHeader { get; internal set; }

//        /// <summary>
//        /// Gets the original raw data of this instance when it was created.
//        /// </summary>
//        /// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/>
//        /// or <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/></remarks>
//        public string RawPayload { get; internal set; }

//        /// <summary>
//        /// Gets the original raw data of this instance when it was created.
//        /// </summary>
//        /// <remarks>The original JSON Compact serialized format passed to one of the two constructors <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/>
//        /// or <see cref="System.IdentityModel.Tokens.Jwt.JwtSecurityToken"/></remarks>
//        public string RawSignature { get; internal set; }

//        /// <summary>
//        /// Gets the <see cref="SecurityKey"/>s for this instance.
//        /// </summary>
//        public override SecurityKey SecurityKey
//        {
//            get { return null; }
//        }

//        /// <summary>
//        /// Gets the signature algorithm associated with this instance.
//        /// </summary>
//        /// <remarks>If there is a <see cref="SigningCredentials"/> associated with this instance, a value will be returned.  Null otherwise.</remarks>
//        public string SignatureAlgorithm
//        {
//            get { return Header.Alg; }
//        }

//        /// <summary>
//        /// Gets the <see cref="SigningCredentials"/> to use when writing this token.
//        /// </summary>
//        public SigningCredentials SigningCredentials
//        {
//            get { return Header.SigningCredentials; }
//        }

//        /// <summary>
//        /// Gets the <see cref="EncryptingCredentials"/> to use when writing this token.
//        /// </summary>
//        public EncryptingCredentials EncryptingCredentials
//        {
//            get { return Header.EncryptingCredentials; }
//        }

//        /// <summary>
//        /// Gets or sets the <see cref="SecurityKey"/> that signed this instance.
//        /// </summary>
//        /// <remarks><see cref="JwtSecurityTokenHandler"/>.ValidateSignature(...) sets this value when a <see cref="SecurityKey"/> is used to successfully validate a signature.</remarks>
//        public override SecurityKey SigningKey { get; set; }

//        /// <summary>
//        /// Gets the "value" of the 'subject' claim { sub, 'value' }.
//        /// </summary>
//        /// <remarks>If the 'subject' claim is not found, null is returned.</remarks>
//        public string Subject
//        {
//            get
//            {
//                if (Payload != null)
//                    return Payload.Sub;
//                return String.Empty;
//            }
//        }

//        /// <summary>
//        /// Gets the 'value' of the 'notbefore' claim { nbf, 'value' } converted to a <see cref="DateTime"/> assuming 'value' is seconds since UnixEpoch (UTC 1970-01-01T0:0:0Z).
//        /// </summary>
//        /// <remarks>If the 'notbefore' claim is not found, then <see cref="DateTime.MinValue"/> is returned.</remarks>
//        public override DateTime ValidFrom
//        {
//            get
//            {
//                if (Payload != null)
//                    return Payload.ValidFrom;
//                return DateTime.MinValue;
//            }
//        }

//        /// <summary>
//        /// Gets the 'value' of the 'expiration' claim { exp, 'value' } converted to a <see cref="DateTime"/> assuming 'value' is seconds since UnixEpoch (UTC 1970-01-01T0:0:0Z).
//        /// </summary>
//        /// <remarks>If the 'expiration' claim is not found, then <see cref="DateTime.MinValue"/> is returned.</remarks>
//        public override DateTime ValidTo
//        {
//            get
//            {
//                if (Payload != null)
//                    return Payload.ValidTo;
//                return DateTime.MinValue;
//            }
//        }

//        /// <summary>
//        /// Serializes the <see cref="JwtHeader"/> and <see cref="JwtPayload"/>
//        /// </summary>
//        /// <returns>A string containing the header and payload in JSON format.</returns>
//        public override string ToString()
//        {
//            if (Payload != null)
//                return Header.SerializeToJson() + "." + Payload.SerializeToJson();
//            else
//                return Header.SerializeToJson() + ".";
//        }

//        /// <summary>
//        /// Decodes the string into the header, payload and signature.
//        /// </summary>
//        /// <param name="tokenParts">the tokenized string.</param>
//        /// <param name="rawData">the original token.</param>
//        internal void Decode(string[] tokenParts, string rawData)
//        {
//            LogHelper.LogInformation(LogMessages.IDX12716, rawData);
//            try
//            {
//                Header = JwtHeader.Base64UrlDeserialize(tokenParts[0]);
//            }
//            catch (Exception ex)
//            {
//                throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12729, tokenParts[0], rawData), ex));
//            }

//            if (tokenParts.Length == JwtConstants.JweSegmentCount)
//                DecodeJwe(tokenParts);
//            else
//                DecodeJws(tokenParts);

//            RawData = rawData;
//        }

//        /// <summary>
//        /// Decodes the payload and signature from the JWS parts.
//        /// </summary>
//        /// <param name="tokenParts">Parts of the JWS including the header.</param>
//        /// <remarks>Assumes Header has already been set.</remarks>
//        private void DecodeJws(string[] tokenParts)
//        {
//            // Log if CTY is set, assume compact JWS
//            if (Header.Cty != null)
//                LogHelper.LogVerbose(LogHelper.FormatInvariant(LogMessages.IDX12738, Header.Cty));

//            try
//            {
//                Payload = JwtPayload.Base64UrlDeserialize(tokenParts[1]);
//            }
//            catch (Exception ex)
//            {
//                throw LogHelper.LogExceptionMessage(new ArgumentException(LogHelper.FormatInvariant(LogMessages.IDX12723, tokenParts[1], RawData), ex));
//            }

//            RawHeader = tokenParts[0];
//            RawPayload = tokenParts[1];
//            RawSignature = tokenParts[2];
//        }

//        /// <summary>
//        /// Decodes the payload and signature from the JWE parts.
//        /// </summary>
//        /// <param name="tokenParts">Parts of the JWE including the header.</param>
//        /// <remarks>Assumes Header has already been set.</remarks>
//        private void DecodeJwe(string[] tokenParts)
//        {
//            RawHeader = tokenParts[0];
//            RawEncryptedKey = tokenParts[1];
//            RawInitializationVector = tokenParts[2];
//            RawCiphertext = tokenParts[3];
//            RawAuthenticationTag = tokenParts[4];
//        }
//    }
//}
