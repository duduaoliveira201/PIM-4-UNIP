namespace BrewMaster.Models
{
    public class IngredienteStock
    {
        public string Id { get; set; } = null!;

        public string Nome { get; set; } = null!;
        public string Unidade { get; set; } = "kg";
        public double Quantidade { get; set; }
        public string Tipo { get; set; } = null!;

        public string Descricao { get; set; } = "";
        public double PrecoUnitario { get; set; }
        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    }
}
