namespace BrewMaster.Models
{
    public class Receita
    {
        public string Id { get; set; } = null!;

        public string Nome { get; set; } = null!;
        public string Descricao { get; set; } = "";
        public string Embalagem { get; set; } = "";
        public string Estilo { get; set; } = "";
        public double Abv { get; set; }
        public double Ibu { get; set; }
        public string InsumosJson { get; set; } = "[]";

        public double VolumeLitros { get; set; }
    }
}
