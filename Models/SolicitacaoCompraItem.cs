namespace BrewMaster.Models
{
    public class SolicitacaoCompraItem
    {
        public string Id { get; set; } = null!;
        public string SolicitacaoCompraId { get; set; } = null!;
        public string InsumoId { get; set; } = string.Empty;
        public string Nome { get; set; } = string.Empty;
        public double Quantidade { get; set; }
        public string Unidade { get; set; } = string.Empty;
        public double ValorUnitario { get; set; }
        public double ValorTotal { get; set; }
    }
}
