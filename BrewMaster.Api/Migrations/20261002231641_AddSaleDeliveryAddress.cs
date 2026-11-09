using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSaleDeliveryAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ComplementoEndereco",
                table: "Vendas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NumeroEndereco",
                table: "Vendas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ComplementoEndereco",
                table: "Vendas");

            migrationBuilder.DropColumn(
                name: "NumeroEndereco",
                table: "Vendas");
        }
    }
}
