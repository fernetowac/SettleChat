using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace SettleChat.Migrations.Migrations
{
    public partial class Initial : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Name",
                table: "Conversations");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Users",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Conversations",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "UserSecrets",
                columns: table => new
                {
                    UserId = table.Column<Guid>(nullable: false),
                    Secret = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.ForeignKey(
                        name: "FK_UserSecrets_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserSecrets_UserId",
                table: "UserSecrets",
                column: "UserId",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserSecrets");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "Conversations");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Conversations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
