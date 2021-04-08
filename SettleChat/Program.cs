using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.CommandLineUtils;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Core;
using Serilog.Events;
using SettleChat.Persistence;

namespace SettleChat
{
    public class Program
    {
        private enum ExitCodes
        {
            Success = 0,
            Fatal = 1,
            WrongArgs = 2,
            MigrationNeeded = 3
        }

        public static int Main(string[] args)
        {
            var commandLineApplication = CreateCommandLineApplication(args);
            return commandLineApplication.Execute(args);
        }

        private static CommandLineApplication CreateCommandLineApplication(string[] args)
        {
            var commandLineApplication = new CommandLineApplication(false);
            var migrateCommandOption = commandLineApplication.Option(
                "--ef-migrate",
                "Apply entity framework migrations and exit",
                CommandOptionType.NoValue);
            var migrateCheckCommandOption = commandLineApplication.Option(
                "--ef-migrate-check",
                "Check the status of entity framework migrations",
                CommandOptionType.NoValue);
            commandLineApplication.HelpOption("-? | -h | --help");
            commandLineApplication.OnExecute(() => ExecuteCommand(args, migrateCheckCommandOption, migrateCommandOption));
            return commandLineApplication;
        }

        private static int ExecuteCommand(string[] args, CommandOption migrateCheckCommandOption, CommandOption migrateCommandOption)
        {
            using var logger = CreateLogger();
            try
            {
                var host = CreateHost(args, logger);
                if (migrateCheckCommandOption.HasValue() || migrateCommandOption.HasValue())
                {
                    if (migrateCheckCommandOption.HasValue() && migrateCommandOption.HasValue())
                    {
                        logger.Error("ef-migrate and ef-migrate-check are mutually exclusive, select one, and try again");
                        return (int)ExitCodes.WrongArgs;
                    }

                    using var serviceScope = host.Services.GetRequiredService<IServiceScopeFactory>().CreateScope();
                    using var dbContext = serviceScope.ServiceProvider.GetService<SettleChatDbContext>();
                    if (migrateCheckCommandOption.HasValue())
                    {
                        return IsMigrationNeeded(dbContext, logger) ? (int)ExitCodes.MigrationNeeded : (int)ExitCodes.Success;
                    }

                    if (migrateCommandOption.HasValue())
                    {
                        MigrateDB(dbContext, logger);
                        return (int)ExitCodes.Success;
                    }
                }

                // no flags provided, so just run the webhost
                logger.Information("Starting web host");
                host.Run();
                return (int)ExitCodes.Success;
            }
            catch (Exception ex)
            {
                logger.Fatal(ex, "Host terminated unexpectedly");
                return (int)ExitCodes.Fatal;
            }
        }

        private static Logger CreateLogger()
        {
            return new LoggerConfiguration()
                .MinimumLevel.Debug()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
                .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
                .Enrich.FromLogContext()
                .WriteTo.Console()
                .WriteTo.File("Logs/log.txt", rollingInterval: RollingInterval.Day, rollOnFileSizeLimit: true, fileSizeLimitBytes: 10485760)
                .WriteTo.Seq("http://127.0.0.1:5341/")//TODO: configurable SEQ url
                .CreateLogger();
        }

        private static void MigrateDB(SettleChatDbContext dbContext, ILogger logger)
        {
            logger.Information("Applying Entity Framework migrations");
            dbContext.Database.Migrate();
            logger.Information("All done, closing app");
        }

        private static bool IsMigrationNeeded(SettleChatDbContext dbContext, ILogger logger)
        {
            logger.Information("Validating status of Entity Framework migrations");

            var pendingMigrations = dbContext.Database.GetPendingMigrations();
            var migrations = pendingMigrations as IList<string> ?? pendingMigrations.ToList();
            if (!migrations.Any())
            {
                logger.Information("No pending migrations");
                return false;
            }

            logger.Information("Pending migrations {0}", migrations.Count);
            foreach (var migration in migrations)
            {
                logger.Information($"\t{migration}");
            }

            return true;
        }

        private static IHost CreateHost(string[] args, ILogger logger) =>
            Host.CreateDefaultBuilder(args)
                .UseSerilog(logger)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder
                        .ConfigureAppConfiguration((webHostBuilderContext, configurationBuilder) =>
                        {
                            configurationBuilder.AddJsonFile($"appsettings.json");
                            configurationBuilder.AddJsonFile($"C:\\SettleChatSecrets\\appsettings.json", true);
                            configurationBuilder.AddJsonFile($"appsettings.{webHostBuilderContext.HostingEnvironment.EnvironmentName}.json", true);
                            configurationBuilder.AddJsonFile($"C:\\SettleChatSecrets\\appsettings.{webHostBuilderContext.HostingEnvironment.EnvironmentName}.json", true);
                        })
                        .UseStartup<Startup>();
                })
                .Build();
    }
}
