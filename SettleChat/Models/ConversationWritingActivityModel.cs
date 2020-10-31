using System;
using System.Collections.Generic;

namespace SettleChat.Models
{
    public class ConversationWritingActivityModel
    {
        public WritingActivity Activity { get; set; }
        public DateTime LastChange { get; set; }
    }

    public class ConversationWritingActivityOutputModel
    {
        public Guid ConversationId { get; set; }
        public Guid UserId { get; set; }
        public WritingActivity Activity { get; set; }
        public DateTime LastChange { get; set; }
    }

    public enum WritingActivity
    {
        IsWriting = 1,
        StoppedWriting = 2
    }
}