using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyRecipeIngredientColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LeveduraGr",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "LeveduraNome",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "LeveduraStockId",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "LupuloGr",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "LupuloNome",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "LupuloStockId",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "MalteKg",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "MalteNome",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "MalteStockId",
                table: "Receitas");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "LeveduraGr",
                table: "Receitas",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "LeveduraNome",
                table: "Receitas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LeveduraStockId",
                table: "Receitas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "LupuloGr",
                table: "Receitas",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "LupuloNome",
                table: "Receitas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LupuloStockId",
                table: "Receitas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "MalteKg",
                table: "Receitas",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "MalteNome",
                table: "Receitas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MalteStockId",
                table: "Receitas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
