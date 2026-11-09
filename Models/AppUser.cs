namespace BrewMaster.Models
{
    public class AppUser
    {
        public string Id { get; set; } = null!;

        public string Username { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
    }
}