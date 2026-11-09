namespace BrewMaster.Models;

public class Venda
{
    public string Id { get; set; } = null!;
    public string LoteId { get; set; } = null!;
    public string Nome { get; set; } = null!;
    public string ReceitaNome { get; set; } = null!;
    public double Volume { get; set; }
    public double ValorUnitario { get; set; }
    public double Aliquota { get; set; }
    public double Imposto { get; set; }
    public double Frete { get; set; }
    public double Total { get; set; }
    public string Localidade { get; set; } = string.Empty;
    public string NumeroEndereco { get; set; } = string.Empty;
    public string ComplementoEndereco { get; set; } = string.Empty;
    public double DistanciaKm { get; set; }
    public string Cep { get; set; } = string.Empty;
    public string EmpresaFrete { get; set; } = string.Empty;
    public string StatusEntrega { get; set; } = "aguardando_entrega";
    public string FormaPagamento { get; set; } = string.Empty;
    public DateTime? DataEntrega { get; set; }
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
}