using Microsoft.EntityFrameworkCore.Migrations;

namespace SettleChat.Migrations.Migrations
{
    public partial class AddedPKToUserSecret : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddPrimaryKey(
                name: "PK_UserSecrets",
                table: "UserSecrets",
                column: "Id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserSecrets",
                table: "UserSecrets");
        }
    }
}
