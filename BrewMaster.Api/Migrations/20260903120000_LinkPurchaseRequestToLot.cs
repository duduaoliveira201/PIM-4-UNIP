using BrewMaster.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260903120000_LinkPurchaseRequestToLot")]
    public partial class LinkPurchaseRequestToLot : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LoteId",
                table: "SolicitacoesCompra",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LoteId",
                table: "SolicitacoesCompra");
        }
    }
}
