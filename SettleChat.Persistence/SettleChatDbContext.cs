using System;
using System.Threading.Tasks;
using IdentityServer4.EntityFramework.Entities;
using IdentityServer4.EntityFramework.Extensions;
using IdentityServer4.EntityFramework.Options;
using IdentityServer4.EntityFramework.Interfaces;
using Microsoft.AspNetCore.ApiAuthorization.IdentityServer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SettleChat.Persistence.Models;

namespace SettleChat.Persistence
{
    //public class SettleChatDbContext : ApiAuthorizationDbContext<ApplicationUser>
    public class SettleChatDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>, IPersistedGrantDbContext
    {
        private readonly IOptions<OperationalStoreOptions> _operationalStoreOptions;
        public DbSet<Message> Messages { get; set; }
        public DbSet<Conversation> Conversations { get; set; }
        public DbSet<ConversationUser> ConversationUsers { get; set; }
        public DbSet<UserSecret> UserSecrets { get; set; }

        public SettleChatDbContext(
            DbContextOptions options,
            IOptions<OperationalStoreOptions> operationalStoreOptions) : base(options)
        {
            _operationalStoreOptions = operationalStoreOptions;
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        { }

        /// <inheritdoc />
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ConfigurePersistedGrantContext(_operationalStoreOptions.Value);

            modelBuilder.Entity<ConversationUser>()
                .HasOne(x => x.User)
                .WithMany(x => x.ConversationUsers)
                .HasForeignKey(x => x.UserId)
                .IsRequired()
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<ConversationUser>()
                .HasOne(x => x.Conversation)
                .WithMany(x => x.ConversationUsers)
                .IsRequired()
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<ConversationUser>()
                .HasOne(x => x.LastReadMessage)
                .WithMany()
                .IsRequired(false)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Message>()
                .HasOne(x => x.Conversation)
                .WithMany(x => x.Messages)
                .IsRequired()
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Message>()
                .HasOne(x => x.Author)
                .WithMany()
                .IsRequired()
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<UserSecret>()
                .HasOne(x => x.User)
                .WithOne()
                .IsRequired()
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<UserSecret>()
                .Property(x => x.Secret)
                .HasConversion(
                    x => x.ToUpperInvariant(),
                    x => x);
        }
        /// <summary>
        /// Gets or sets the <see cref="DbSet{PersistedGrant}"/>.
        /// </summary>
        public DbSet<PersistedGrant> PersistedGrants { get; set; }

        /// <summary>
        /// Gets or sets the <see cref="DbSet{DeviceFlowCodes}"/>.
        /// </summary>
        public DbSet<DeviceFlowCodes> DeviceFlowCodes { get; set; }

        Task<int> IPersistedGrantDbContext.SaveChangesAsync() => base.SaveChangesAsync();
    }
}