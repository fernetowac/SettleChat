using Microsoft.EntityFrameworkCore.Migrations;

namespace SettleChat.Migrations.Migrations
{
    public partial class addedConversationUsersUserNickName : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserNickName",
                table: "ConversationUsers",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserNickName",
                table: "ConversationUsers");
        }
    }
}
