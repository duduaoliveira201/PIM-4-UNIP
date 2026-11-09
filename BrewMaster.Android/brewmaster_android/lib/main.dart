import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

const _brandColor = Color(0xFF244B3E);
const _accentColor = Color(0xFFBAD179);
const _siteUrlPreferenceKey = 'brewmaster.siteUrl';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BrewMasterApp());
}

class BrewMasterApp extends StatelessWidget {
  const BrewMasterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BrewMaster',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: _brandColor),
        appBarTheme: const AppBarTheme(
          backgroundColor: _brandColor,
          foregroundColor: Colors.white,
        ),
        useMaterial3: true,
      ),
      home: const BrewMasterHome(),
    );
  }
}

class BrewMasterHome extends StatefulWidget {
  const BrewMasterHome({super.key});

  @override
  State<BrewMasterHome> createState() => _BrewMasterHomeState();
}

class _BrewMasterHomeState extends State<BrewMasterHome> {
  final _siteUrlController = TextEditingController();
  WebViewController? _webViewController;
  String? _siteUrl;
  String? _configurationError;
  int _progress = 0;
  bool _loadingSettings = true;
  bool _canGoBack = false;

  @override
  void initState() {
    super.initState();
    _loadSavedSiteUrl();
  }

  @override
  void dispose() {
    _siteUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadSavedSiteUrl() async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final savedSiteUrl = _normalizeSiteUrl(
        preferences.getString(_siteUrlPreferenceKey) ?? '',
      );
      if (!mounted) return;

      if (savedSiteUrl == null) {
        setState(() => _loadingSettings = false);
        return;
      }

      _siteUrlController.text = savedSiteUrl;
      _openSite(savedSiteUrl);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadingSettings = false;
        _configurationError =
            'Não foi possível carregar o endereço salvo: $error';
      });
    }
  }

  String? _normalizeSiteUrl(String value) {
    final parsed = Uri.tryParse(value.trim());
    if (parsed == null ||
        !parsed.hasAuthority ||
        parsed.host.isEmpty ||
        !const {'http', 'https'}.contains(parsed.scheme) ||
        parsed.userInfo.isNotEmpty ||
        parsed.hasQuery ||
        parsed.hasFragment) {
      return null;
    }

    final normalizedPath = parsed.path.replaceFirst(RegExp(r'/+$'), '');
    return parsed.replace(path: normalizedPath).toString().replaceFirst(
          RegExp(r'/$'),
          '',
        );
  }

  Future<void> _saveSiteUrl() async {
    final siteUrl = _normalizeSiteUrl(_siteUrlController.text);
    if (siteUrl == null) {
      setState(() {
        _configurationError =
            'Informe um endereço HTTP ou HTTPS válido, sem usuário, senha, parâmetros ou fragmentos.';
      });
      return;
    }

    try {
      final preferences = await SharedPreferences.getInstance();
      final saved = await preferences.setString(_siteUrlPreferenceKey, siteUrl);
      if (!saved) {
        throw StateError('O endereço não pôde ser salvo no dispositivo.');
      }
      _openSite(siteUrl);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _configurationError = 'Não foi possível salvar o endereço: $error';
      });
    }
  }

  void _openSite(String siteUrl) {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (!mounted) return;
            setState(() => _progress = progress);
          },
          onPageFinished: (_) => _refreshCanGoBack(),
          onWebResourceError: (error) {
            if (error.isForMainFrame == false || !mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Não foi possível conectar ao BrewMaster: ${error.description}',
                ),
                action: SnackBarAction(
                  label: 'Tentar novamente',
                  onPressed: _reloadSite,
                ),
              ),
            );
          },
          onNavigationRequest: (request) {
            final destination = Uri.tryParse(request.url);
            final origin = Uri.parse(siteUrl);
            if (destination == null) {
              return NavigationDecision.prevent;
            }
            if (destination.scheme == origin.scheme &&
                destination.host == origin.host &&
                destination.port == origin.port) {
              if (destination.path.toLowerCase().endsWith('.apk')) {
                _openExternalLink(destination);
                return NavigationDecision.prevent;
              }
              return NavigationDecision.navigate;
            }

            _openExternalLink(destination);
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(Uri.parse(siteUrl));

    setState(() {
      _siteUrl = siteUrl;
      _webViewController = controller;
      _configurationError = null;
      _loadingSettings = false;
      _progress = 0;
      _canGoBack = false;
    });
  }

  Future<void> _openExternalLink(Uri destination) async {
    if (!const {'http', 'https'}.contains(destination.scheme)) return;

    try {
      final opened = await launchUrl(
        destination,
        mode: LaunchMode.externalApplication,
      );
      if (!opened && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível abrir o link externo.'),
          ),
        );
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Falha ao abrir o link externo: $error')),
      );
    }
  }

  Future<void> _refreshCanGoBack() async {
    final controller = _webViewController;
    if (controller == null) return;
    final canGoBack = await controller.canGoBack();
    if (mounted) setState(() => _canGoBack = canGoBack);
  }

  Future<void> _reloadSite() async {
    final controller = _webViewController;
    if (controller == null) return;
    try {
      await controller.reload();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Não foi possível recarregar o sistema: $error')),
      );
    }
  }

  void _configureSite() {
    setState(() {
      _siteUrlController.text = _siteUrl ?? '';
      _siteUrl = null;
      _webViewController = null;
      _configurationError = null;
      _progress = 0;
      _canGoBack = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope<Object?>(
      canPop: !_canGoBack,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _canGoBack) {
          _webViewController?.goBack();
          _refreshCanGoBack();
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('BrewMaster'),
          actions: [
            if (_siteUrl != null) ...[
              IconButton(
                tooltip: 'Recarregar',
                onPressed: _reloadSite,
                icon: const Icon(Icons.refresh),
              ),
              IconButton(
                tooltip: 'Configurar servidor',
                onPressed: _configureSite,
                icon: const Icon(Icons.settings_outlined),
              ),
            ],
          ],
          bottom: _siteUrl != null && _progress < 100
              ? PreferredSize(
                  preferredSize: const Size.fromHeight(3),
                  child: LinearProgressIndicator(value: _progress / 100),
                )
              : null,
        ),
        body: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loadingSettings) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_webViewController case final controller?) {
      return WebViewWidget(controller: controller);
    }

    return SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.sports_bar_outlined,
                      size: 48,
                      color: _brandColor,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Conecte-se ao BrewMaster',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Informe o endereço do sistema na rede. Por exemplo: '
                      'http://192.168.1.10:5180. O aplicativo acessa o mesmo '
                      'site e a mesma API usados pelos outros dispositivos.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _siteUrlController,
                      keyboardType: TextInputType.url,
                      textInputAction: TextInputAction.go,
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'Endereço do servidor',
                        hintText: 'http://192.168.1.10:5180',
                        prefixIcon: Icon(Icons.link),
                        border: OutlineInputBorder(),
                      ),
                      onSubmitted: (_) => _saveSiteUrl(),
                    ),
                    if (_configurationError != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _configurationError!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: _accentColor,
                        foregroundColor: _brandColor,
                        padding: const EdgeInsets.all(14),
                      ),
                      onPressed: _saveSiteUrl,
                      icon: const Icon(Icons.open_in_browser),
                      label: const Text('Conectar ao BrewMaster'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
