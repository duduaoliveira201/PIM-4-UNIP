using BrewMaster.Data;
using BrewMaster.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseWebRoot(Path.Combine(AppContext.BaseDirectory, "wwwroot"));

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=(localdb)\\MSSQLLocalDB;Database=BrewMaster;Trusted_Connection=True;TrustServerCertificate=True"));
builder.Services.AddScoped<BrewService>();
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options => options.Cookie.HttpOnly = true);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials().WithOrigins("http://localhost:5173")));
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await database.Database.MigrateAsync();
    await EnsureSalesSchemaAsync(database);
    await scope.ServiceProvider.GetRequiredService<BrewService>().SeedDefaultsAsync();
}

static async Task EnsureSalesSchemaAsync(AppDbContext database)
{
    await database.Database.ExecuteSqlRawAsync("IF COL_LENGTH('Lotes', 'IsVendido') IS NULL ALTER TABLE [Lotes] ADD [IsVendido] bit NOT NULL CONSTRAINT [DF_Lotes_IsVendido] DEFAULT 0;");
    await database.Database.ExecuteSqlRawAsync(@"
IF OBJECT_ID(N'[Vendas]', N'U') IS NULL
BEGIN
    CREATE TABLE [Vendas]
    (
        [Id] nvarchar(450) NOT NULL CONSTRAINT [PK_Vendas] PRIMARY KEY,
        [LoteId] nvarchar(450) NOT NULL,
        [Nome] nvarchar(max) NOT NULL,
        [ReceitaNome] nvarchar(max) NOT NULL,
        [Volume] float NOT NULL,
        [ValorUnitario] float NOT NULL,
        [Aliquota] float NOT NULL,
        [Imposto] float NOT NULL,
        [Frete] float NOT NULL,
        [Total] float NOT NULL,
        [Cep] nvarchar(max) NOT NULL,
        [EmpresaFrete] nvarchar(max) NOT NULL,
        [Localidade] nvarchar(max) NOT NULL CONSTRAINT [DF_Vendas_Localidade] DEFAULT '',
        [DistanciaKm] float NOT NULL CONSTRAINT [DF_Vendas_DistanciaKm] DEFAULT 0,
        [StatusEntrega] nvarchar(40) NOT NULL CONSTRAINT [DF_Vendas_StatusEntrega] DEFAULT 'aguardando_entrega',
        [FormaPagamento] nvarchar(40) NOT NULL CONSTRAINT [DF_Vendas_FormaPagamento] DEFAULT '',
        [DataEntrega] datetime2 NULL,
        [NumeroEndereco] nvarchar(max) NOT NULL CONSTRAINT [DF_Vendas_NumeroEndereco] DEFAULT '',
        [ComplementoEndereco] nvarchar(max) NOT NULL CONSTRAINT [DF_Vendas_ComplementoEndereco] DEFAULT '',
        [DataCriacao] datetime2 NOT NULL
    );
END;
IF COL_LENGTH('Vendas', 'Localidade') IS NULL ALTER TABLE [Vendas] ADD [Localidade] nvarchar(max) NOT NULL CONSTRAINT [DF_Vendas_Localidade_Alter] DEFAULT '';
IF COL_LENGTH('Vendas', 'DistanciaKm') IS NULL ALTER TABLE [Vendas] ADD [DistanciaKm] float NOT NULL CONSTRAINT [DF_Vendas_DistanciaKm_Alter] DEFAULT 0;
IF COL_LENGTH('Vendas', 'StatusEntrega') IS NULL ALTER TABLE [Vendas] ADD [StatusEntrega] nvarchar(40) NOT NULL CONSTRAINT [DF_Vendas_StatusEntrega_Alter] DEFAULT 'aguardando_entrega';
IF COL_LENGTH('Vendas', 'FormaPagamento') IS NULL ALTER TABLE [Vendas] ADD [FormaPagamento] nvarchar(40) NOT NULL CONSTRAINT [DF_Vendas_FormaPagamento_Alter] DEFAULT '';
IF COL_LENGTH('Vendas', 'DataEntrega') IS NULL ALTER TABLE [Vendas] ADD [DataEntrega] datetime2 NULL;
IF COL_LENGTH('Vendas', 'NumeroEndereco') IS NULL ALTER TABLE [Vendas] ADD [NumeroEndereco] nvarchar(max) NOT NULL CONSTRAINT [DF_Vendas_NumeroEndereco_Alter] DEFAULT '';
IF COL_LENGTH('Vendas', 'ComplementoEndereco') IS NULL ALTER TABLE [Vendas] ADD [ComplementoEndereco] nvarchar(max) NOT NULL CONSTRAINT [DF_Vendas_ComplementoEndereco_Alter] DEFAULT '';
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Vendas_LoteId' AND object_id = OBJECT_ID(N'[Vendas]'))
    CREATE UNIQUE INDEX [IX_Vendas_LoteId] ON [Vendas] ([LoteId]);");
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (builder.Configuration.GetValue("Hosting:EnableHttpsRedirection", true))
{
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseSession();
app.UseAuthorization();

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("{*path:nonfile}", "index.html");

app.Run();
