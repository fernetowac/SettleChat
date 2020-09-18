using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SettleChat.Models;

namespace SettleChat.Hubs
{
    public class ConversationHub : Hub<IConversationClient>
    {
        //private readonly ISessionSignalRConnection _sessionSignalRConnection;

        //public ConversationHub(ISessionSignalRConnection sessionSignalRConnection)
        //{
        //    _sessionSignalRConnection = sessionSignalRConnection;
        //}
        //#region Overrides of Hub

        //public override Task OnConnectedAsync()
        //{
        //    _sessionSignalRConnection.ConnectionId = Context.ConnectionId;
        //    return base.OnConnectedAsync();
        //}

        //public override Task OnDisconnectedAsync(Exception exception)
        //{
        //    _sessionSignalRConnection.ConnectionId = null;
        //    return base.OnDisconnectedAsync(exception);
        //}

        //#endregion

        //public Task JoinGroup(string groupName)
        //{
        //    return Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        //}

        //public Task LeaveGroup(string groupName)
        //{
        //    return Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        //}



        //public async Task NewMessage(Guid conversationId, MessageModel message)
        //{
        //    await Clients.Group(conversationId.ToString()).NewMessage(message);
        //}
    }

    public interface IConversationClient
    {
        public Task NewMessage(MessageModel message);
    }

    public interface ISessionSignalRConnection
    {
        string? ConnectionId { get; set; }
    }

    public class SessionSignalRConnection : ISessionSignalRConnection
    {
        public string? ConnectionId { get; set; }
    }
}
