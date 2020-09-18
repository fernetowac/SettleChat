using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace SettleChat.Migrations.Migrations
{
    public partial class AddedPKForUserSecret : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "UserSecrets",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Id",
                table: "UserSecrets");
        }
    }
}
