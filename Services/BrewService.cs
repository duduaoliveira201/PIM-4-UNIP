using BrewMaster.Data;
using BrewMaster.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace BrewMaster.Services;

public class BrewService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public BrewService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<bool> ValidateUserAsync(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password)) return false;

        var normalizedUsername = NormalizeUsername(username);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == normalizedUsername);
        return user != null && string.Equals(user.PasswordHash, HashPassword(password), StringComparison.OrdinalIgnoreCase);
    }

    public async Task<bool> CreateUserAsync(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password)) return false;

        var normalizedUsername = NormalizeUsername(username);
        if (await _context.Users.AnyAsync(user => user.Username.ToLower() == normalizedUsername)) return false;

        _context.Users.Add(new AppUser
        {
            Id = await GetNextIdAsync(_context.Users.Select(user => user.Id)),
            Username = normalizedUsername,
            PasswordHash = HashPassword(password),
        });
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task SeedLoginUserAsync()
    {
        var username = NormalizeUsername(_configuration["AdminUser:Username"] ?? "admin@brewmaster.com");
        if (await _context.Users.AnyAsync(u => u.Username.ToLower() == username)) return;
        _context.Users.Add(new AppUser { Id = await GetNextIdAsync(_context.Users.Select(user => user.Id)), Username = username, PasswordHash = HashPassword(_configuration["AdminUser:Password"] ?? "admin123") });
        await _context.SaveChangesAsync();
    }

    public async Task SeedDefaultsAsync()
    {
        await SeedLoginUserAsync();

        var seedStockCatalog = new[]
        {
            new { Nome = "Levedura Lager", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura de fermentação lager para cervejas claras e de baixa temperatura.", Preco = 220.00 },
            new { Nome = "Levedura American Lager", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura lager americana, compatível com lagers limpas e aromáticas.", Preco = 220.00 },
            new { Nome = "Levedura American Ale", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura ale americana para sabores limpos e boa atenuação.", Preco = 200.00 },
            new { Nome = "Levedura Ale", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura ale versátil para receitas clássicas e de perfil equilibrado.", Preco = 200.00 },
            new { Nome = "Levedura English Ale", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura de fermentação ale inglesa, ideal para perfis maltados e suaves.", Preco = 200.00 },
            new { Nome = "Levedura Irish Ale", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura ale irlandesa utilizada em estilos maltados e encorpados.", Preco = 220.00 },
            new { Nome = "Levedura Belgian Ale", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura belga de perfil especiado para estilos fermentados com complexidade.", Preco = 250.00 },
            new { Nome = "Levedura Belgian Witbier", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura belga Witbier para aromas de especiarias e clove.", Preco = 250.00 },
            new { Nome = "Levedura Weissbier", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura específica para cervejas Weissbier com boa clareza e esterilidade.", Preco = 230.00 },
            new { Nome = "Levedura German Lager", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura lager alemã destinada a lagers limpas, elegantes e cristalinas.", Preco = 220.00 },
            new { Nome = "Levedura Sour", Tipo = "Levedura", Unidade = "g", Descricao = "Levedura para fermentação ácida e cervejas de perfil sour.", Preco = 300.00 },
            new { Nome = "Saaz", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo noble de baixo amargor e perfil herbal/terroso.", Preco = 40.00 },
            new { Nome = "Hallertau", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo tradicional de aroma suave e perfil floral/terroso.", Preco = 35.00 },
            new { Nome = "Tettnang", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo com aroma suave e notas florais para lagers e ales delicadas.", Preco = 35.00 },
            new { Nome = "Cascade", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo americano aromático com notas cítricas e florais intensas.", Preco = 40.00 },
            new { Nome = "Centennial", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo de alta intensidade aromática com notas cítricas e resinosas.", Preco = 45.00 },
            new { Nome = "Citra", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo tropical com notas de laranja, limão e manga.", Preco = 53.40 },
            new { Nome = "Mosaic", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo aromático com complexidade frutada e floral.", Preco = 55.00 },
            new { Nome = "Amarillo", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo com aroma cítrico e notas de laranja e manga.", Preco = 45.00 },
            new { Nome = "Simcoe", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo em uso para perfis cítricos, frutados e pineados.", Preco = 50.00 },
            new { Nome = "Fuggle", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo clássico de baixa intensidade aromática com notas herbais e terrosas.", Preco = 35.00 },
            new { Nome = "East Kent Goldings", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo inglês de aroma delicado e floral, muito usado em ales tradicionais.", Preco = 50.00 },
            new { Nome = "Liberty", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo de equilíbrio cítrico e herbal usado em lagers e ales do tipo session.", Preco = 40.00 },
            new { Nome = "Styrian Goldings", Tipo = "Lúpulo", Unidade = "g", Descricao = "Lúpulo eslavo de aroma suave com notas florais e levemente terrosas.", Preco = 40.00 },
            new { Nome = "Malte Pilsen", Tipo = "Malte", Unidade = "g", Descricao = "Malte base claro, utilizado para fundar lagers e pilsen com fermentação limpa.", Preco = 1.20 },
            new { Nome = "Malte Pale Ale", Tipo = "Malte", Unidade = "g", Descricao = "Malte base com melhor cor e maior corpo para estilos ales balanceados.", Preco = 1.50 },
            new { Nome = "Malte Vienna", Tipo = "Malte", Unidade = "g", Descricao = "Malte de coloração mais profunda, ideal para estilos vienna e amber.", Preco = 1.50 },
            new { Nome = "Malte Munich", Tipo = "Malte", Unidade = "g", Descricao = "Malte escuro e caramelo para cervejas de corpo mais robusto e maltado.", Preco = 1.60 },
            new { Nome = "Malte de Trigo", Tipo = "Malte", Unidade = "g", Descricao = "Malte de trigo para witbier, hefeweizen e receitas com maior cremosidade.", Preco = 2.50 },
            new { Nome = "Malte Chocolate", Tipo = "Malte", Unidade = "g", Descricao = "Malte torrado com notas de chocolate e profundidade para stouts e porters.", Preco = 3.50 },
            new { Nome = "Malte Brown", Tipo = "Malte", Unidade = "g", Descricao = "Malte tostado com nuances de caramelo e caráter mais escuro.", Preco = 2.50 },
            new { Nome = "Malte Torrado", Tipo = "Malte", Unidade = "g", Descricao = "Malte torrado com riqueza de cor e sabor para estilos mais encorpados.", Preco = 2.50 },
            new { Nome = "Roasted Barley", Tipo = "Malte", Unidade = "g", Descricao = "Cevada torrada para perfis escuros, amargos e intensos em stout e porter.", Preco = 2.50 },
            new { Nome = "Malte Caramelo / Crystal", Tipo = "Malte", Unidade = "g", Descricao = "Malte cristal/caramelo para corpo, doçura e coloração em estilos variados.", Preco = 2.50 }
        };

        var existingNames = await _context.Stocks.Select(stock => stock.Nome.Trim()).ToListAsync();
        var missingCatalog = new List<IngredienteStock>();
        var nextCatalogId = await GetNextIdAsync(_context.Stocks.Select(stock => stock.Id));

        foreach (var item in seedStockCatalog)
        {
            if (existingNames.Contains(item.Nome, StringComparer.OrdinalIgnoreCase)) continue;

            var idNumber = int.Parse(nextCatalogId, CultureInfo.InvariantCulture);
            missingCatalog.Add(new IngredienteStock
            {
                Id = idNumber.ToString("D3"),
                Nome = item.Nome,
                Tipo = item.Tipo,
                Unidade = item.Unidade,
                Quantidade = 0,
                Descricao = item.Descricao,
                PrecoUnitario = item.Preco,
                DataCriacao = DateTime.UtcNow
            });
            nextCatalogId = (idNumber + 1).ToString("D3");
        }

        if (missingCatalog.Count > 0)
        {
            _context.Stocks.AddRange(missingCatalog);
            await _context.SaveChangesAsync();
        }

        if (!await _context.Receitas.AnyAsync())
        {
            var malte = await _context.Stocks.FirstOrDefaultAsync(s => s.Tipo == "Malte" && s.Nome == "Malte Pilsen");
            var lupulo = await _context.Stocks.FirstOrDefaultAsync(s => s.Tipo == "Lúpulo" && s.Nome == "Saaz") ?? await _context.Stocks.FirstOrDefaultAsync(s => s.Tipo == "Lúpulo");
            var levedura = await _context.Stocks.FirstOrDefaultAsync(s => s.Tipo == "Levedura" && s.Nome == "Levedura Ale") ?? await _context.Stocks.FirstOrDefaultAsync(s => s.Tipo == "Levedura");
            _context.Receitas.Add(new Receita
            {
                Id = await GetNextIdAsync(_context.Receitas.Select(recipe => recipe.Id)),
                Nome = "Receita Pilsen Básica", Descricao = "Pilsen leve para produção padrão.", Embalagem = "Lata 350ml",
                Estilo = "Pilsen", VolumeLitros = 100, InsumosJson = "[]"
            });
            await _context.SaveChangesAsync();
        }
    }

    public Task<List<IngredienteStock>> GetStocksAsync() => _context.Stocks.OrderBy(s => s.Tipo).ToListAsync();
    public Task<IngredienteStock?> GetStockByIdAsync(string id) => _context.Stocks.FirstOrDefaultAsync(s => s.Id == id);
    public Task<List<Receita>> GetReceitasAsync() => _context.Receitas.OrderBy(r => r.Nome).ToListAsync();
    public Task<List<Lote>> GetLotesAsync() => _context.Lotes.OrderByDescending(l => l.DataCriacao).ToListAsync();
    public Task<List<Lote>> GetFinalizedLotesAsync() => _context.Lotes.Where(l => l.Status == LoteStatus.Finalizado || l.FaseAtual == LotePhase.Finalizado).OrderByDescending(l => l.DataFinalizacao).ThenByDescending(l => l.DataCriacao).ToListAsync();
    public Task<List<LogEntry>> GetRecentLogsAsync(int limit = 20) => _context.Logs.OrderByDescending(l => l.Data).Take(limit).ToListAsync();
    public Task<long> GetLoteCountAsync() => _context.Lotes.LongCountAsync();
    public Task<Dictionary<LotePhase, long>> GetLoteCountsByPhaseAsync() => _context.Lotes.GroupBy(l => l.FaseAtual).Select(g => new { Phase = g.Key, Count = g.LongCount() }).ToDictionaryAsync(x => x.Phase, x => x.Count);

    public async Task CreateReceitaAsync(Receita receita)
    {
        ValidateReceita(receita);
        _context.Receitas.Add(receita); await _context.SaveChangesAsync();
        await AddLogAsync("Receita", $"Receita '{receita.Nome}' criada.");
    }

    public async Task UpdateReceitaAsync(Receita receita)
    {
        if (string.IsNullOrWhiteSpace(receita.Id)) throw new InvalidOperationException("Receita inválida.");
        ValidateReceita(receita);
        _context.Receitas.Update(receita); await _context.SaveChangesAsync();
        await AddLogAsync("Receita", $"Receita '{receita.Nome}' atualizada.");
    }

    public async Task DeleteReceitaAsync(string id)
    {
        var receita = await _context.Receitas.FirstOrDefaultAsync(r => r.Id == id) ?? throw new InvalidOperationException("Receita não encontrada.");
        if (await _context.Lotes.AnyAsync(l => l.ReceitaId == id)) throw new InvalidOperationException("Não é possível excluir uma receita que já possui lotes vinculados.");
        _context.Receitas.Remove(receita); await _context.SaveChangesAsync();
        await AddLogAsync("Receita", $"Receita '{receita.Nome}' excluída.");
    }

    public async Task CreateLoteAsync(Lote lote)
    {
        if (string.IsNullOrWhiteSpace(lote.Nome)) throw new InvalidOperationException("Informe um nome para o lote.");
        var receita = await _context.Receitas.FirstOrDefaultAsync(r => r.Id == lote.ReceitaId) ?? throw new InvalidOperationException("Receita não encontrada.");
        if (lote.QuantidadeLitros <= 0) lote.QuantidadeLitros = receita.VolumeLitros;
        if (receita.VolumeLitros <= 0) throw new InvalidOperationException("A receita selecionada não possui volume base válido.");
        var factor = lote.QuantidadeLitros / receita.VolumeLitros;
        var needs = Array.Empty<(IngredienteStock? stock, double amount)>();
        if (needs.Any(x => x.stock == null || x.stock.Quantidade < x.amount)) throw new InvalidOperationException("Estoque insuficiente para iniciar o lote.");
        await using var transaction = await _context.Database.BeginTransactionAsync();
        foreach (var need in needs) need.stock!.Quantidade -= need.amount;
        lote.Id = await GetNextIdAsync(_context.Lotes.Select(item => item.Id)); lote.ReceitaNome = receita.Nome; lote.ReceitaEmbalagem = receita.Embalagem; lote.Status = LoteStatus.EmProducao; lote.FaseAtual = LotePhase.Brassagem; lote.DataCriacao = DateTime.UtcNow; lote.Historico.Add($"Produção iniciada em {DateTime.UtcNow:yyyy-MM-dd HH:mm}");
        _context.Lotes.Add(lote); await _context.SaveChangesAsync(); await transaction.CommitAsync();
        await AddLogAsync("Lote", $"Produção '{lote.Nome}' iniciada para receita '{receita.Nome}'.");
    }

    public async Task AdvanceLotePhaseAsync(string id)
    {
        var lote = await _context.Lotes.FirstOrDefaultAsync(l => l.Id == id) ?? throw new InvalidOperationException("Lote não encontrado.");
        var next = GetNextPhase(lote.FaseAtual) ?? throw new InvalidOperationException("Não foi possível avançar o lote.");
        lote.FaseAtual = next; lote.Status = next == LotePhase.Finalizado ? LoteStatus.Finalizado : LoteStatus.EmProducao; lote.DataFinalizacao = next == LotePhase.Finalizado ? DateTime.UtcNow : lote.DataFinalizacao; lote.Historico.Add($"{GetPhaseLabel(next)} em {DateTime.UtcNow:yyyy-MM-dd HH:mm}");
        await _context.SaveChangesAsync(); await AddLogAsync("Lote", $"Lote '{lote.Nome}' avançou para fase {GetPhaseLabel(next)}.");
    }

    public async Task CreateStockAsync(IngredienteStock stock)
    {
        if (string.IsNullOrWhiteSpace(stock.Nome) || string.IsNullOrWhiteSpace(stock.Tipo) || string.IsNullOrWhiteSpace(stock.Unidade)) throw new InvalidOperationException("Nome, tipo e unidade do insumo são obrigatórios.");
        if (stock.Quantidade < 0 || await _context.Stocks.AnyAsync(s => s.Tipo == stock.Tipo && s.Nome == stock.Nome)) throw new InvalidOperationException("Insumo inválido ou já existente.");
        stock.Id = await GetNextIdAsync(_context.Stocks.Select(item => item.Id));
        _context.Stocks.Add(stock); await _context.SaveChangesAsync(); await AddLogAsync("Estoque", $"Insumo '{stock.Nome}' criado.");
    }

    public async Task AdjustStockAsync(string id, double delta)
    {
        var stock = await _context.Stocks.FirstOrDefaultAsync(s => s.Id == id) ?? throw new InvalidOperationException("Insumo não encontrado.");
        if (stock.Quantidade + delta < 0) throw new InvalidOperationException("Quantidade insuficiente.");
        stock.Quantidade += delta; await _context.SaveChangesAsync(); await AddLogAsync("Estoque", $"Estoque de '{stock.Nome}' ajustado.");
    }

    public async Task UpdateStockAsync(IngredienteStock stock)
    {
        if (string.IsNullOrWhiteSpace(stock.Id)) await CreateStockAsync(stock);
        else { _context.Stocks.Update(stock); await _context.SaveChangesAsync(); }
    }

    public async Task AddLogAsync(string type, string details)
    {
        _context.Logs.Add(new LogEntry { Id = await GetNextIdAsync(_context.Logs.Select(log => log.Id)), Tipo = type, Data = DateTime.UtcNow, Detalhes = details });
        await _context.SaveChangesAsync();
    }

    public static string GetPhaseLabel(LotePhase phase) => phase switch
    {
        LotePhase.Planejamento => "Planejamento", LotePhase.Brassagem => "Brassagem", LotePhase.Filtragem => "Filtragem", LotePhase.Fervura => "Fervura", LotePhase.Resfriamento => "Resfriamento", LotePhase.FermentacaoMaturacao => "Fermentação/Maturação", LotePhase.Finalizado => "Finalizado", _ => phase.ToString()
    };

    private static LotePhase? GetNextPhase(LotePhase phase) => phase switch
    {
        LotePhase.Planejamento => LotePhase.Brassagem, LotePhase.Brassagem => LotePhase.Filtragem, LotePhase.Filtragem => LotePhase.Fervura, LotePhase.Fervura => LotePhase.Resfriamento, LotePhase.Resfriamento => LotePhase.FermentacaoMaturacao, LotePhase.FermentacaoMaturacao => LotePhase.Finalizado, _ => null
    };

    private static void ValidateReceita(Receita receita)
    {
        if (string.IsNullOrWhiteSpace(receita.Nome)) throw new InvalidOperationException("Informe o nome da receita.");
        if (string.IsNullOrWhiteSpace(receita.Embalagem)) throw new InvalidOperationException("Informe o tipo de embalagem.");
    }

    private async Task<IngredienteStock?> ResolveStockForReceitaAsync(string id, string name, string type)
    {
        if (!string.IsNullOrWhiteSpace(id))
        {
            var byId = await _context.Stocks.FirstOrDefaultAsync(s => s.Id == id);
            if (byId != null) return byId;
        }

        var normalizedType = NormalizeTipo(type);
        var byNameAndType = await _context.Stocks.FirstOrDefaultAsync(s => NormalizeTipo(s.Tipo) == normalizedType && s.Nome == name);
        if (byNameAndType != null) return byNameAndType;

        return await _context.Stocks.FirstOrDefaultAsync(s => NormalizeTipo(s.Tipo) == normalizedType);
    }

    private static string NormalizeTipo(string value) => new string(value.Normalize(NormalizationForm.FormD)
        .Where(ch => CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
        .ToArray())
        .Normalize(NormalizationForm.FormC)
        .Replace(" ", string.Empty, StringComparison.OrdinalIgnoreCase)
        .Trim();

    private static async Task<string> GetNextIdAsync(IQueryable<string> ids)
    {
        var values = await ids.ToListAsync();
        var next = values.Select(id => int.TryParse(id, out var number) ? number : 0).DefaultIfEmpty(0).Max() + 1;
        if (next > 999) throw new InvalidOperationException("O limite de 999 registros foi atingido.");
        return $"{next:000}";
    }

    private static string NormalizeUsername(string username) => username.Trim().ToLowerInvariant();

    private static string HashPassword(string password) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)));
}
