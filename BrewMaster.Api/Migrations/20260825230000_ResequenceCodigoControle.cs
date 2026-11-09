using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Migrations
{
    public partial class ResequenceCodigoControle : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                WITH OrderedStocks AS
                (
                    SELECT Id, Tipo,
                           ROW_NUMBER() OVER (PARTITION BY Tipo ORDER BY Id) - 1 AS SequenceNumber
                    FROM Stocks
                )
                UPDATE Stocks
                SET CodigoControle = CASE
                    WHEN OrderedStocks.Tipo = 'Malte' THEN 'MAL'
                    WHEN OrderedStocks.Tipo IN ('Lupulo', 'Lúpulo') THEN 'LPL'
                    WHEN OrderedStocks.Tipo = 'Levedura' THEN 'LVR'
                    ELSE 'INS'
                END + RIGHT('000' + CAST(OrderedStocks.SequenceNumber AS varchar(3)), 3)
                FROM Stocks
                INNER JOIN OrderedStocks ON OrderedStocks.Id = Stocks.Id;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
