using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Migrations
{
    public partial class UsarIdComoCodigoControle : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DECLARE @StockIds TABLE (OldId nvarchar(450), NewId nvarchar(450));
                INSERT INTO @StockIds (OldId, NewId)
                SELECT Id,
                    CASE
                        WHEN Tipo = 'Malte' THEN 'MAL'
                        WHEN Tipo IN ('Lupulo', 'Lúpulo') THEN 'LPL'
                        WHEN Tipo = 'Levedura' THEN 'LVR'
                        ELSE 'INS'
                    END + RIGHT('000' + CAST(ROW_NUMBER() OVER (PARTITION BY Tipo ORDER BY Id) - 1 AS varchar(3)), 3)
                FROM Stocks;

                UPDATE r SET MalteStockId = m.NewId
                FROM Receitas r INNER JOIN @StockIds m ON r.MalteStockId = m.OldId;
                UPDATE r SET LupuloStockId = m.NewId
                FROM Receitas r INNER JOIN @StockIds m ON r.LupuloStockId = m.OldId;
                UPDATE r SET LeveduraStockId = m.NewId
                FROM Receitas r INNER JOIN @StockIds m ON r.LeveduraStockId = m.OldId;

                UPDATE s SET Id = m.NewId
                FROM Stocks s INNER JOIN @StockIds m ON s.Id = m.OldId;");

            migrationBuilder.DropColumn(name: "CodigoControle", table: "Stocks");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(name: "CodigoControle", table: "Stocks", type: "nvarchar(max)", nullable: false, defaultValue: "");
        }
    }
}
