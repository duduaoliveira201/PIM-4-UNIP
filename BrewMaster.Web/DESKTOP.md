# Aplicativo BrewMaster para Windows

O aplicativo desktop abre a mesma aplicação web dentro de uma janela do Windows.
Ele não contém acesso ao SQL Server: o navegador desktop acessa a aplicação web,
e a aplicação web utiliza a API central para todas as operações de dados. Assim,
as regras, telas, autenticação e atualizações continuam sendo as mesmas da versão
web.

## Servidor na rede local

1. Escolha um computador Windows da rede como servidor. Ele deve permanecer
   ligado durante o uso e ter acesso ao SQL Server.
2. Na pasta do projeto, execute `.\start-lan.ps1`. O script compila o frontend,
   publica a API junto com o site e inicia o servidor na porta TCP 5180. Não é
   necessário configurar um proxy separado.
3. Nos outros computadores conectados à mesma rede, abra no navegador um dos
   endereços IP exibidos pelo script, no formato `http://IP-DO-SERVIDOR:5180`.
   O aplicativo Windows também pode ser usado: no primeiro início, informe esse
   mesmo endereço. Para alterá-lo, use **BrewMaster > Configurar endereço do
   sistema**.

Todos os computadores usam o mesmo banco por meio da API do servidor. O banco e
sua string de conexão ficam somente no computador servidor; os clientes nunca se
conectam diretamente ao SQL Server. O servidor precisa permanecer ligado e os
clientes precisam estar na mesma rede. O sistema não oferece operação offline.

Se o Firewall do Windows bloquear outros computadores, abra um PowerShell como
administrador e execute:

```powershell
New-NetFirewallRule -DisplayName "BrewMaster LAN TCP 5180" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5180 -Profile Private
```

Depois, reinicie `start-lan.ps1` normalmente, sem executá-lo como administrador.

O modo local usa HTTP e não criptografa o tráfego entre computadores. Use-o
somente em uma rede local confiável. Para acesso pela internet ou em redes não
confiáveis, publique o sistema com HTTPS.

### Configurar o banco no computador servidor

O servidor usa `ConnectionStrings:DefaultConnection` em
`BrewMaster.Api/appsettings.json` e, se não houver valor, tenta a instância local
SQL Server LocalDB. Se o banco estiver em outro SQL Server, configure a variável
de ambiente `ConnectionStrings__DefaultConnection` no computador servidor antes
de iniciar `start-lan.ps1`. Não distribua essa configuração nos clientes.

## Página de download

A página pública `BrewMaster.Web/public/BrewMaster.Exe/index.html` é publicada
em `/BrewMaster.Exe/` e também fica acessível pelo link na tela de login. O
instalador fica ao lado da página como `BrewMaster-Setup.exe`.

## Gerar o instalador

Requer Node.js e npm instalados no computador de build:

```powershell
cd BrewMaster.Web
npm ci
npm run desktop:build
```

O instalador x64 NSIS será criado em `BrewMaster.Web/release-desktop` e copiado
para `BrewMaster.Web/public/BrewMaster.Exe/BrewMaster-Setup.exe`. O comando
compila novamente o frontend para incluir a página e o instalador em `dist`.

Para executar a janela desktop contra o servidor web local durante o
desenvolvimento:

```powershell
npm run dev
```

Em outro terminal:

```powershell
npm run desktop:dev
```

No modo de desenvolvimento, o endereço inicial é `http://localhost:5173`. O menu
do aplicativo permite trocar o endereço a qualquer momento.
