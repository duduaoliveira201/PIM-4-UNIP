using System.Text.Json;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
using BrewMaster.Data;
using BrewMaster.Models;
using BrewMaster.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BrewMaster.Api.Controllers;

[ApiController]
[Route("api")]
public class SystemController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly BrewService _brew;
    private readonly IConfiguration _configuration;

    public SystemController(AppDbContext db, BrewService brew, IConfiguration configuration)
    {
        _db = db;
        _brew = brew;
        _configuration = configuration;
    }

    [HttpGet("auth")]
    public IActionResult VerifyAuth() => Ok(new
    {
        success = true,
        data = new
        {
            autenticado = HttpContext.Session.GetString("authenticated") == "true",
            admin = HttpContext.Session.GetString("isAdmin") == "true",
        },
    });

    [HttpGet("configuracoes")]
    public async Task<IActionResult> GetSystemSettings()
    {
        var settings = await _db.ConfiguracoesSistema.OrderBy(item => item.Id).FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new ConfiguracaoSistema();
            _db.ConfiguracoesSistema.Add(settings);
            await _db.SaveChangesAsync();
        }

        return Ok(ApiSuccess(ToSystemSettingsDto(settings)));
    }

    [HttpPut("configuracoes")]
    public async Task<IActionResult> SaveSystemSettings([FromBody] SystemSettingsRequest request)
    {
        var cnpj = new string(request.Cnpj.Where(char.IsDigit).ToArray());
        var cep = new string(request.Cep.Where(char.IsDigit).ToArray());
        if (string.IsNullOrWhiteSpace(request.NomeEmpresa) || string.IsNullOrWhiteSpace(request.Endereco))
            return BadRequest(ApiError("Informe o nome da empresa e o endereço."));
        if (cnpj.Length != 14) return BadRequest(ApiError("O CNPJ deve conter 14 dígitos."));
        if (cep.Length != 8) return BadRequest(ApiError("O CEP da cervejaria deve conter 8 dígitos."));
        if (!double.IsFinite(request.ValorFreteBase) || request.ValorFreteBase < 0)
            return BadRequest(ApiError("O valor-base do frete deve ser um valor válido e não negativo."));

        var settings = await _db.ConfiguracoesSistema.OrderBy(item => item.Id).FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new ConfiguracaoSistema();
            _db.ConfiguracoesSistema.Add(settings);
        }

        settings.NomeEmpresa = request.NomeEmpresa.Trim();
        settings.Cnpj = cnpj;
        settings.Endereco = request.Endereco.Trim();
        settings.Cep = cep;
        settings.ValorFreteBase = request.ValorFreteBase;
        await _db.SaveChangesAsync();
        return Ok(ApiSuccess(ToSystemSettingsDto(settings)));
    }

    [HttpPost("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (request is null)
            return BadRequest(ApiError("Requisição inválida."));

        if (request.Action == "logout")
        {
            HttpContext.Session.Clear();
            return Ok(new { success = true });
        }

        var email = request.Email?.Trim() ?? string.Empty;
        var password = request.Senha ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return BadRequest(ApiError("Informe e-mail e senha."));

        var valid = await _brew.ValidateUserAsync(email, password);
        if (!valid) return Unauthorized(new { success = false, message = "Credenciais inválidas" });
        HttpContext.Session.SetString("authenticated", "true");
        var adminEmail = _configuration["AdminUser:Username"] ?? "admin@brewmaster.com";
        var isAdmin = string.Equals(email, adminEmail.Trim(), StringComparison.OrdinalIgnoreCase);
        HttpContext.Session.SetString("isAdmin", isAdmin ? "true" : "false");
        return Ok(new { success = true, data = new { admin = isAdmin } });
    }

    [HttpPost("usuarios")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (request is null)
            return BadRequest(ApiError("Requisição inválida."));

        if (HttpContext.Session.GetString("authenticated") != "true" || HttpContext.Session.GetString("isAdmin") != "true")
            return StatusCode(StatusCodes.Status403Forbidden, ApiError("Somente o administrador pode criar usuários."));

        var email = request.Email?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email) || !new EmailAddressAttribute().IsValid(email))
            return BadRequest(ApiError("Informe um e-mail válido."));
        if (string.IsNullOrWhiteSpace(request.Senha) || request.Senha.Length < 8)
            return BadRequest(ApiError("A senha deve ter pelo menos 8 caracteres."));
        if (!await _brew.CreateUserAsync(email, request.Senha))
            return Conflict(ApiError("Já existe um usuário com este e-mail."));

        return Ok(ApiSuccess(new { email = email.ToLowerInvariant() }));
    }

    [HttpGet("usuarios")]
    public async Task<IActionResult> ListUsers()
    {
        if (HttpContext.Session.GetString("authenticated") != "true" || HttpContext.Session.GetString("isAdmin") != "true")
            return StatusCode(StatusCodes.Status403Forbidden, ApiError("Somente o administrador pode visualizar usuários."));

        var users = await _db.Users
            .OrderBy(user => user.Username)
            .Select(user => new { email = user.Username })
            .ToListAsync();
        return Ok(ApiSuccess(users));
    }

    [HttpGet("insumos")]
    public async Task<IActionResult> ListStocks() => Ok(ApiSuccess((await _db.Stocks.OrderBy(stock => stock.Tipo).ToListAsync()).Select(ToStockDto)));

    [HttpPost("insumos")]
    public async Task<IActionResult> SaveStock([FromBody] JsonElement payload)
    {
        var action = ReadString(payload, "action");
        var request = new StockRequest
        {
            Action = action ?? string.Empty,
            Id = ReadString(payload, "id"),
            InsumoId = ReadString(payload, "insumo_id"),
            Nome = ReadString(payload, "nome"),
            Tipo = ReadString(payload, "tipo") ?? "outro",
            Descricao = ReadString(payload, "descricao"),
            Unidade = ReadString(payload, "unidade") ?? "kg",
            Estoque = ReadDouble(payload, "estoque"),
            Preco = ReadDouble(payload, "preco"),
            TipoMovimento = ReadString(payload, "tipo_movimento") ?? "entrada",
            Quantidade = ReadDouble(payload, "quantidade")
        };

        if (request.Action == "registrar_movimentacao")
        {
            var stock = await _db.Stocks.FirstOrDefaultAsync(item => item.Id == request.InsumoId);
            if (stock == null) return NotFound(ApiError("Insumo não encontrado"));
            if (request.Quantidade <= 0) return BadRequest(ApiError("Quantidade inválida"));
            var entrada = request.TipoMovimento.Equals("entrada", StringComparison.OrdinalIgnoreCase);
            if (!entrada && stock.Quantidade < request.Quantidade) return BadRequest(ApiError("Estoque insuficiente para saída"));
            stock.Quantidade += entrada ? request.Quantidade : -request.Quantidade;
            await _db.SaveChangesAsync();
            return Ok(ApiSuccess(new { insumo_id = stock.Id, estoque_atual = stock.Quantidade }));
        }

        if (string.IsNullOrWhiteSpace(request.Nome)) return BadRequest(ApiError("Nome do insumo é obrigatório"));
        if (request.Estoque < 0) return BadRequest(ApiError("Quantidade inválida"));

        if (request.Action == "criar")
        {
            var stock = new IngredienteStock
            {
                Id = await NextId(_db.Stocks.Select(item => item.Id)), Nome = request.Nome.Trim(), Tipo = request.Tipo,
                Descricao = request.Descricao ?? string.Empty, Unidade = request.Unidade, Quantidade = request.Estoque, PrecoUnitario = request.Preco
            };
            _db.Stocks.Add(stock);
            await _db.SaveChangesAsync();
            return Ok(ApiSuccess(new { id = stock.Id }));
        }

        if (request.Action == "atualizar")
        {
            var stock = await _db.Stocks.FirstOrDefaultAsync(item => item.Id == request.Id);
            if (stock == null) return NotFound(ApiError("Insumo não encontrado"));
            stock.Nome = request.Nome.Trim(); stock.Tipo = request.Tipo; stock.Descricao = request.Descricao ?? string.Empty;
            stock.Unidade = request.Unidade; stock.Quantidade = request.Estoque; stock.PrecoUnitario = request.Preco;
            await _db.SaveChangesAsync();
            return Ok(ApiSuccess(new { id = stock.Id }));
        }

        return BadRequest(ApiError("Ação inválida"));
    }

    [HttpDelete("insumos/{id}")]
    public async Task<IActionResult> DeleteStock(string id)
    {
        var stock = await _db.Stocks.FirstOrDefaultAsync(item => item.Id == id);
        if (stock == null) return NotFound(ApiError("Insumo não encontrado"));
        _db.Stocks.Remove(stock);
        await _db.SaveChangesAsync();
        return Ok(ApiSuccess(new { id }));
    }

    [HttpDelete("lotes/{id}")]
    public async Task<IActionResult> DeleteLot(string id)
    {
        var lot = await _db.Lotes.FirstOrDefaultAsync(item => item.Id == id);
        if (lot == null) return NotFound(ApiError("Lote não encontrado"));

        var linkedRequests = await _db.SolicitacoesCompra.Where(item => item.LoteId == id).ToListAsync();
        if (linkedRequests.Count > 0)
        {
            _db.SolicitacoesCompra.RemoveRange(linkedRequests);
        }

        _db.Lotes.Remove(lot);
        await _db.SaveChangesAsync();
        return Ok(ApiSuccess(new { id }));
    }

    [HttpGet("receitas")]
    public async Task<IActionResult> ListRecipes() => Ok(ApiSuccess((await _db.Receitas.OrderBy(recipe => recipe.Nome).ToListAsync()).Select(ToRecipeDto)));

    [HttpDelete("receitas/{id}")]
    public async Task<IActionResult> DeleteRecipe(string id)
    {
        var recipeToDelete = await _db.Receitas.FindAsync(id);
        if (recipeToDelete == null) return NotFound(ApiError("Receita não encontrada"));
        _db.Receitas.Remove(recipeToDelete);
        await _db.SaveChangesAsync();
        return Ok(ApiSuccess(new { id }));
    }

    [HttpPost("receitas")]
    public async Task<IActionResult> SaveRecipe([FromBody] RecipeRequest request)
    {
        if (request.Action == "deletar")
        {
            var recipeToDelete = await _db.Receitas.FindAsync(request.Id.ToString());
            if (recipeToDelete == null) return NotFound(ApiError("Receita não encontrada"));
            _db.Receitas.Remove(recipeToDelete);
            await _db.SaveChangesAsync();
            return Ok(ApiSuccess(new { id = request.Id }));
        }

        if (string.IsNullOrWhiteSpace(request.Nome)) return BadRequest(ApiError("Nome da receita é obrigatório"));

        var recipe = request.Action == "atualizar" ? await _db.Receitas.FindAsync(request.Id.ToString()) : null;
        if (request.Action == "atualizar" && recipe == null) return NotFound(ApiError("Receita não encontrada"));
        recipe ??= new Receita { Id = await NextId(_db.Receitas.Select(item => item.Id)) };
        recipe.Nome = request.Nome.Trim(); recipe.Descricao = request.Descricao; recipe.Embalagem = request.EmbalagemTipo;
        recipe.Estilo = request.Estilo; recipe.Abv = request.Abv; recipe.Ibu = request.Ibu;
        recipe.VolumeLitros = request.Volume; recipe.InsumosJson = JsonSerializer.Serialize(request.Insumos);
        if (_db.Entry(recipe).State == EntityState.Detached) _db.Receitas.Add(recipe);
        await _db.SaveChangesAsync();
        return Ok(ApiSuccess(new { id = recipe.Id }));
    }

    [HttpGet("lotes")]
    public async Task<IActionResult> ListLots() => Ok(ApiSuccess((await _db.Lotes.OrderByDescending(lot => lot.DataCriacao).ToListAsync()).Select(ToLotDto)));

    [HttpGet("vendas")]
    public async Task<IActionResult> ListSales() => Ok(ApiSuccess((await _db.Vendas.OrderByDescending(sale => sale.DataCriacao).ToListAsync()).Select(ToSaleDto)));

    [HttpPost("vendas/{id}/entrega")]
    public async Task<IActionResult> UpdateSaleDelivery(string id, [FromBody] DeliveryRequest request)
    {
        var sale = await _db.Vendas.FirstOrDefaultAsync(item => item.Id == id);
        if (sale == null) return NotFound(ApiError("Venda não encontrada."));
        if (request.Action == "iniciar")
        {
            if (sale.StatusEntrega == "entregue") return Conflict(ApiError("Esta entrega já foi finalizada."));
            sale.StatusEntrega = "em_entrega";
        }
        else if (request.Action == "finalizar")
        {
            var payment = request.FormaPagamento?.Trim().ToLowerInvariant();
            var validPayments = new[] { "nota", "boleto", "cartao_credito", "cartao_debito", "pix" };
            if (payment == null || !validPayments.Contains(payment)) return BadRequest(ApiError("Selecione uma forma de pagamento válida."));
            sale.StatusEntrega = "entregue";
            sale.FormaPagamento = payment;
            sale.DataEntrega = DateTime.UtcNow;
        }
        else return BadRequest(ApiError("Ação de entrega inválida."));

        await _db.SaveChangesAsync();
        return Ok(ApiSuccess(ToSaleDto(sale)));
    }

    [HttpPost("vendas")]
    public async Task<IActionResult> CreateSale([FromBody] SaleRequest request)
    {
        if (request.LoteIds == null || request.LoteIds.Count == 0) return BadRequest(ApiError("Selecione ao menos um lote."));
        if (request.ValorUnitario < 0 || request.Aliquota < 0 || request.Frete < 0) return BadRequest(ApiError("Valor, alíquota e frete não podem ser negativos."));
        if (string.IsNullOrWhiteSpace(request.Cep) || string.IsNullOrWhiteSpace(request.Localidade) || request.DistanciaKm < 0) return BadRequest(ApiError("Informe um CEP válido para calcular a localidade e a distância."));
        if (string.IsNullOrWhiteSpace(request.NumeroEndereco)) return BadRequest(ApiError("Informe o número do endereço de entrega."));

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var lots = await _db.Lotes.Where(lot => request.LoteIds.Contains(lot.Id)).ToListAsync();
        if (lots.Count != request.LoteIds.Distinct(StringComparer.Ordinal).Count()) return NotFound(ApiError("Um ou mais lotes não foram encontrados."));
        if (lots.Any(lot => lot.IsVendido)) return Conflict(ApiError("Um ou mais lotes já foram vendidos."));
        if (lots.Any(lot => lot.Status != LoteStatus.Finalizado && lot.FaseAtual != LotePhase.Finalizado)) return BadRequest(ApiError("Somente lotes finalizados podem ser vendidos."));
        if (lots.Any(lot => lot.QuantidadeLitros <= 0)) return BadRequest(ApiError("Um ou mais lotes não possuem volume disponível."));

        var volumeTotal = lots.Sum(lot => lot.QuantidadeLitros);
        var subtotal = volumeTotal * request.ValorUnitario;
        var impostoTotal = subtotal * request.Aliquota / 100d;
        var baseFreight = await _db.ConfiguracoesSistema.OrderBy(item => item.Id).Select(item => (double?)item.ValorFreteBase).FirstOrDefaultAsync() ?? 18d;
        var freteTotal = Math.Round(request.DistanciaKm * baseFreight, 2);
        var total = subtotal + impostoTotal + freteTotal;
        var companyName = await _db.ConfiguracoesSistema.OrderBy(item => item.Id).Select(item => item.NomeEmpresa).FirstOrDefaultAsync();
        var freightCompany = string.IsNullOrWhiteSpace(companyName) ? "Frete próprio da cervejaria" : $"Frete próprio - {companyName.Trim()}";
        var nextSaleId = int.Parse(await NextId(_db.Vendas.Select(item => item.Id)));
        var sales = new List<Venda>();
        foreach (var lot in lots)
        {
            sales.Add(new Venda
            {
                Id = (nextSaleId++).ToString("D3"),
                LoteId = lot.Id,
                Nome = lot.Nome,
                ReceitaNome = lot.ReceitaNome,
                Volume = lot.QuantidadeLitros,
                ValorUnitario = request.ValorUnitario,
                Aliquota = request.Aliquota,
                Imposto = Math.Round(lot.QuantidadeLitros * request.ValorUnitario * request.Aliquota / 100d, 2),
                Frete = Math.Round(freteTotal * lot.QuantidadeLitros / volumeTotal, 2),
                Total = Math.Round(lot.QuantidadeLitros * request.ValorUnitario + lot.QuantidadeLitros * request.ValorUnitario * request.Aliquota / 100d + freteTotal * lot.QuantidadeLitros / volumeTotal, 2),
                Cep = request.Cep.Trim(),
                Localidade = request.Localidade.Trim(),
                NumeroEndereco = request.NumeroEndereco.Trim(),
                ComplementoEndereco = request.ComplementoEndereco.Trim(),
                DistanciaKm = request.DistanciaKm,
                EmpresaFrete = freightCompany,
                DataCriacao = DateTime.UtcNow
            });
        }

        foreach (var lot in lots)
        {
            lot.IsVendido = true;
            lot.Historico.Add($"Venda registrada em {DateTime.UtcNow:yyyy-MM-dd HH:mm}; volume baixado: {lot.QuantidadeLitros:0.##} L");
        }

        _db.Vendas.AddRange(sales);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(ApiSuccess(sales.Select(ToSaleDto).ToArray()));
    }

    [HttpGet("solicitacoes")]
    public async Task<IActionResult> ListPurchaseRequests() => Ok(ApiSuccess((await _db.SolicitacoesCompra.Include(request => request.Itens).OrderByDescending(request => request.DataCriacao).ToListAsync()).Select(ToPurchaseRequestDto)));

    [HttpPost("solicitacoes")]
    public async Task<IActionResult> SavePurchaseRequest([FromBody] JsonElement payload)
    {
        var action = ReadString(payload, "action") ?? "criar";
        if (action == "aprovar")
        {
            var requestId = ReadString(payload, "id");
            var request = await _db.SolicitacoesCompra.Include(item => item.Itens).FirstOrDefaultAsync(item => item.Id == requestId);
            if (request == null) return NotFound(ApiError("Solicitação não encontrada"));
            request.Status = "aprovada";
            request.DataResposta = DateTime.UtcNow;
            var linkedLot = string.IsNullOrWhiteSpace(request.LoteId) ? null : await _db.Lotes.FirstOrDefaultAsync(item => item.Id == request.LoteId);
            if (linkedLot != null)
            {
                linkedLot.Status = LoteStatus.EmProducao;
            }
            foreach (var item in request.Itens)
            {
                var stock = await _db.Stocks.FirstOrDefaultAsync(stockItem => stockItem.Id == item.InsumoId);
                if (stock == null)
                {
                    return NotFound(ApiError($"Insumo não encontrado para a solicitação: {item.Nome}"));
                }

                stock.Quantidade += item.Quantidade;
            }

            await _db.SaveChangesAsync();
            return Ok(ApiSuccess(ToPurchaseRequestDto(request)));
        }

        if (action == "negar")
        {
            var requestId = ReadString(payload, "id");
            var request = await _db.SolicitacoesCompra.FirstOrDefaultAsync(item => item.Id == requestId);
            if (request == null) return NotFound(ApiError("Solicitação não encontrada"));
            request.Status = "negada";
            request.DataResposta = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ApiSuccess(new { success = true, id = request.Id }));
        }

        if (action != "criar") return BadRequest(ApiError("Ação inválida"));

        var solicitante = ReadString(payload, "solicitante") ?? "Sistema";
        var loteId = ReadString(payload, "lote_id");
        if (string.IsNullOrWhiteSpace(loteId)) return BadRequest(ApiError("A solicitação deve estar vinculada a um lote."));
        var pendingLot = await _db.Lotes.FirstOrDefaultAsync(item => item.Id == loteId);
        if (pendingLot == null) return NotFound(ApiError("Lote não encontrado."));
        if (pendingLot.Status == LoteStatus.Finalizado) return BadRequest(ApiError("O lote finalizado não pode mais solicitar insumos."));
        var itemPayload = payload.TryGetProperty("itens", out var itemsValue) && itemsValue.ValueKind == JsonValueKind.Array ? itemsValue : default;
        var items = new List<SolicitacaoCompraItem>();

        if (itemPayload.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in itemPayload.EnumerateArray())
            {
                var itemId = ReadString(item, "id") ?? Guid.NewGuid().ToString();
                var insumoId = ReadString(item, "insumoId") ?? ReadString(item, "insumo_id") ?? string.Empty;
                var nome = ReadString(item, "nome") ?? "Insumo";
                var quantidade = ReadDouble(item, "quantidade");
                var unidade = ReadString(item, "unidade") ?? "kg";
                var valorUnitario = ReadDouble(item, "valorUnitario");
                var valorTotal = ReadDouble(item, "valorTotal");
                items.Add(new SolicitacaoCompraItem
                {
                    Id = itemId,
                    InsumoId = insumoId,
                    Nome = nome,
                    Quantidade = quantidade,
                    Unidade = unidade,
                    ValorUnitario = valorUnitario,
                    ValorTotal = valorTotal
                });
            }
        }

        if (items.Count == 0) return BadRequest(ApiError("A solicitação precisa conter itens."));

        var requestModel = new SolicitacaoCompra
        {
            Id = await NextId(_db.SolicitacoesCompra.Select(item => item.Id)),
            LoteId = loteId,
            Numero = GeneratePurchaseRequestNumber(),
            Status = "pendente",
            Solicitante = solicitante,
            DataCriacao = DateTime.UtcNow,
            Itens = items
        };

        foreach (var item in requestModel.Itens)
        {
            item.SolicitacaoCompraId = requestModel.Id;
        }

        _db.SolicitacoesCompra.Add(requestModel);
        await _db.SaveChangesAsync();
        return Ok(ApiSuccess(ToPurchaseRequestDto(requestModel)));
    }

    [HttpPost("lotes")]
    public async Task<IActionResult> SaveLot([FromBody] LotRequest request)
    {
        if (request.Action == "atualizar_status")
        {
            var existingLot = await _db.Lotes.FindAsync(request.LoteId);
            if (existingLot == null) return NotFound(ApiError("Lote não encontrado"));
            if (existingLot.Status == LoteStatus.Pendente)
            {
                var approvedRequest = await _db.SolicitacoesCompra.AnyAsync(item => item.LoteId == existingLot.Id && item.Status == "aprovada");
                if (!approvedRequest) return BadRequest(ApiError("O lote aguarda a aprovação da solicitação de insumos."));
            }
            var phaseName = request.Fase.Replace("_", string.Empty, StringComparison.Ordinal).Replace("-", string.Empty, StringComparison.Ordinal).Replace(" ", string.Empty, StringComparison.Ordinal);
            if (!Enum.TryParse<LotePhase>(phaseName, true, out var nextPhase)) return BadRequest(ApiError("Fase de produção inválida"));
            existingLot.FaseAtual = nextPhase;
            existingLot.Status = nextPhase == LotePhase.Finalizado ? LoteStatus.Finalizado : LoteStatus.EmProducao;
            await _db.SaveChangesAsync();
            return Ok(ApiSuccess(new { id = existingLot.Id }));
        }

        var recipe = await _db.Receitas.FindAsync(request.ReceitaId.ToString());
        if (recipe == null) return NotFound(ApiError("Receita não encontrada"));
        var ingredients = ParseRecipeIngredients(recipe.InsumosJson, request.VolumeDesejado, recipe.VolumeLitros);
        var lot = new Lote
        {
            Id = await NextId(_db.Lotes.Select(item => item.Id)), Nome = request.NumeroLote, ReceitaId = recipe.Id,
            ReceitaNome = recipe.Nome, ReceitaEmbalagem = recipe.Embalagem, QuantidadeLitros = request.VolumeDesejado,
            InsumosJson = recipe.InsumosJson,
            Status = LoteStatus.EmProducao, FaseAtual = LotePhase.Planejamento
        };
        var hasMissingIngredients = ingredients.Any(ingredient => !_db.Stocks.Any(item => item.Id == ingredient.StockId && item.Quantidade >= ingredient.Quantity));
        if (hasMissingIngredients)
        {
            lot.Status = LoteStatus.Pendente;
        }
        else
        {
            foreach (var ingredient in ingredients)
            {
                var stock = await _db.Stocks.FirstAsync(item => item.Id == ingredient.StockId);
                stock.Quantidade -= ingredient.Quantity;
            }
        }
        _db.Lotes.Add(lot); await _db.SaveChangesAsync();
        return Ok(ApiSuccess(new { lote = ToLotDto(lot) }));
    }

    private static string? ReadString(JsonElement payload, string propertyName)
    {
        if (!payload.TryGetProperty(propertyName, out var value)) return null;
        return value.ValueKind switch
        {
            JsonValueKind.String => value.GetString(),
            JsonValueKind.Number => value.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => null,
            _ => value.GetRawText()
        };
    }

    private static double ReadDouble(JsonElement payload, string propertyName)
    {
        if (!payload.TryGetProperty(propertyName, out var value)) return 0;
        return value.ValueKind switch
        {
            JsonValueKind.Number => value.GetDouble(),
            JsonValueKind.String => double.TryParse(value.GetString(), out var parsed) ? parsed : 0,
            _ => 0
        };
    }

    private static object ApiSuccess(object data) => new { success = true, data };
    private static object ApiError(string message) => new { success = false, message };
    private static object ToStockDto(IngredienteStock stock) => new { id = stock.Id, tipo = stock.Tipo, nome = stock.Nome, descricao = stock.Descricao, estoque = stock.Quantidade, unidade = stock.Unidade, preco_unitario = stock.PrecoUnitario, data_criacao = stock.DataCriacao };
    private static object[] ReadJsonArray(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<object>();
        try { return JsonSerializer.Deserialize<object[]>(json) ?? Array.Empty<object>(); }
        catch (JsonException) { return Array.Empty<object>(); }
    }

    private static List<StoredRecipeIngredient> ParseRecipeIngredients(string json, double lotVolume, double recipeVolume)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<StoredRecipeIngredient>();
        List<StoredRecipeIngredient> ingredients;
        try { ingredients = JsonSerializer.Deserialize<List<StoredRecipeIngredient>>(json) ?? new List<StoredRecipeIngredient>(); }
        catch (JsonException) { return new List<StoredRecipeIngredient>(); }
        var factor = recipeVolume > 0 ? lotVolume / recipeVolume : 1;
        return ingredients.Select(item => item with { Quantity = Math.Round(item.Quantity * factor, 2) }).ToList();
    }

    private static object ToRecipeDto(Receita recipe) => new { id = recipe.Id, nome = recipe.Nome, descricao = recipe.Descricao, estilo = recipe.Estilo, abv = recipe.Abv, ibu = recipe.Ibu, insumos = ReadJsonArray(recipe.InsumosJson), embalagem_tipo = recipe.Embalagem, volume_total = recipe.VolumeLitros };
    private static object ToSystemSettingsDto(ConfiguracaoSistema settings) => new { nomeEmpresa = settings.NomeEmpresa, cnpj = settings.Cnpj, endereco = settings.Endereco, cep = settings.Cep, valorFreteBase = settings.ValorFreteBase };
    private static object ToLotDto(Lote lot) => new { id = lot.Id, nome = lot.Nome, numero_lote = lot.Nome, receita_id = lot.ReceitaId, receita_nome = lot.ReceitaNome, insumos = ReadJsonArray(lot.InsumosJson), status = lot.Status == LoteStatus.Finalizado ? "finalizado" : lot.Status == LoteStatus.Pendente ? "pendente" : "em_producao", fase_atual = lot.FaseAtual.ToString().ToLowerInvariant(), volume_produzido = lot.QuantidadeLitros, vendido = lot.IsVendido, data_inicio = lot.DataCriacao, data_finalizacao = lot.DataFinalizacao };
    private static object ToSaleDto(Venda sale) => new { id = sale.Id, loteId = sale.LoteId, nome = sale.Nome, receitaNome = sale.ReceitaNome, volume = sale.Volume, valorUnitario = sale.ValorUnitario, aliquota = sale.Aliquota, imposto = sale.Imposto, frete = sale.Frete, total = sale.Total, cep = sale.Cep, localidade = string.Join(", ", new[] { sale.Localidade, string.IsNullOrWhiteSpace(sale.NumeroEndereco) ? null : $"nº {sale.NumeroEndereco}", sale.ComplementoEndereco }.Where(part => !string.IsNullOrWhiteSpace(part))), numeroEndereco = sale.NumeroEndereco, complementoEndereco = sale.ComplementoEndereco, distanciaKm = sale.DistanciaKm, empresaFrete = sale.EmpresaFrete, statusEntrega = sale.StatusEntrega, formaPagamento = sale.FormaPagamento, dataEntrega = sale.DataEntrega, data = sale.DataCriacao };
    private static object ToPurchaseRequestDto(SolicitacaoCompra request) => new
    {
        id = request.Id,
        lote_id = request.LoteId,
        numero = request.Numero,
        solicitante = request.Solicitante,
        data = request.DataCriacao,
        status = request.Status,
        observacao = request.Observacao,
        itens = request.Itens.Select(item => new
        {
            id = item.Id,
            insumoId = item.InsumoId,
            nome = item.Nome,
            quantidade = item.Quantidade,
            unidade = item.Unidade,
            valorUnitario = item.ValorUnitario,
            valorTotal = item.ValorTotal,
        })
    };
    private static string GeneratePurchaseRequestNumber()
    {
        var now = DateTime.UtcNow;
        return $"SOL-{now:yyyy}-{now:MMddHHmmss}";
    }
    private static async Task<string> NextId(IQueryable<string> ids)
    {
        var numbers = await ids.Select(id => id).ToListAsync();
        var next = numbers.Select(id => int.TryParse(id, out var number) ? number : 0).DefaultIfEmpty().Max() + 1;
        return next.ToString("D3");
    }

    public sealed record LoginRequest([property: JsonPropertyName("action")] string Action, [property: JsonPropertyName("email")] string Email, [property: JsonPropertyName("senha")] string Senha);
    public sealed record CreateUserRequest([property: JsonPropertyName("email")] string Email, [property: JsonPropertyName("senha")] string Senha);
    public sealed class SystemSettingsRequest
    {
        [JsonPropertyName("nomeEmpresa")] public string NomeEmpresa { get; set; } = string.Empty;
        [JsonPropertyName("cnpj")] public string Cnpj { get; set; } = string.Empty;
        [JsonPropertyName("endereco")] public string Endereco { get; set; } = string.Empty;
        [JsonPropertyName("cep")] public string Cep { get; set; } = string.Empty;
        [JsonPropertyName("valorFreteBase")] public double ValorFreteBase { get; set; } = 18;
    }
    public sealed class StockRequest
    {
        [JsonPropertyName("action")] public string Action { get; set; } = string.Empty;
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("insumo_id")] public string? InsumoId { get; set; }
        [JsonPropertyName("nome")] public string? Nome { get; set; } = string.Empty;
        [JsonPropertyName("tipo")] public string Tipo { get; set; } = "outro";
        [JsonPropertyName("descricao")] public string? Descricao { get; set; } = string.Empty;
        [JsonPropertyName("unidade")] public string Unidade { get; set; } = "kg";
        [JsonPropertyName("estoque")] public double Estoque { get; set; }
        [JsonPropertyName("preco")] public double Preco { get; set; }
        [JsonPropertyName("tipo_movimento")] public string TipoMovimento { get; set; } = "entrada";
        [JsonPropertyName("quantidade")] public double Quantidade { get; set; }
    }
    public sealed class RecipeRequest
    {
        [JsonPropertyName("action")] public string Action { get; set; } = string.Empty;
        [JsonPropertyName("id")] public string Id { get; set; } = string.Empty;
        [JsonPropertyName("nome")] public string Nome { get; set; } = string.Empty;
        [JsonPropertyName("descricao")] public string Descricao { get; set; } = string.Empty;
        [JsonPropertyName("estilo")] public string Estilo { get; set; } = string.Empty;
        [JsonPropertyName("embalagem_tipo")] public string EmbalagemTipo { get; set; } = "Barril";
        [JsonPropertyName("volume")] public double Volume { get; set; } = 20;
        [JsonPropertyName("abv")] public double Abv { get; set; }
        [JsonPropertyName("ibu")] public double Ibu { get; set; }
        [JsonPropertyName("custoBruto")] public double CustoBruto { get; set; }
        [JsonPropertyName("insumos")] public object[] Insumos { get; set; } = Array.Empty<object>();
    }

    public sealed class LotRequest
    {
        [JsonPropertyName("action")] public string Action { get; set; } = string.Empty;
        [JsonPropertyName("receita_id")] public string ReceitaId { get; set; } = string.Empty;
        [JsonPropertyName("numero_lote")] public string NumeroLote { get; set; } = string.Empty;
        [JsonPropertyName("volume_desejado")] public double VolumeDesejado { get; set; } = 20;
        [JsonPropertyName("lote_id")] public string LoteId { get; set; } = string.Empty;
        [JsonPropertyName("fase")] public string Fase { get; set; } = "planejamento";
        [JsonPropertyName("status")] public string Status { get; set; } = string.Empty;
    }

    public sealed class SaleRequest
    {
        [JsonPropertyName("loteIds")] public List<string> LoteIds { get; set; } = new();
        [JsonPropertyName("valorUnitario")] public double ValorUnitario { get; set; }
        [JsonPropertyName("aliquota")] public double Aliquota { get; set; }
        [JsonPropertyName("cep")] public string Cep { get; set; } = string.Empty;
        [JsonPropertyName("localidade")] public string Localidade { get; set; } = string.Empty;
        [JsonPropertyName("numeroEndereco")] public string NumeroEndereco { get; set; } = string.Empty;
        [JsonPropertyName("complementoEndereco")] public string ComplementoEndereco { get; set; } = string.Empty;
        [JsonPropertyName("distanciaKm")] public double DistanciaKm { get; set; }
        [JsonPropertyName("empresaFrete")] public string EmpresaFrete { get; set; } = string.Empty;
        [JsonPropertyName("frete")] public double Frete { get; set; }
    }

    public sealed class DeliveryRequest
    {
        [JsonPropertyName("action")] public string Action { get; set; } = string.Empty;
        [JsonPropertyName("formaPagamento")] public string? FormaPagamento { get; set; }
    }

    private sealed record StoredRecipeIngredient(
        [property: JsonPropertyName("stockId")] string StockId,
        [property: JsonPropertyName("quantidade")] double Quantity,
        [property: JsonPropertyName("nome")] string Nome,
        [property: JsonPropertyName("unidade")] string Unidade,
        [property: JsonPropertyName("precoUnitario")] double PrecoUnitario);
}
