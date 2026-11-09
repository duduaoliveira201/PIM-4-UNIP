namespace BrewMaster.Models
{
    public class SolicitacaoCompra
    {
        public string Id { get; set; } = null!;
        public string LoteId { get; set; } = string.Empty;
        public string Numero { get; set; } = string.Empty;
        public string Status { get; set; } = "pendente";
        public string Solicitante { get; set; } = string.Empty;
        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
        public DateTime? DataResposta { get; set; }
        public string Observacao { get; set; } = string.Empty;

        public List<SolicitacaoCompraItem> Itens { get; set; } = new();
    }
}
