using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Api.Migrations
{
    /// <inheritdoc />
    public partial class PersistRecipeIngredients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Abv",
                table: "Receitas",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "Estilo",
                table: "Receitas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "Ibu",
                table: "Receitas",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "InsumosJson",
                table: "Receitas",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "InsumosJson",
                table: "Lotes",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Abv",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "Estilo",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "Ibu",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "InsumosJson",
                table: "Receitas");

            migrationBuilder.DropColumn(
                name: "InsumosJson",
                table: "Lotes");
        }
    }
}
