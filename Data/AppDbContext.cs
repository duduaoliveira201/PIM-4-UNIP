using BrewMaster.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace BrewMaster.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<IngredienteStock> Stocks => Set<IngredienteStock>();
    public DbSet<Receita> Receitas => Set<Receita>();
    public DbSet<Lote> Lotes => Set<Lote>();
    public DbSet<SolicitacaoCompra> SolicitacoesCompra => Set<SolicitacaoCompra>();
    public DbSet<SolicitacaoCompraItem> SolicitacaoCompraItens => Set<SolicitacaoCompraItem>();
    public DbSet<LogEntry> Logs => Set<LogEntry>();
    public DbSet<Venda> Vendas => Set<Venda>();
    public DbSet<ConfiguracaoSistema> ConfiguracoesSistema => Set<ConfiguracaoSistema>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>().ToTable("Users").HasKey(user => user.Id);
        modelBuilder.Entity<IngredienteStock>().ToTable("Stocks").HasKey(stock => stock.Id);
        modelBuilder.Entity<IngredienteStock>().Property(stock => stock.PrecoUnitario).HasColumnName("PrecoUnitario");
        modelBuilder.Entity<Receita>().ToTable("Receitas").HasKey(receita => receita.Id);
        modelBuilder.Entity<Receita>().Property(receita => receita.InsumosJson).HasColumnName("InsumosJson");
        modelBuilder.Entity<Lote>().ToTable("Lotes").HasKey(lote => lote.Id);
        modelBuilder.Entity<Lote>().Property(lote => lote.InsumosJson).HasColumnName("InsumosJson");
        modelBuilder.Entity<SolicitacaoCompra>().ToTable("SolicitacoesCompra").HasKey(request => request.Id);
        modelBuilder.Entity<SolicitacaoCompra>().HasMany(request => request.Itens).WithOne().HasForeignKey(item => item.SolicitacaoCompraId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<SolicitacaoCompraItem>().ToTable("SolicitacaoCompraItens").HasKey(item => item.Id);
        modelBuilder.Entity<LogEntry>().ToTable("Logs").HasKey(log => log.Id);
        modelBuilder.Entity<Venda>().ToTable("Vendas").HasKey(venda => venda.Id);
        modelBuilder.Entity<Venda>().HasIndex(venda => venda.LoteId).IsUnique();
        modelBuilder.Entity<ConfiguracaoSistema>().ToTable("ConfiguracoesSistema").HasKey(configuration => configuration.Id);
        modelBuilder.Entity<ConfiguracaoSistema>().Property(configuration => configuration.ValorFreteBase).HasDefaultValue(18d);

        modelBuilder.Entity<Lote>().Property(lote => lote.Historico).HasConversion(
            values => string.Join("\n", values),
            value => string.IsNullOrEmpty(value) ? new List<string>() : value.Split(new[] { '\n' }, StringSplitOptions.None).ToList(),
            new ValueComparer<List<string>>(
                (left, right) => left != null && right != null && left.SequenceEqual(right),
                value => value.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
                value => value.ToList()));
    }
}