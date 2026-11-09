using System.Collections.Generic;

namespace BrewMaster.Models
{
    public class Lote
    {
        public string Id { get; set; } = null!;

        public string Nome { get; set; } = null!;
        public string ReceitaId { get; set; } = null!;
        public string ReceitaNome { get; set; } = null!;
        public string ReceitaEmbalagem { get; set; } = string.Empty;
        public double QuantidadeLitros { get; set; }
        public string InsumosJson { get; set; } = "[]";
        public LoteStatus Status { get; set; } = LoteStatus.EmProducao;
        public LotePhase FaseAtual { get; set; } = LotePhase.Planejamento;
        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
        public DateTime? DataFinalizacao { get; set; }
        public bool IsVendido { get; set; }
        public List<string> Historico { get; set; } = new List<string>();
    }
}
