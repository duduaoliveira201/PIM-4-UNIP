namespace BrewMaster.Models
{
    public class LogEntry
    {
        public string Id { get; set; } = null!;

        public string Tipo { get; set; } = null!;
        public DateTime Data { get; set; } = DateTime.UtcNow;
        public string Detalhes { get; set; } = null!;
    }
}
