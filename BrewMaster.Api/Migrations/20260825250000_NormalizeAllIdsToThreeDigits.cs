using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Migrations
{
    public partial class NormalizeAllIdsToThreeDigits : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF (SELECT COUNT(*) FROM Users) > 999 OR
                   (SELECT COUNT(*) FROM Stocks) > 999 OR
                   (SELECT COUNT(*) FROM Receitas) > 999 OR
                   (SELECT COUNT(*) FROM Lotes) > 999 OR
                   (SELECT COUNT(*) FROM Logs) > 999
                    THROW 50001, 'Cada tabela pode ter no máximo 999 registros.', 1;

                DECLARE @Users TABLE (OldId nvarchar(450), TemporaryId nvarchar(450), NewId nvarchar(3));
                DECLARE @Stocks TABLE (OldId nvarchar(450), TemporaryId nvarchar(450), NewId nvarchar(3));
                DECLARE @Receitas TABLE (OldId nvarchar(450), TemporaryId nvarchar(450), NewId nvarchar(3));
                DECLARE @Lotes TABLE (OldId nvarchar(450), TemporaryId nvarchar(450), NewId nvarchar(3));

                INSERT INTO @Users SELECT Id, CONCAT('__user_', ROW_NUMBER() OVER (ORDER BY Id)), RIGHT('000' + CAST(ROW_NUMBER() OVER (ORDER BY Id) AS varchar(3)), 3) FROM Users;
                INSERT INTO @Stocks SELECT Id, CONCAT('__stock_', ROW_NUMBER() OVER (ORDER BY Id)), RIGHT('000' + CAST(ROW_NUMBER() OVER (ORDER BY Id) AS varchar(3)), 3) FROM Stocks;
                INSERT INTO @Receitas SELECT Id, CONCAT('__recipe_', ROW_NUMBER() OVER (ORDER BY Id)), RIGHT('000' + CAST(ROW_NUMBER() OVER (ORDER BY Id) AS varchar(3)), 3) FROM Receitas;
                INSERT INTO @Lotes SELECT Id, CONCAT('__lot_', ROW_NUMBER() OVER (ORDER BY Id)), RIGHT('000' + CAST(ROW_NUMBER() OVER (ORDER BY Id) AS varchar(3)), 3) FROM Lotes;

                UPDATE r SET MalteStockId = m.TemporaryId FROM Receitas r INNER JOIN @Stocks m ON r.MalteStockId = m.OldId;
                UPDATE r SET LupuloStockId = m.TemporaryId FROM Receitas r INNER JOIN @Stocks m ON r.LupuloStockId = m.OldId;
                UPDATE r SET LeveduraStockId = m.TemporaryId FROM Receitas r INNER JOIN @Stocks m ON r.LeveduraStockId = m.OldId;
                UPDATE l SET ReceitaId = r.TemporaryId FROM Lotes l INNER JOIN @Receitas r ON l.ReceitaId = r.OldId;

                UPDATE u SET Id = m.TemporaryId FROM Users u INNER JOIN @Users m ON u.Id = m.OldId;
                UPDATE s SET Id = m.TemporaryId FROM Stocks s INNER JOIN @Stocks m ON s.Id = m.OldId;
                UPDATE r SET Id = m.TemporaryId FROM Receitas r INNER JOIN @Receitas m ON r.Id = m.OldId;
                UPDATE l SET Id = m.TemporaryId FROM Lotes l INNER JOIN @Lotes m ON l.Id = m.OldId;
                ;WITH NumberedLogs AS
                (
                    SELECT Id, CONCAT('__log_', ROW_NUMBER() OVER (ORDER BY Id)) AS TemporaryId
                    FROM Logs
                )
                UPDATE logs SET Id = numbered.TemporaryId FROM Logs logs INNER JOIN NumberedLogs numbered ON logs.Id = numbered.Id;

                UPDATE r SET MalteStockId = m.NewId FROM Receitas r INNER JOIN @Stocks m ON r.MalteStockId = m.TemporaryId;
                UPDATE r SET LupuloStockId = m.NewId FROM Receitas r INNER JOIN @Stocks m ON r.LupuloStockId = m.TemporaryId;
                UPDATE r SET LeveduraStockId = m.NewId FROM Receitas r INNER JOIN @Stocks m ON r.LeveduraStockId = m.TemporaryId;
                UPDATE l SET ReceitaId = r.NewId FROM Lotes l INNER JOIN @Receitas r ON l.ReceitaId = r.TemporaryId;

                UPDATE u SET Id = m.NewId FROM Users u INNER JOIN @Users m ON u.Id = m.TemporaryId;
                UPDATE s SET Id = m.NewId FROM Stocks s INNER JOIN @Stocks m ON s.Id = m.TemporaryId;
                UPDATE r SET Id = m.NewId FROM Receitas r INNER JOIN @Receitas m ON r.Id = m.TemporaryId;
                UPDATE l SET Id = m.NewId FROM Lotes l INNER JOIN @Lotes m ON l.Id = m.TemporaryId;
                ;WITH NumberedLogs AS
                (
                    SELECT Id, RIGHT('000' + CAST(ROW_NUMBER() OVER (ORDER BY Id) AS varchar(3)), 3) AS NewId
                    FROM Logs
                )
                UPDATE logs SET Id = numbered.NewId FROM Logs logs INNER JOIN NumberedLogs numbered ON logs.Id = numbered.Id;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("A renumeração dos IDs não pode ser desfeita automaticamente.");
        }
    }
}
