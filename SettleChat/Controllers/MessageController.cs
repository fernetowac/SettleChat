using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;

namespace SettleChat.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class MessageController : ControllerBase
    {
        private readonly ILogger<MessageController> _logger;

        public MessageController(ILogger<MessageController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        public IEnumerable<Message> Get()
        {
            yield return new Message
            {
                Id = 1,
                Text = "Hi there",
                UserFrom = "Fero"
            };

            yield return new Message
            {
                Id = 2,
                Text = "Hi",
                UserFrom = "Imro"
            };
        }
    }
}
