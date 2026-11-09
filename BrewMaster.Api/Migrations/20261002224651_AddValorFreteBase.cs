using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddValorFreteBase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "ValorFreteBase",
                table: "ConfiguracoesSistema",
                type: "float",
                nullable: false,
                defaultValue: 18.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ValorFreteBase",
                table: "ConfiguracoesSistema");
        }
    }
}
