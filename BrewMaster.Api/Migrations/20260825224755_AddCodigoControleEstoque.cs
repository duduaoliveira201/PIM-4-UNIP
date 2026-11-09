using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Migrations
{
    /// <inheritdoc />
    public partial class AddCodigoControleEstoque : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CodigoControle",
                table: "Stocks",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("UPDATE Stocks SET CodigoControle = CASE WHEN Tipo = 'Malte' THEN 'MAL000' WHEN Tipo IN ('Lupulo', 'Lúpulo') THEN 'LPL000' WHEN Tipo = 'Levedura' THEN 'LVR000' ELSE 'INS000' END WHERE CodigoControle = ''");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CodigoControle",
                table: "Stocks");
        }
    }
}
