using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using SettleChat.Persistence;
using SettleChat.Persistence.Models;

namespace SettleChat.Areas.Identity.Pages.Account
{
    [AllowAnonymous]
    public class RegisterModel : PageModel
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly SettleChatDbContext _dbContext;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<RegisterModel> _logger;
        private readonly IEmailSender _emailSender;

        public RegisterModel(
            SettleChatDbContext dbContext,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            ILogger<RegisterModel> logger,
            IEmailSender emailSender)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _signInManager = signInManager;
            _logger = logger;
            _emailSender = emailSender;
        }

        [BindProperty]
        public InputModel Input { get; set; }

        public string ReturnUrl { get; set; }

        public IList<AuthenticationScheme> ExternalLogins { get; set; }

        public class InputModel
        {
            [Required]
            [EmailAddress]
            [Display(Name = "Email")]
            public string Email { get; set; }

            [Required]
            [StringLength(100, ErrorMessage = "The {0} must be at least {2} and at max {1} characters long.", MinimumLength = 6)]
            [DataType(DataType.Password)]
            [Display(Name = "Password")]
            public string Password { get; set; }

            [DataType(DataType.Password)]
            [Display(Name = "Confirm password")]
            [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
            public string ConfirmPassword { get; set; }
        }

        public async Task OnGetAsync(string returnUrl = null)
        {
            ReturnUrl = returnUrl;
            ExternalLogins = (await _signInManager.GetExternalAuthenticationSchemesAsync()).ToList();
            // prefill email if possible
            if (User.Identity.IsAuthenticated)
            {
                var authenticatedUser = await _userManager.GetUserAsync(User);
                if (await _userManager.HasPasswordAsync(authenticatedUser))
                {
                    //TODO: handle case when authenticated user has password already set -> display error message
                    throw new NotImplementedException();
                    //TODO: it should not return/display error in json
                }

                var email = User.Claims.SingleOrDefault(x => x.Type == "email")?.Value;
                var emailVerified = User.Claims.SingleOrDefault(x => x.Type == "email_verified")?.Value;
                if (!string.IsNullOrEmpty(email))
                {
                    Input = new InputModel
                    {
                        Email = email
                    };
                }
            }
        }

        public async Task<IActionResult> OnPostAsync(string returnUrl = null)
        {
            returnUrl = returnUrl ?? Url.Content("~/");
            ExternalLogins = (await _signInManager.GetExternalAuthenticationSchemesAsync()).ToList();
            if (ModelState.IsValid)
            {
                ApplicationUser user = null;
                if (User.Identity.IsAuthenticated)
                {
                    var authenticatedUser = await _userManager.GetUserAsync(User);
                    if (!await _userManager.HasPasswordAsync(authenticatedUser))
                    {
                        user = authenticatedUser;
                    }
                    else
                    {
                        //TODO: handle error when authenticated user already has password -> display error
                        throw new NotImplementedException();
                    }
                }

                IdentityResult result;
                //using (var transactionScope = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
                using (await _dbContext.Database.BeginTransactionAsync())
                {
                    //_dbContext.Database.CreateExecutionStrategy().ExecuteAsync()

                    if (user == null)
                    {
                        user = new ApplicationUser { UserName = Input.Email, Email = Input.Email };
                        result = await _userManager.CreateAsync(user, Input.Password);
                        if (result.Succeeded)
                        {
                            _logger.LogInformation("User created a new account with password.");
                        }
                    }
                    else
                    {
                        await _userManager.SetUserNameAsync(user, Input.Email);
                        if (user.Email != Input.Email)
                        {
                            await _userManager.SetEmailAsync(user, Input.Email);
                            _logger.LogInformation("Updating email.");
                        }

                        result = await _userManager.AddPasswordAsync(user,
                            Input.Password); //TODO: do it atomically in transaction
                        if (result.Succeeded)
                        {
                            _logger.LogInformation("Password assigned to existing account.");
                        }
                    }

                    _dbContext.Database.CommitTransaction();//.SaveChangesAsync();
                    //transactionScope.Complete();
                }

                if (result.Succeeded)
                {
                    if (!user.EmailConfirmed)
                    {
                        var code = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                        code = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(code));
                        var callbackUrl = Url.Page(
                            "/Account/ConfirmEmail",
                            pageHandler: null,
                            values: new { area = "Identity", userId = user.Id, code = code, returnUrl = returnUrl },
                            protocol: Request.Scheme);

                        await _emailSender.SendEmailAsync(Input.Email, "Confirm your email",
                            $"Please confirm your account by <a href='{HtmlEncoder.Default.Encode(callbackUrl)}'>clicking here</a>.");
                    }

                    if (_userManager.Options.SignIn.RequireConfirmedAccount)
                    {
                        return RedirectToPage("RegisterConfirmation",
                            new { email = Input.Email, returnUrl = returnUrl });
                    }
                    else
                    {
                        if (User.IsAuthenticated())
                        {
                            await _signInManager.RefreshSignInAsync(user);
                        }
                        else
                        {
                            await _signInManager.SignInAsync(user, isPersistent: false);
                        }

                        return LocalRedirect(returnUrl);
                    }
                }

                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(string.Empty, error.Description);
                }
            }

            // If we got this far, something failed, redisplay form
            return Page();
        }
    }
}
