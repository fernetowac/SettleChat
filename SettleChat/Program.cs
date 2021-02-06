using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SettleChat
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureLogging(loggingBuilder =>
                {
                    loggingBuilder.ClearProviders();
                    loggingBuilder.AddConsole(options => options.IncludeScopes = true);
                })
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
                });
    }
}
