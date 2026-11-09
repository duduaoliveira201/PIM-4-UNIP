using BrewMaster.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260918090000_AddVendasAndLotSaleState")]
public partial class AddVendasAndLotSaleState : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsVendido",
            table: "Lotes",
            type: "bit",
            nullable: false,
            defaultValue: false);

        migrationBuilder.CreateTable(
            name: "Vendas",
            columns: table => new
            {
                Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                LoteId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                Nome = table.Column<string>(type: "nvarchar(max)", nullable: false),
                ReceitaNome = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Volume = table.Column<double>(type: "float", nullable: false),
                ValorUnitario = table.Column<double>(type: "float", nullable: false),
                Aliquota = table.Column<double>(type: "float", nullable: false),
                Imposto = table.Column<double>(type: "float", nullable: false),
                Frete = table.Column<double>(type: "float", nullable: false),
                Total = table.Column<double>(type: "float", nullable: false),
                Cep = table.Column<string>(type: "nvarchar(max)", nullable: false),
                Localidade = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: ""),
                DistanciaKm = table.Column<double>(type: "float", nullable: false, defaultValue: 0d),
                EmpresaFrete = table.Column<string>(type: "nvarchar(max)", nullable: false),
                DataCriacao = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Vendas", x => x.Id));

        migrationBuilder.CreateIndex(
            name: "IX_Vendas_LoteId",
            table: "Vendas",
            column: "LoteId",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Vendas");
        migrationBuilder.DropColumn(name: "IsVendido", table: "Lotes");
    }
}