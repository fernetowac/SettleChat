using Microsoft.EntityFrameworkCore.Migrations;

namespace SettleChat.Migrations.Migrations
{
    public partial class UniqueIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ConversationUsers_UserId",
                table: "ConversationUsers");

            migrationBuilder.AlterColumn<string>(
                name: "Token",
                table: "Invitations",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Invitations",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Invitations_Token",
                table: "Invitations",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConversationUsers_UserId_ConversationId",
                table: "ConversationUsers",
                columns: new[] { "UserId", "ConversationId" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Invitations_Token",
                table: "Invitations");

            migrationBuilder.DropIndex(
                name: "IX_ConversationUsers_UserId_ConversationId",
                table: "ConversationUsers");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Invitations");

            migrationBuilder.AlterColumn<string>(
                name: "Token",
                table: "Invitations",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string));

            migrationBuilder.CreateIndex(
                name: "IX_ConversationUsers_UserId",
                table: "ConversationUsers",
                column: "UserId");
        }
    }
}
