using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SettleChat.Factories.Interfaces;
using SettleChat.Models;
using SettleChat.Persistence;
using SettleChat.Persistence.Enums;

namespace SettleChat.Hubs
{
    public class ConversationHub : Hub<IConversationClient>
    {
        private readonly SettleChatDbContext _dbContext;
        private readonly ISignalRGroupNameFactory _signalRGroupNameFactory;
        private readonly ILogger<ConversationHub> _logger;

        public ConversationHub(SettleChatDbContext dbContext, ISignalRGroupNameFactory signalRGroupNameFactory, ILogger<ConversationHub> logger)
        {
            _dbContext = dbContext;
            _signalRGroupNameFactory = signalRGroupNameFactory;
            _logger = logger;
        }

        public static readonly ConnectionMapping<Guid> Connections = new ConnectionMapping<Guid>();

        public override async Task OnConnectedAsync()
        {
            if (Context.UserIdentifier == null)
            {
                return;
            }

            Guid userId = Guid.Parse(Context.UserIdentifier);
            if (!Connections.GetConnections(userId).Any())
            {
                Connections.Add(userId, Context.ConnectionId);
                _logger.LogInformation($"{Context.UserIdentifier} connected.");
                var conversationIds = await _dbContext.ConversationUsers.Where(x => x.UserId == userId).Select(x => x.ConversationId).ToListAsync();
                var conversationGroupNames = conversationIds.Select(_signalRGroupNameFactory.CreateConversationGroupName).ToList();
                //await Clients.Caller.UserStatusChanged(userId, UserStatus.Online);
                await Clients.Groups(conversationGroupNames).UserStatusChanged(userId, UserStatus.Online);
            }
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            if (Context.UserIdentifier == null)
            {
                return;
            }

            var userId = Guid.Parse(Context.UserIdentifier);
            Connections.Remove(userId, Context.ConnectionId);
            if (!Connections.GetConnections(userId).Any())
            {
                _logger.LogInformation($"{userId} disconnected.");
                var conversationIds = await _dbContext.ConversationUsers.Where(x => x.UserId == userId).Select(x => x.ConversationId).ToListAsync();
                var conversationGroupNames = conversationIds.Select(_signalRGroupNameFactory.CreateConversationGroupName).ToList();
                await Clients.Groups(conversationGroupNames).UserStatusChanged(userId, UserStatus.Offline);
            }
        }
    }

    public interface IConversationClient
    {
        [HubMethodName("NewMessage")]
        public Task NewMessage(MessageModel message);

        [HubMethodName("ConversationWritingActivity")]
        public Task ConversationWritingActivity(ConversationWritingActivityOutputModel writingActivity);

        [HubMethodName("UserStatusChanged")]
        public Task UserStatusChanged(Guid userId, UserStatus online);

        [HubMethodName("ConversationUpdated")]
        public Task ConversationUpdated(ConversationModel updatedConversation);

        [HubMethodName("ConversationUserAdded")]
        public Task ConversationUserAdded(ConversationUserModel conversationUser);
    }

    public interface ISessionSignalRConnection
    {
        string? ConnectionId { get; set; }
    }

    public class SessionSignalRConnection : ISessionSignalRConnection
    {
        public string? ConnectionId { get; set; }
    }

    public class ConnectionMapping<T>
    {
        private readonly Dictionary<T, HashSet<string>> _connections =
            new Dictionary<T, HashSet<string>>();

        public int Count
        {
            get
            {
                return _connections.Count;
            }
        }

        public void Add(T key, string connectionId)
        {
            lock (_connections)
            {
                HashSet<string> connections;
                if (!_connections.TryGetValue(key, out connections))
                {
                    connections = new HashSet<string>();
                    _connections.Add(key, connections);
                }

                lock (connections)
                {
                    connections.Add(connectionId);
                }
            }
        }

        public IEnumerable<string> GetConnections(T key)
        {
            HashSet<string> connections;
            if (_connections.TryGetValue(key, out connections))
            {
                return connections;
            }

            return Enumerable.Empty<string>();
        }

        public void Remove(T key, string connectionId)
        {
            lock (_connections)
            {
                HashSet<string> connections;
                if (!_connections.TryGetValue(key, out connections))
                {
                    return;
                }

                lock (connections)
                {
                    connections.Remove(connectionId);

                    if (connections.Count == 0)
                    {
                        _connections.Remove(key);
                    }
                }
            }
        }
    }
}
