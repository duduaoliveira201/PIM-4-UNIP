namespace BrewMaster.Models;

public class ConfiguracaoSistema
{
    public int Id { get; set; }
    public string NomeEmpresa { get; set; } = string.Empty;
    public string Cnpj { get; set; } = string.Empty;
    public string Endereco { get; set; } = string.Empty;
    public string Cep { get; set; } = string.Empty;
    public double ValorFreteBase { get; set; } = 18;
}