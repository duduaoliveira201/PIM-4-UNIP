using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BrewMaster.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSolicitacoesCompra : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SolicitacoesCompra",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Numero = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Solicitante = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DataCriacao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DataResposta = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Observacao = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitacoesCompra", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SolicitacaoCompraItens",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SolicitacaoCompraId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    InsumoId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Nome = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantidade = table.Column<double>(type: "float", nullable: false),
                    Unidade = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ValorUnitario = table.Column<double>(type: "float", nullable: false),
                    ValorTotal = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitacaoCompraItens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SolicitacaoCompraItens_SolicitacoesCompra_SolicitacaoCompraId",
                        column: x => x.SolicitacaoCompraId,
                        principalTable: "SolicitacoesCompra",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SolicitacaoCompraItens_SolicitacaoCompraId",
                table: "SolicitacaoCompraItens",
                column: "SolicitacaoCompraId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SolicitacaoCompraItens");

            migrationBuilder.DropTable(
                name: "SolicitacoesCompra");
        }
    }
}
