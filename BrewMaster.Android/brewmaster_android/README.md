# BrewMaster para Android (Flutter)

O aplicativo Android é feito em Flutter e abre o mesmo site que a aplicação web.
O site continua fazendo as chamadas `/api` à API ASP.NET Core; o aplicativo não
conecta diretamente ao SQL Server nem mantém uma implementação Android paralela
das telas ou regras de negócio.

## Servidor local

1. No computador Windows que hospeda o sistema, inicie `.\start-lan.ps1` na raiz
   do projeto BrewMaster. O computador precisa permanecer ligado.
2. O script exibe o endereço de rede, por exemplo `http://192.168.1.10:5180`.
3. Conecte o telefone Android à mesma rede Wi-Fi, instale/abra o aplicativo e
   informe esse endereço na primeira execução. Ele fica salvo no dispositivo e
   pode ser alterado no botão de configurações.
4. Entre no sistema usando a tela de login web existente. Os dados de todos os
   dispositivos passam pela API do computador servidor.

No primeiro download, o Android pode pedir autorização para instalar aplicativos
obtidos pelo navegador. Confirme a instalação do pacote BrewMaster depois de
verificar que o arquivo veio do endereço do seu servidor.

É necessário liberar a porta TCP 5180 no Firewall do Windows para a rede
privada quando outros dispositivos não conseguirem conectar. O modo local usa
HTTP; use-o somente em uma rede confiável. Para acesso pela internet ou em rede
não confiável, use um servidor HTTPS.

## Gerar APK

Instale Flutter stable, Android Studio/Android SDK e aceite as licenças Android.
A partir da raiz do repositório, execute:

```powershell
.\build-android.ps1
```

O script cria a configuração nativa Android Flutter se ainda não existir,
baixa as dependências, executa `flutter analyze` e `flutter test`, compila o APK,
publica-o na página `/BrewMaster.Android/` e recompila o frontend.

O APK universal será gerado em
`BrewMaster.Android/brewmaster_android/build/app/outputs/flutter-apk/app-release.apk`
e copiado para `BrewMaster.Web/public/BrewMaster.Android/BrewMaster.apk`, pronto
para distribuição. Para publicar a página e o aplicativo na rede local, depois
execute `.\start-lan.ps1` na raiz do repositório. O APK não é criado enquanto não
houver um SDK Flutter configurado no computador de build.

Requisitos de configuração Android:

- permissão `android.permission.INTERNET`;
- `android:usesCleartextTraffic="true"` para o endereço HTTP opcional do servidor
  local (`http://IP:5180`). Em implantações exclusivamente HTTPS, essa exceção
  pode ser removida;
- `applicationId`: `br.com.brewmaster.brewmaster_android`.

## Comportamento

- O primeiro início pede o endereço do site/API e salva-o localmente.
- A URL precisa usar HTTP(S), não aceita usuário/senha, query string ou fragmento.
- Links externos, como a página de download, abrem no navegador do Android.
- O login, as páginas e os dados são os da aplicação web/API existentes.
- A navegação voltar do Android percorre o histórico do site antes de fechar o app.
