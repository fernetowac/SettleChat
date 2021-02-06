using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Threading.Tasks;
using IdentityServer4.Extensions;
using IdentityServer4.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SpaServices.ReactDevelopmentServer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Logging;
using SettleChat.Factories;
using SettleChat.Factories.Interfaces;
using SettleChat.Hubs;
using SettleChat.Persistence;
using SettleChat.Persistence.Models;
using Hellang.Middleware.ProblemDetails;

namespace SettleChat
{
    public class Startup
    {
        private readonly IWebHostEnvironment _env;

        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            _env = env;
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddDbContext<SettleChatDbContext>(optionsBuilder =>
            {
                optionsBuilder.UseSqlServer(
                    Configuration.GetConnectionString("DefaultConnection"),
                    builder =>
                    {
                        // Note: If connection resiliency is enabled by allowing retries on failure, for each transaction must be called creation of new execution strategy
                        // to be able to retry transaction as a whole. More: https://github.com/dotnet/efcore/issues/7318
                        //builder.EnableRetryOnFailure(3); 
                        builder.MigrationsAssembly("SettleChat.Migrations");
                    });
            });

            services.AddIdentity<ApplicationUser, IdentityRole<Guid>>()
                //services.AddIdentityCore<ApplicationUser>()
                .AddEntityFrameworkStores<SettleChatDbContext>()
                .AddDefaultTokenProviders();
            //.AddDefaultTokenProviders().AddClaimsPrincipalFactory<UserClaimsPrincipalFactory<ApplicationUser>>();
            //services.AddDefaultIdentity<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
            //    .AddEntityFrameworkStores<SettleChatDbContext>();

            services.ConfigureApplicationCookie(cookieAuthOptions =>
            {
                cookieAuthOptions.LoginPath = "/Identity/Account/Login";
                cookieAuthOptions.Events.OnRedirectToAccessDenied = ReplaceRedirector(HttpStatusCode.Forbidden, cookieAuthOptions.Events.OnRedirectToAccessDenied);
                cookieAuthOptions.Events.OnRedirectToLogin = ReplaceRedirector(HttpStatusCode.Unauthorized, cookieAuthOptions.Events.OnRedirectToLogin);
            });

            services.AddIdentityServer(setupAction =>
                {
                    setupAction.UserInteraction.LoginUrl = "/Identity/Account/Login";
                })
                .AddApiAuthorization<ApplicationUser, SettleChatDbContext>(apiAuthOptions =>
                {
                    apiAuthOptions.Clients.AddIdentityServerSPA("SettleChat",
                        clientBuilder =>
                        {
                            clientBuilder
                                .WithRedirectUri("/authentication/login-callback")
                                .WithRedirectUri("/silentLoginCallback.html")
                                .WithLogoutRedirectUri("/authentication/logout-callback");
                        });
                    if (_env.IsDevelopment())
                    {
                        apiAuthOptions.Clients.Add(new Client
                        {
                            Enabled = true,
                            AllowAccessTokensViaBrowser = true,
                            ClientId = "PostMan",
                            ClientName = "PostMan",
                            RequireClientSecret = false,
                            RedirectUris = { "https://oauth.pstmn.io/v1/callback" },
                            PostLogoutRedirectUris = { "https://notused" },

                            AllowedGrantTypes = GrantTypes.Code,
                            AllowedScopes = { "openid", "SettleChatAPI", "profile", "email", "api" },
                            RequireConsent = false,
                            ClientSecrets = new List<Secret>
                            {
                                new Secret("bigsecret") //TODO:
                            },

                            AllowOfflineAccess = true,
                            RefreshTokenUsage = TokenUsage.ReUse,


                        });
                    }
                });

            services.AddAuthentication()
                .AddIdentityServerJwt()
                .AddJwtBearer(jwtBearerOptions =>
                {
                    jwtBearerOptions.Authority = Configuration["OidcAuthority"]; // "https://localhost:44328";
                    jwtBearerOptions.Audience = "SettleChatAPI";
                });
            services.AddMvc();

            // In production, the React files will be served from this directory
            services.AddSpaStaticFiles(configuration =>
            {
                configuration.RootPath = "ClientApp/build";
            });

            services.AddAuthentication()
                .AddGoogle(options =>
                {
                    var googleOAuthConfigSection = Configuration.GetSection("GoogleOAuth").Get<GoogleOAuthConfigSection>();
                    options.ClientId = googleOAuthConfigSection.ClientId;
                    options.ClientSecret = googleOAuthConfigSection.ClientSecret;
                });

            services.AddScoped<IEmailSender, EmailSender>();
            services.AddSingleton<IUserIdProvider, SignalRUserIdProvider>();
            services.AddSignalR();
            IdentityModelEventSource.ShowPII = _env.IsDevelopment();
            services.AddProblemDetails(options =>
                    options.OnBeforeWriteDetails = (httpContext, problem) =>
                    {
                        problem.Extensions["traceId"] = Activity.Current?.Id ?? httpContext.TraceIdentifier;
                    }
                );
            services.AddSingleton<ISignalRGroupNameFactory, SignalRGroupNameFactory>();
            services.AddSingleton<Microsoft.Extensions.Internal.ISystemClock, Microsoft.Extensions.Internal.SystemClock>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, ILoggerFactory loggerFactory)
        {
            app.UseProblemDetails();
            if (env.IsDevelopment())
            {
                //app.UseDeveloperExceptionPage();
                //app.UseDatabaseErrorPage();
                app.UseExceptionHandler("/error-local-development");
                loggerFactory.AddFile("Logs/my-log-{Date}.txt");
            }
            else
            {
                app.UseExceptionHandler("/error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseSpaStaticFiles();

            app.UseRouting();

            // Note: Removed Microsoft's strange mapping that removed "sub" claim type and mapped userId into "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" claim type: https://github.com/IdentityServer/IdentityServer4/issues/2968
            JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

            app.UseAuthentication();
            app.UseIdentityServer();
            app.UseAuthorization();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller}/{action=Index}/{id?}");
                endpoints.MapRazorPages();
                endpoints.MapHub<ConversationHub>("/conversationHub");
            });

            app.UseSpa(spa =>
            {
                spa.Options.SourcePath = "ClientApp";

                if (env.IsDevelopment())
                {
                    spa.UseReactDevelopmentServer(npmScript: "start");
                }
            });
        }

        private static Func<RedirectContext<CookieAuthenticationOptions>, Task> ReplaceRedirector(
            HttpStatusCode statusCode, Func<RedirectContext<CookieAuthenticationOptions>, Task> existingRedirector) =>
            context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = (int)statusCode;
                    return Task.CompletedTask;
                }

                return existingRedirector(context);
            };
    }


    public class EmailSender : IEmailSender
    {
        private readonly ILogger<EmailSender> _logger;

        public EmailSender(ILogger<EmailSender> logger)
        {
            _logger = logger;
        }
        public Task SendEmailAsync(string email, string subject, string htmlMessage)
        {
            _logger.LogDebug($"Simulate sending email. {nameof(email)}:'{email}', {nameof(subject)}:'{subject}', {nameof(htmlMessage)}:'{htmlMessage}'");
            return Task.CompletedTask;
        }
    }

    public class SignalRUserIdProvider : IUserIdProvider
    {
        public string GetUserId(HubConnectionContext connection)
        {
            if (!connection.User.IsAuthenticated())
            {
                return null;
            }

            return connection.User.Identity.GetSubjectId();
        }
    }
}
