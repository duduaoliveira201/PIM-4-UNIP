import { Component, useEffect, useState } from 'react';
import { Beer, Boxes, Building2, ChartNoAxesCombined, Download, Eye, EyeOff, FlaskConical, Factory, History, LayoutDashboard, LogOut, MapPinned, PackageCheck, Settings, ShieldCheck, ShoppingCart, Truck, UserCircle, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? '';

type ApiResponse<T> = { success: boolean; data: T };
type Stock = { id: string; nome: string; tipo: string; unidade: string; quantidade: number; descricao: string; precoUnitario: number };
type RecipeIngredient = { stockId: string; nome: string; quantidade: number; unidade: string; precoUnitario: number };
type Recipe = { id: string; nome: string; descricao: string; estilo: string; embalagem: string; volumeLitros: number; abv: number; ibu: number; tempoBrassagem: number; tempoFermentacao: number; insumos: RecipeIngredient[] };
type PurchaseRequestItem = { id: string; insumoId: string; nome: string; quantidade: number; unidade: string; valorUnitario: number; valorTotal: number };
type PurchaseRequest = { id: string; numero: string; loteId?: string; lote_id?: string; solicitante: string; data: string; status: 'pendente' | 'aprovada' | 'negada'; itens: PurchaseRequestItem[]; observacao?: string };
type LegacyLot = { id: string; nome: string; receitaNome?: string; status?: string; faseAtual?: string; quantidadeLitros?: number; dataCriacao?: string; dataFinalizacao?: string; numeroLote?: string; responsavel?: string; vendido?: boolean };
type LegacyLotResponse = { lotes?: LegacyLot[] };
type LotIngredientPlan = { nome: string; quantidade: number; unidade: string; disponivel: number; suficiente: boolean; stockId: string | null };
type SaleRecord = { id: string; loteId: string; nome: string; receitaNome: string; volume: number; valorUnitario: number; aliquota: number; imposto: number; frete: number; total: number; cep: string; localidade?: string; numeroEndereco?: string; complementoEndereco?: string; distanciaKm?: number; empresaFrete: string; statusEntrega?: 'aguardando_entrega' | 'em_entrega' | 'entregue'; formaPagamento?: string; dataEntrega?: string; data: string };
type FreightQuote = { company: string; price: number; eta: string };
type CepLocation = { cep: string; logradouro: string; bairro: string; localidade: string; uf: string };
type SystemSettings = { nomeEmpresa: string; cnpj: string; endereco: string; cep: string; valorFreteBase: number };
type SystemUser = { email: string };
type SettingsTab = 'brewery' | 'delivery' | 'users';
type CommercialReportPeriod = '15d' | 'month' | '3m' | '6m' | 'day' | 'year';
const EMPTY_SYSTEM_SETTINGS: SystemSettings = { nomeEmpresa: '', cnpj: '', endereco: '', cep: '', valorFreteBase: 18 };
type LegacyPage = 'dashboard' | 'stock' | 'stockCreate' | 'recipes' | 'production' | 'productionStock' | 'lots' | 'quality' | 'sales' | 'commercialReports' | 'deliveries' | 'myDeliveries' | 'history' | 'profile' | 'settings';
type LegacyMenuItem = { key: LegacyPage; label: string; icon: LucideIcon };
const LOT_PHASES = ['planejamento', 'brassagem', 'filtragem', 'fervura', 'resfriamento', 'fermentacao_maturacao', 'finalizado'];
const LOT_PHASE_LABELS: Record<string, string> = { planejamento: 'Planejamento', brassagem: 'Brassagem', filtragem: 'Filtragem', fervura: 'Fervura', resfriamento: 'Resfriamento', fermentacao_maturacao: 'Fermentação e maturação', finalizado: 'Finalizado' };

const legacyRoutes: Record<LegacyPage, string> = {
  dashboard: '/dashboard',
  stock: '/insumos',
  stockCreate: '/insumos/novo',
  recipes: '/receitas',
  production: '/producao',
  productionStock: '/estoque-producao',
  lots: '/lotes',
  quality: '/qualidade',
  sales: '/vendas',
  commercialReports: '/relatorios-comerciais',
  history: '/historico-vendas',
  deliveries: '/entregas',
  myDeliveries: '/minhas-entregas',
  profile: '/perfil',
  settings: '/configuracoes',
};

function pageFromPath(pathname: string): LegacyPage {
  if (pathname.toLowerCase() === '/insumos/novo') return 'stock';
  const match = (Object.entries(legacyRoutes) as [LegacyPage, string][]).find(([, route]) => route === pathname.toLowerCase());
  return match?.[0] ?? 'dashboard';
}

const legacyMenu: LegacyMenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'recipes', label: 'Receitas', icon: FlaskConical },
  { key: 'lots', label: 'Monitor de Lotes', icon: Boxes },
  { key: 'stock', label: 'Estoque', icon: Warehouse },
  { key: 'productionStock', label: 'Estoque Produção', icon: PackageCheck },
  { key: 'production', label: 'Produção', icon: Factory },
  { key: 'quality', label: 'Qualidade', icon: ShieldCheck },
  { key: 'sales', label: 'Vendas', icon: ShoppingCart },
  { key: 'commercialReports', label: 'Relatórios comerciais', icon: ChartNoAxesCombined },
  { key: 'history', label: 'Histórico', icon: History },
  { key: 'deliveries', label: 'Entregas', icon: Truck },
  { key: 'myDeliveries', label: 'Minhas entregas', icon: MapPinned },
  { key: 'profile', label: 'Perfil', icon: UserCircle },
  { key: 'settings', label: 'Configurações', icon: Settings },
];

type LegacyStock = Omit<Partial<Stock>, 'id'> & { estoque?: number; preco_unitario?: number; id?: number | string };
type LegacyRecipe = Omit<Partial<Recipe>, 'id'> & { embalagem_tipo?: string; volume_total?: number; estilo_cerveja?: string; tempo_brassagem?: number; tempo_fermentacao?: number; id?: number | string };
type LegacyLotData = { id?: number | string; nome?: string; numero_lote?: string; receita_nome?: string; status?: string; fase_atual?: string; volume_final?: number; volume_produzido?: number; data_inicio?: string; data_finalizacao?: string; responsavel?: string; vendido?: boolean };

class AppErrorBoundary extends Component<React.PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <main className="error-shell"><h1>Não foi possível abrir o painel.</h1><p>Atualize a página e tente novamente.</p></main>;
    }

    return this.props.children;
  }
}

function normalizeStock(stock: LegacyStock): Stock {
  const tipo = stock.tipo ? String(stock.tipo).trim().toLocaleLowerCase('pt-BR').replace(/^\p{L}/u, letter => letter.toLocaleUpperCase('pt-BR')) : 'Outro';
  const id = String(stock.id ?? crypto.randomUUID());
  return {
    id,
    nome: `${id} - ${stock.nome ?? 'Insumo sem nome'}`,
    tipo,
    unidade: stock.unidade ?? 'un',
    quantidade: Number(stock.quantidade ?? stock.estoque ?? 0),
    descricao: stock.descricao ?? '',
    precoUnitario: Number(stock.precoUnitario ?? stock.preco_unitario ?? 0),
  };
}

function normalizeRecipe(recipe: LegacyRecipe): Recipe {
  return {
    id: String(recipe.id ?? crypto.randomUUID()),
    nome: recipe.nome ?? 'Receita sem nome',
    descricao: recipe.descricao ?? '',
    estilo: recipe.estilo ?? recipe.estilo_cerveja ?? 'Não informado',
    embalagem: recipe.embalagem ?? recipe.embalagem_tipo ?? 'Não informado',
    volumeLitros: Number(recipe.volumeLitros ?? recipe.volume_total ?? 0),
    abv: Number(recipe.abv ?? 0),
    ibu: Number(recipe.ibu ?? 0),
    tempoBrassagem: Number(recipe.tempoBrassagem ?? recipe.tempo_brassagem ?? 60),
    tempoFermentacao: Number(recipe.tempoFermentacao ?? recipe.tempo_fermentacao ?? 14),
    insumos: Array.isArray(recipe.insumos) ? recipe.insumos as RecipeIngredient[] : [],
  };
}

function normalizeLot(lot: LegacyLotData): LegacyLot {
  return {
    id: String(lot.id ?? crypto.randomUUID()),
    nome: lot.nome ?? lot.numero_lote ?? `Lote #${lot.id ?? ''}`,
    numeroLote: lot.numero_lote,
    receitaNome: lot.receita_nome ?? 'Receita não informada',
    status: lot.status ?? 'planejamento',
    faseAtual: lot.fase_atual ?? lot.status ?? 'planejamento',
    quantidadeLitros: Number(lot.volume_produzido ?? lot.volume_final ?? 0),
    dataCriacao: lot.data_inicio,
    dataFinalizacao: lot.data_finalizacao,
    responsavel: lot.responsavel,
    vendido: lot.vendido,
  };
}

function getFreightQuotes(distanceKm: number, locality: string, companyName: string, originAddress: string, originCep: string, destinationAddress: string, pricePerKm: number): FreightQuote[] {
  const price = distanceKm * pricePerKm;
  const deliveryInfo = `${locality ? `${locality} · ` : ''}${distanceKm} km × R$ ${pricePerKm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/km · Origem: ${originAddress}, CEP ${formatCep(originCep)} · Destino: ${destinationAddress}`;
  const company = companyName.trim() ? `Frete próprio - ${companyName.trim()}` : 'Frete próprio da cervejaria';
  return [{ company, price: Number(price.toFixed(2)), eta: deliveryInfo }];
}

function distanceBetweenKm(latitude: number, longitude: number, originLatitude: number, originLongitude: number) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => value * Math.PI / 180;
  const deltaLatitude = toRadians(latitude - originLatitude);
  const deltaLongitude = toRadians(longitude - originLongitude);
  const originLatitudeRadians = toRadians(originLatitude);
  const destinationLatitudeRadians = toRadians(latitude);
  const haversine = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(originLatitudeRadians) * Math.cos(destinationLatitudeRadians) * Math.sin(deltaLongitude / 2) ** 2;
  return Math.round(2 * earthRadiusKm * Math.asin(Math.sqrt(haversine)) * 10) / 10;
}

async function resolveCepLocation(cep: string, signal: AbortSignal, addressOverride = '') {
  const address = await lookupCepAddress(cep, signal);
  try {
    const coordinatesResponse = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal });
    if (coordinatesResponse.ok) {
      const result = await coordinatesResponse.json() as {
        location?: { coordinates?: { latitude?: string | null; longitude?: string | null } | null } | null;
      };
      const latitudeValue = result.location?.coordinates?.latitude;
      const longitudeValue = result.location?.coordinates?.longitude;
      if (latitudeValue && longitudeValue) {
        const latitude = Number(latitudeValue);
        const longitude = Number(longitudeValue);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          return { address, latitude, longitude };
        }
      }
    }
  } catch (error) {
    if (signal.aborted) throw error;
  }

  const query = encodeURIComponent([addressOverride, address.logradouro, address.bairro, address.localidade, address.uf, address.cep, 'Brasil'].filter(Boolean).join(', '));
  const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${query}`, { signal });
  if (!geocodeResponse.ok) throw new Error('Não foi possível localizar as coordenadas do CEP para calcular o frete.');
  const geocode = await geocodeResponse.json() as Array<{ lat: string; lon: string }>;
  const latitude = Number(geocode[0]?.lat);
  const longitude = Number(geocode[0]?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Não foi possível localizar as coordenadas do CEP ${cep} para calcular o frete.`);
  }
  return { address, latitude, longitude };
}

async function lookupCepAddress(cep: string, signal: AbortSignal) {
  const cepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
  if (!cepResponse.ok) throw new Error('Não foi possível consultar o CEP.');
  const address = await cepResponse.json() as CepLocation & { erro?: boolean };
  if (address.erro) throw new Error(`CEP ${cep} não encontrado.`);
  return address;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options });
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) throw new Error(payload?.message ?? `API respondeu ${response.status}`);
  return payload as T;
}

const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function localDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const BEER_STYLES = [
  'Pilsen',
  'Lager',
  'American Lager',
  'IPA',
  'APA',
  'Witbier',
  'Weiss',
  'Stout',
  'Porter',
  'Sour',
  'Catharina Sour',
  'Session IPA',
  'Double IPA',
  'Belgian Blonde',
  'Bock'
];

const BEER_STYLE_INGREDIENTS: Record<string, string[]> = {
  'Pilsen': ['Malte Pilsen', 'Lúpulo Saaz', 'Levedura Lager'],
  'Lager': ['Malte Pilsen', 'Lúpulo Heradura', 'Levedura Lager'],
  'American Lager': ['Malte 2-Row', 'Lúpulo Cluster', 'Levedura Lager'],
  'IPA': ['Malte 2-Row', 'Lúpulo Cascade', 'Levedura Ale'],
  'APA': ['Malte 2-Row', 'Lúpulo Centennial', 'Levedura Ale'],
  'Witbier': ['Malte Trigo', 'Lúpulo Hallertau', 'Levedura Weizen'],
  'Weiss': ['Malte Trigo', 'Lúpulo Hallertau', 'Levedura Weizen'],
  'Stout': ['Malte Roasted', 'Lúpulo Fuggle', 'Levedura Ale'],
  'Porter': ['Malte Chocolate', 'Lúpulo Fuggle', 'Levedura Ale'],
  'Sour': ['Malte Pilsen', 'Lúpulo Hallertau', 'Levedura Sour'],
  'Catharina Sour': ['Malte Pilsen', 'Lúpulo Hallertau', 'Levedura Sour'],
  'Session IPA': ['Malte 2-Row', 'Lúpulo Cascade', 'Levedura Ale'],
  'Double IPA': ['Malte 2-Row', 'Lúpulo Simcoe', 'Levedura Ale'],
  'Belgian Blonde': ['Malte Pilsen', 'Lúpulo Hallertau', 'Levedura Belga'],
  'Bock': ['Malte Munich', 'Lúpulo Hallertau', 'Levedura Lager']
};

const CONTAINER_TYPES = [
  { name: 'Garrafa 600ml', volume: 0.6, unitsPerCase: 24 },
  { name: 'Lata 350ml', volume: 0.35, unitsPerCase: 12 },
  { name: 'Litro 1L', volume: 1, unitsPerCase: 16 },
  { name: 'LongNeck 600ml', volume: 0.6, unitsPerCase: 24 }
];

const calculatePackaging = (recipeVolume: number, containerVolume: number, unitsPerCase: number) => {
  const units = Math.ceil(recipeVolume / containerVolume);
  const cases = Math.ceil(units / unitsPerCase);
  const paletes = Math.ceil(cases / 40);
  return { units, cases, paletes };
};

type DashboardViewProps = {
  email: string;
  stocks: Stock[];
  recipes: Recipe[];
  lots: LegacyLot[];
  purchaseRequests: PurchaseRequest[];
  salesRecords: SaleRecord[];
  loading: boolean;
  onNavigate: (page: LegacyPage) => void;
};

function DashboardView({ email, stocks, recipes, lots, purchaseRequests, salesRecords, loading, onNavigate }: DashboardViewProps) {
  const isFinished = (lot: LegacyLot) => [lot.status, lot.faseAtual].some(value => String(value ?? '').toLowerCase() === 'finalizado');
  const activeLots = lots.filter(lot => !isFinished(lot));
  const finishedLots = lots.filter(isFinished);
  const pendingLots = lots.filter(lot => String(lot.status ?? '').toLowerCase() === 'pendente');
  const criticalStocks = stocks.filter(stock => stock.quantidade <= 5);
  const totalStockValue = stocks.reduce((total, stock) => total + stock.quantidade * stock.precoUnitario, 0);
  const availableVolume = finishedLots.filter(lot => !lot.vendido).reduce((total, lot) => total + Number(lot.quantidadeLitros ?? 0), 0);
  const producedVolume = lots.reduce((total, lot) => total + Number(lot.quantidadeLitros ?? 0), 0);
  const revenue = salesRecords.reduce((total, sale) => total + sale.total, 0);
  const freightTotal = salesRecords.reduce((total, sale) => total + sale.frete, 0);
  const averageTicket = salesRecords.length ? revenue / salesRecords.length : 0;
  const approvedRequests = purchaseRequests.filter(request => request.status === 'aprovada');
  const stockByType = [...new Set(stocks.map(stock => stock.tipo))].map(type => ({
    type,
    amount: stocks.filter(stock => stock.tipo === type).reduce((total, stock) => total + stock.quantidade, 0),
  })).sort((left, right) => right.amount - left.amount).slice(0, 6);
  const maxStockAmount = Math.max(...stockByType.map(item => item.amount), 1);
  const phaseCounts = LOT_PHASES.map(phase => ({ phase, count: lots.filter(lot => String(lot.faseAtual ?? lot.status ?? '').toLowerCase() === phase).length })).filter(item => item.count > 0);
  const phaseLabel = (phase: string) => LOT_PHASE_LABELS[phase] ?? phase.replace('_', ' ');

  return <section className="dashboard-overview">
    <div className="dashboard-welcome"><div><span className="dashboard-eyebrow">Centro de comando</span><h2>Olá, {email.split('@')[0]}.</h2><p>Uma leitura completa da operação da sua cervejaria.</p></div><div className="dashboard-status"><span className="status-dot" />{loading ? 'Sincronizando dados' : 'Dados atualizados'}{!loading && <small>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>}</div></div>
    <div className="dashboard-kpis dashboard-kpis-expanded"><article className="dashboard-kpi blue"><div><FlaskConical size={20} /></div><span>Receitas</span><strong>{recipes.length}</strong><small>{recipes.filter(recipe => recipe.insumos.length > 0).length} com insumos definidos</small></article><article className="dashboard-kpi orange"><div><Factory size={20} /></div><span>Lotes ativos</span><strong>{activeLots.length}</strong><small>{pendingLots.length} aguardando atenção</small></article><article className="dashboard-kpi green"><div><Warehouse size={20} /></div><span>Valor em estoque</span><strong>R$ {totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><small>{stocks.length} insumos cadastrados</small></article><article className="dashboard-kpi purple"><div><ShoppingCart size={20} /></div><span>Faturamento</span><strong>R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><small>{salesRecords.length} vendas concluídas</small></article><article className="dashboard-kpi teal"><div><PackageCheck size={20} /></div><span>Volume pronto</span><strong>{availableVolume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong><small>{finishedLots.length} lotes finalizados</small></article></div>
    <div className="dashboard-main-grid"><section className="dashboard-panel dashboard-stock-panel"><div className="dashboard-panel-heading"><div><span className="panel-kicker">Inventário</span><h3>Distribuição do estoque</h3></div><button type="button" onClick={() => onNavigate('stock')}>Ver estoque</button></div>{stockByType.length === 0 ? <div className="dashboard-empty">Nenhum insumo cadastrado.</div> : <div className="dashboard-bars">{stockByType.map(item => <div className="dashboard-bar-row" key={item.type}><div><strong>{item.type}</strong><span>{item.amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} unidades</span></div><div className="dashboard-bar-track"><i style={{ width: `${Math.max(5, item.amount / maxStockAmount * 100)}%` }} /></div></div>)}</div>}</section><section className="dashboard-panel"><div className="dashboard-panel-heading"><div><span className="panel-kicker">Produção</span><h3>Andamento dos lotes</h3></div><button type="button" onClick={() => onNavigate('lots')}>Monitorar</button></div><div className="dashboard-phase-list">{phaseCounts.length === 0 ? <div className="dashboard-empty">Nenhum lote registrado.</div> : phaseCounts.map(item => <div key={item.phase}><span>{phaseLabel(item.phase)}</span><strong>{item.count}</strong></div>)}</div><div className="dashboard-production-summary"><span>Volume produzido</span><strong>{producedVolume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong></div></section></div>
    <div className="dashboard-main-grid dashboard-secondary-grid"><section className="dashboard-panel"><div className="dashboard-panel-heading"><div><span className="panel-kicker">Comercial</span><h3>Desempenho de vendas</h3></div><button type="button" onClick={() => onNavigate('history')}>Ver histórico</button></div><div className="dashboard-sales-metrics"><div><span>Ticket médio</span><strong>R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div><span>Frete cobrado</span><strong>R$ {freightTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div><span>Volume vendido</span><strong>{salesRecords.reduce((total, sale) => total + sale.volume, 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong></div></div>{salesRecords.length === 0 ? <div className="dashboard-empty">As vendas concluídas aparecerão aqui.</div> : <div className="dashboard-recent-list">{salesRecords.slice(0, 4).map(sale => <div key={sale.id}><div><strong>{sale.nome}</strong><span>{sale.localidade ?? sale.cep} · {new Date(sale.data).toLocaleDateString('pt-BR')}</span></div><b>R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></div>)}</div>}</section><section className="dashboard-panel dashboard-alert-panel"><div className="dashboard-panel-heading"><div><span className="panel-kicker">Atenção</span><h3>Pontos de controle</h3></div><button type="button" onClick={() => onNavigate('quality')}>Ver análise</button></div><div className="dashboard-alert-list"><div className={criticalStocks.length ? 'alert-warning' : 'alert-ok'}><strong>{criticalStocks.length}</strong><span>insumos em nível crítico</span></div><div className={pendingLots.length ? 'alert-warning' : 'alert-ok'}><strong>{pendingLots.length}</strong><span>lotes pendentes</span></div><div className={purchaseRequests.filter(request => request.status === 'pendente').length ? 'alert-warning' : 'alert-ok'}><strong>{purchaseRequests.filter(request => request.status === 'pendente').length}</strong><span>compras aguardando aprovação</span></div><div className="alert-info"><strong>{approvedRequests.length}</strong><span>compras aprovadas</span></div></div></section></div>
  </section>;
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [lots, setLots] = useState<LegacyLot[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [requestTab, setRequestTab] = useState<'pendentes' | 'aprovadas'>('pendentes');
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [page, setPage] = useState<'dashboard' | 'legacy'>('legacy');
  const [legacyPage, setLegacyPage] = useState<LegacyPage>(() => pageFromPath(window.location.pathname));
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeStyle, setRecipeStyle] = useState('Todos');
  const [recipeView, setRecipeView] = useState<'grid' | 'table'>('grid');
  const [recipeFormOpen, setRecipeFormOpen] = useState(false);
  const [recipeEditingId, setRecipeEditingId] = useState<string | null>(null);
  const [recipeSelectedContainer, setRecipeSelectedContainer] = useState('Garrafa 600ml');
  const [recipeDraft, setRecipeDraft] = useState({ nome: '', estilo: '', volume: '20', abv: '5', ibu: '20', embalagem_tipo: 'Barril' });
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [recipeIngredientQuantityDrafts, setRecipeIngredientQuantityDrafts] = useState<string[]>([]);
  const [recipeIngredientSearch, setRecipeIngredientSearch] = useState('');
  const [recipeTotalCost, setRecipeTotalCost] = useState(0);
  const [lotTab, setLotTab] = useState<'active' | 'finished'>('active');
  const [lotSearch, setLotSearch] = useState('');
  const [lotView, setLotView] = useState<'grid' | 'table'>('grid');
  const [lotFormOpen, setLotFormOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<LegacyLot | null>(null);
  const [lotDraft, setLotDraft] = useState({ receita_id: '', numero_lote: '', volume_desejado: '20' });
  const [lotRequiredIngredients, setLotRequiredIngredients] = useState<LotIngredientPlan[]>([]);
  const [lotStockWarning, setLotStockWarning] = useState('');
  const [saleDraft, setSaleDraft] = useState({ loteId: '', valorUnitario: '0', cep: '', numeroEndereco: '', complementoEndereco: '', aliquota: '12', empresaFrete: '' });
  const [saleSelectedLotIds, setSaleSelectedLotIds] = useState<string[]>([]);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleLocation, setSaleLocation] = useState<CepLocation | null>(null);
  const [saleAddressPreview, setSaleAddressPreview] = useState<CepLocation | null>(null);
  const [saleAddressStatus, setSaleAddressStatus] = useState('');
  const [saleDistanceKm, setSaleDistanceKm] = useState(0);
  const [saleLocationLoading, setSaleLocationLoading] = useState(false);
  const [saleLocationError, setSaleLocationError] = useState('');
  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(EMPTY_SYSTEM_SETTINGS);
  const [settingsDraft, setSettingsDraft] = useState<SystemSettings>(EMPTY_SYSTEM_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState('');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('brewery');
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersStatus, setUsersStatus] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserStatus, setNewUserStatus] = useState('');
  const [settingsCepStatus, setSettingsCepStatus] = useState('');
  const [settingsCepLookupRequested, setSettingsCepLookupRequested] = useState(false);
  const [commercialReportPeriod, setCommercialReportPeriod] = useState<CommercialReportPeriod>('month');
  const [commercialReportDay, setCommercialReportDay] = useState(() => localDateInputValue(new Date()));
  const [commercialReportYear, setCommercialReportYear] = useState(String(new Date().getFullYear()));
  const [reportExportStatus, setReportExportStatus] = useState('');
  const [deliveryPayments, setDeliveryPayments] = useState<Record<string, string>>({});
  const [stockSearch, setStockSearch] = useState('');
  const [stockType, setStockType] = useState('Malte');
  const [stockView, setStockView] = useState<'grid' | 'table'>('grid');
  const [stockFormOpen, setStockFormOpen] = useState(() => window.location.pathname.toLowerCase() === '/insumos/novo');
  const [stockEditingId, setStockEditingId] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState({ nome: '', tipo: 'Malte', descricao: '', estoque: '0', unidade: 'kg', preco: '0' });
  const [movementSearch, setMovementSearch] = useState('');
  const [movementStock, setMovementStock] = useState<Stock | null>(null);
  const [movementDraft, setMovementDraft] = useState({ tipo_movimento: 'entrada', quantidade: '1', motivo: '', custo_unitario: '0' });

  function navigateLegacy(nextPage: LegacyPage, replace = false) {
    const route = legacyRoutes[nextPage];
    window.history[replace ? 'replaceState' : 'pushState']({}, '', route);
    setLegacyPage(nextPage === 'stockCreate' ? 'stock' : nextPage);
    setStockFormOpen(nextPage === 'stockCreate');
  }

  useEffect(() => {
    api<ApiResponse<{ autenticado: boolean; admin: boolean }>>('/api/auth')
      .then(result => {
        setAuthenticated(result.data.autenticado);
        setIsAdmin(result.data.admin);
      })
      .catch(() => {
        setAuthenticated(false);
        setIsAdmin(false);
      });
  }, []);

  useEffect(() => {
    const cep = settingsDraft.cep.replace(/\D/g, '');
    if (!settingsCepLookupRequested || cep.length !== 8) {
      if (settingsCepLookupRequested && cep.length < 8) setSettingsCepStatus('');
      return;
    }

    const controller = new AbortController();
    setSettingsCepStatus('Consultando CEP...');
    lookupCepAddress(cep, controller.signal)
      .then(address => {
        const formattedAddress = [address.logradouro, address.bairro, [address.localidade, address.uf].filter(Boolean).join('/')].filter(Boolean).join(', ');
        setSettingsDraft(current => current.cep.replace(/\D/g, '') === cep
          ? { ...current, endereco: formattedAddress }
          : current);
        setSettingsCepStatus(formattedAddress ? 'Endereço localizado e preenchido.' : 'CEP localizado, mas sem endereço detalhado.');
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setSettingsCepStatus(error instanceof Error ? error.message : 'Não foi possível consultar o CEP.');
      });

    return () => controller.abort();
  }, [settingsDraft.cep, settingsCepLookupRequested]);

  useEffect(() => {
    const cep = saleDraft.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      setSaleAddressPreview(null);
      setSaleAddressStatus('');
      return;
    }

    const controller = new AbortController();
    setSaleAddressStatus('Consultando endereço de entrega...');
    lookupCepAddress(cep, controller.signal)
      .then(address => {
        setSaleAddressPreview(address);
        setSaleAddressStatus('Endereço de entrega localizado.');
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setSaleAddressPreview(null);
        setSaleAddressStatus(error instanceof Error ? error.message : 'Não foi possível consultar o CEP de entrega.');
      });

    return () => controller.abort();
  }, [saleDraft.cep]);

  useEffect(() => {
    const handleHistoryChange = () => {
      const nextPage = pageFromPath(window.location.pathname);
      setLegacyPage(nextPage);
      setStockFormOpen(window.location.pathname.toLowerCase() === '/insumos/novo');
    };
    window.addEventListener('popstate', handleHistoryChange);
    return () => window.removeEventListener('popstate', handleHistoryChange);
  }, []);

  useEffect(() => {
    const destinationCep = saleDraft.cep.replace(/\D/g, '');
    const originCep = systemSettings.cep.replace(/\D/g, '');
    if (destinationCep.length !== 8) {
      setSaleLocation(null);
      setSaleDistanceKm(0);
      setSaleLocationError('');
      setSaleLocationLoading(false);
      return;
    }
    if (originCep.length !== 8) {
      setSaleLocation(null);
      setSaleDistanceKm(0);
      setSaleLocationError('Cadastre o CEP de origem em Configurações para calcular o frete.');
      setSaleLocationLoading(false);
      return;
    }

    const controller = new AbortController();
    setSaleLocationLoading(true);
    setSaleLocationError('');
    Promise.all([
      resolveCepLocation(destinationCep, controller.signal),
      resolveCepLocation(originCep, controller.signal, systemSettings.endereco),
    ])
      .then(([destination, origin]) => {
        setSaleLocation(destination.address);
        setSaleDistanceKm(distanceBetweenKm(destination.latitude, destination.longitude, origin.latitude, origin.longitude));
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setSaleLocation(null);
        setSaleDistanceKm(0);
        setSaleLocationError(error instanceof Error ? error.message : 'Não foi possível consultar o CEP.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setSaleLocationLoading(false);
      });

    return () => controller.abort();
  }, [saleDraft.cep, systemSettings.cep, systemSettings.endereco]);

  async function syncData() {
    setLoading(true);
    try {
      const [stockResult, recipeResult, lotResult, requestResult, salesResult, settingsResult] = await Promise.all([
      api<ApiResponse<LegacyStock[]>>('/api/insumos'),
      api<ApiResponse<LegacyRecipe[]>>('/api/receitas'),
      api<ApiResponse<LegacyLot[]>>('/api/lotes'),
      api<ApiResponse<PurchaseRequest[]>>('/api/solicitacoes').catch(() => ({ success: true, data: [] })),
      api<ApiResponse<SaleRecord[]>>('/api/vendas').catch(() => ({ success: true, data: [] })),
      api<ApiResponse<SystemSettings>>('/api/configuracoes').catch(() => ({ success: true, data: EMPTY_SYSTEM_SETTINGS })),
      ]);
      setStocks((stockResult.data ?? []).map(normalizeStock));
      setRecipes((recipeResult.data ?? []).map(normalizeRecipe));
      setLots((lotResult.data ?? []).map(normalizeLot));
      setPurchaseRequests(requestResult.data ?? []);
      setSalesRecords(salesResult.data ?? []);
      const loadedSettings = { ...EMPTY_SYSTEM_SETTINGS, ...(settingsResult.data ?? {}) };
      setSystemSettings(loadedSettings);
      setSettingsDraft(loadedSettings);
      setLastSync(new Date());
    } catch {
      setError('Não foi possível carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) syncData();
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated || !isAdmin || legacyPage !== 'settings' || settingsTab !== 'users') return;
    setUsersLoading(true);
    setUsersStatus('');
    api<ApiResponse<SystemUser[]>>('/api/usuarios')
      .then(result => setSystemUsers(result.data))
      .catch(loadError => setUsersStatus(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os usuários.'))
      .finally(() => setUsersLoading(false));
  }, [authenticated, isAdmin, legacyPage, settingsTab]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const result = await api<ApiResponse<{ admin: boolean }> & { message?: string }>('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, senha: password }),
      });
      if (!result.success) throw new Error(result.message ?? 'Credenciais inválidas');
      setIsAdmin(result.data.admin);
      if (!result.data.admin) setSettingsTab('brewery');
      setAuthenticated(true);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Falha no login.');
    }
  }

  async function logout() {
    await api('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout', email: '', senha: '' }) });
    setAuthenticated(false);
    setIsAdmin(false);
    setSettingsTab('brewery');
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setNewUserStatus('');
    try {
      const result = await api<ApiResponse<{ email: string }>>('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserEmail, senha: newUserPassword }),
      });
      setSystemUsers(current => current.some(user => user.email.toLowerCase() === result.data.email.toLowerCase())
        ? current
        : [...current, { email: result.data.email }].sort((left, right) => left.email.localeCompare(right.email)));
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserStatus('Usuário criado com sucesso.');
    } catch (createError) {
      setNewUserStatus(createError instanceof Error ? createError.message : 'Não foi possível criar o usuário.');
    }
  }

  async function saveSystemSettings(event: React.FormEvent) {
    event.preventDefault();
    setSettingsStatus('');
    try {
      const result = await api<ApiResponse<SystemSettings>>('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsDraft),
      });
      setSystemSettings(result.data);
      setSettingsDraft(result.data);
      setSettingsStatus('Configurações salvas.');
      setSettingsCepLookupRequested(false);
      setError('');
    } catch (settingsError) {
      setSettingsStatus(settingsError instanceof Error ? settingsError.message : 'Não foi possível salvar as configurações.');
    }
  }

  async function deleteRecipe(recipeId: string) {
    if (!window.confirm('Deseja excluir esta receita?')) return;
    try {
      const result = await api<ApiResponse<{ id: string }>>(`/api/receitas/${recipeId}`, { method: 'DELETE' });
      if (!result.success) {
        throw new Error('A exclusão não foi concluída.');
      }
      setRecipes(current => current.filter(recipe => recipe.id !== recipeId));
      setError('');
    } catch {
      setError('Não foi possível excluir a receita.');
    }
  }

  async function createRecipe(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!recipeDraft.nome.trim()) {
      setError('Informe o nome da receita antes de salvar.');
      return;
    }

    if (!recipeDraft.estilo) {
      setError('Selecione um estilo de cerveja antes de salvar a receita.');
      return;
    }

    try {
      const result = await api<ApiResponse<{ id: string }>>('/api/receitas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'criar', ...recipeDraft, embalagem_tipo: recipeSelectedContainer, volume: Number(recipeDraft.volume), abv: Number(recipeDraft.abv), ibu: Number(recipeDraft.ibu), custoBruto: recipeTotalCost, insumos: recipeIngredients }) });
      setRecipes(current => [...current, normalizeRecipe({ id: result.data.id, nome: recipeDraft.nome, estilo: recipeDraft.estilo, volume_total: Number(recipeDraft.volume), abv: Number(recipeDraft.abv), ibu: Number(recipeDraft.ibu), embalagem_tipo: recipeDraft.embalagem_tipo, insumos: recipeIngredients })]);
      setRecipeDraft({ nome: '', estilo: '', volume: '20', abv: '5', ibu: '20', embalagem_tipo: 'Barril' });
      setRecipeIngredients([]);
      setRecipeIngredientQuantityDrafts([]);
      setRecipeTotalCost(0);
      setRecipeFormOpen(false);
    } catch {
      setError('Não foi possível criar a receita.');
    }
  }

  function addRecipeIngredient(stock: Stock, quantidade: number) {
    if (quantidade <= 0) return;
    const newIngredient: RecipeIngredient = {
      stockId: stock.id,
      nome: stock.nome,
      quantidade,
      unidade: stock.unidade,
      precoUnitario: stock.precoUnitario
    };
    setRecipeIngredients(current => [...current, newIngredient]);
    setRecipeIngredientQuantityDrafts(current => [...current, String(quantidade)]);
    setRecipeTotalCost(current => current + (quantidade * stock.precoUnitario));
  }

  function removeRecipeIngredient(index: number) {
    const ingredient = recipeIngredients[index];
    if (!ingredient) return;
    const cost = ingredient.quantidade * ingredient.precoUnitario;
    setRecipeIngredients(current => current.filter((_, i) => i !== index));
    setRecipeIngredientQuantityDrafts(current => current.filter((_, i) => i !== index));
    setRecipeTotalCost(current => current - cost);
  }

  function updateRecipeIngredientQuantity(index: number, newQuantity: number) {
    if (!Number.isFinite(newQuantity) || newQuantity < 0) return;
    const ingredient = recipeIngredients[index];
    if (!ingredient) return;
    const oldCost = ingredient.quantidade * ingredient.precoUnitario;
    const newCost = newQuantity * ingredient.precoUnitario;

    const updatedIngredients = [...recipeIngredients];
    updatedIngredients[index] = { ...ingredient, quantidade: newQuantity };
    setRecipeIngredients(updatedIngredients);
    setRecipeTotalCost(current => current - oldCost + newCost);
  }

  function autoPopulateIngredientsForStyle(style: string) {
    const ingredientNames = BEER_STYLE_INGREDIENTS[style] || [];
    const volumeLiters = Number(recipeDraft.volume || 0);
    const newIngredients: RecipeIngredient[] = [];
    let newCost = 0;

    ingredientNames.forEach((ingredientName, index) => {
      const matchingStock = stocks.find(stock => {
        const stockName = normalizeText(stock.nome);
        const styleIngredient = normalizeText(ingredientName);
        return stockName.includes(styleIngredient) || styleIngredient.includes(stockName);
      });

      if (matchingStock) {
        const baseFactor = [0.18, 0.14, 0.09][index % 3] ?? 0.08;
        const quantity = Number((volumeLiters * baseFactor).toFixed(2));
        const finalQuantity = quantity > 0 ? quantity : 0.1;

        newIngredients.push({
          stockId: matchingStock.id,
          nome: matchingStock.nome,
          quantidade: finalQuantity,
          unidade: matchingStock.unidade,
          precoUnitario: matchingStock.precoUnitario,
        });
        newCost += finalQuantity * matchingStock.precoUnitario;
      }
    });

    setRecipeIngredients(newIngredients);
    setRecipeIngredientQuantityDrafts(newIngredients.map(ingredient => String(ingredient.quantidade)));
    setRecipeTotalCost(newCost);
  }

  function openRecipeForm(recipe?: Recipe) {
    setRecipeEditingId(recipe?.id ?? null);
    setRecipeSelectedContainer(recipe?.embalagem ?? 'Garrafa 600ml');
    const ingredients = recipe?.insumos ?? [];
    setRecipeIngredients(ingredients);
    setRecipeIngredientQuantityDrafts(ingredients.map(ingredient => String(ingredient.quantidade)));
    setRecipeTotalCost(ingredients.reduce((total, ingredient) => total + ingredient.quantidade * ingredient.precoUnitario, 0));
    setRecipeIngredientSearch('');
    setRecipeDraft(recipe ? { nome: recipe.nome, estilo: recipe.estilo, volume: String(recipe.volumeLitros), abv: String(recipe.abv), ibu: String(recipe.ibu), embalagem_tipo: recipe.embalagem } : { nome: '', estilo: '', volume: '20', abv: '5', ibu: '20', embalagem_tipo: 'Barril' });
    setRecipeFormOpen(true);
  }

  async function updateRecipe(event: React.FormEvent) {
    event.preventDefault();
    if (!recipeEditingId) return;

    if (!recipeDraft.nome.trim()) {
      setError('Informe o nome da receita antes de salvar.');
      return;
    }

    try {
      await api('/api/receitas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'atualizar', id: recipeEditingId, receita_id: recipeEditingId, ...recipeDraft, embalagem_tipo: recipeSelectedContainer, volume: Number(recipeDraft.volume), abv: Number(recipeDraft.abv), ibu: Number(recipeDraft.ibu), insumos: recipeIngredients }) });
      setRecipes(current => current.map(recipe => recipe.id === recipeEditingId ? normalizeRecipe({ id: recipeEditingId, nome: recipeDraft.nome, estilo: recipeDraft.estilo, embalagem_tipo: recipeDraft.embalagem_tipo, volume_total: Number(recipeDraft.volume), abv: Number(recipeDraft.abv), ibu: Number(recipeDraft.ibu), insumos: recipeIngredients }) : recipe));
      setRecipeFormOpen(false);
      setRecipeEditingId(null);
    } catch {
      setError('Não foi possível atualizar a receita.');
    }
  }

  function getLotIngredientPlan(recipeId: string, volumeLiters: number): LotIngredientPlan[] {
    const recipe = recipes.find(item => item.id === recipeId);
    if (!recipe) return [];

    const recipeIngredients = recipe.insumos.length ? recipe.insumos : (BEER_STYLE_INGREDIENTS[recipe.estilo] ?? []).map((nome, index) => ({ stockId: '', nome, quantidade: 0, unidade: 'kg', precoUnitario: 0 }));
    return recipeIngredients.map((recipeIngredient, index) => {
      const ingredientName = recipeIngredient.nome;
      const stock = stocks.find(item => {
        if (recipeIngredient.stockId && item.id === recipeIngredient.stockId) return true;
        const itemName = normalizeText(item.nome);
        const ingredient = normalizeText(ingredientName);
        return itemName.includes(ingredient) || ingredient.includes(itemName);
      });

      const baseFactor = [0.18, 0.14, 0.09][index % 3] ?? 0.08;
      const requiredAmount = recipeIngredient.quantidade > 0
        ? Number((recipeIngredient.quantidade * (volumeLiters / (recipe.volumeLitros || volumeLiters))).toFixed(2))
        : Number((volumeLiters * baseFactor).toFixed(2));
      const normalizedAmount = requiredAmount > 0 ? requiredAmount : 0.1;

      return {
        nome: ingredientName,
        quantidade: normalizedAmount,
        unidade: stock?.unidade ?? 'kg',
        disponivel: stock?.quantidade ?? 0,
        suficiente: Boolean(stock && stock.quantidade >= normalizedAmount),
        stockId: stock?.id ?? null,
      };
    });
  }

  function generateNextLotNumber() {
    const year = new Date().getFullYear();
    const sequence = lots
      .map(lot => lot.numeroLote ?? '')
      .map(value => {
        const match = String(value).match(/^LOTE-(\d{4})-(\d{4})$/);
        if (!match) return null;
        const [, matchedYear, sequenceNumber] = match;
        if (Number(matchedYear) !== year) return null;
        return Number(sequenceNumber);
      })
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    const nextNumber = sequence.length ? Math.max(...sequence) + 1 : 1;
    return `LOTE-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  useEffect(() => {
    if (!lotDraft.receita_id) {
      setLotRequiredIngredients([]);
      setLotStockWarning('');
      return;
    }

    const selectedRecipe = recipes.find(recipe => recipe.id === lotDraft.receita_id);
    if (!selectedRecipe) {
      setLotRequiredIngredients([]);
      setLotStockWarning('');
      return;
    }

    const nextVolume = Number(lotDraft.volume_desejado || selectedRecipe.volumeLitros || 20);
    const nextPlan = getLotIngredientPlan(selectedRecipe.id, nextVolume);
    setLotRequiredIngredients(nextPlan);
    const missing = nextPlan.filter(item => !item.suficiente);
    setLotStockWarning(missing.length > 0 ? `Pendência por falta de insumos: ${missing.map(item => `${item.nome} (${item.disponivel} ${item.unidade} disponíveis / ${item.quantidade} ${item.unidade} necessários)`).join(', ')}.` : '');
  }, [lotDraft.receita_id, lotDraft.volume_desejado, recipes, stocks]);

  async function createLot(event: React.FormEvent) {
    event.preventDefault();
    if (!lotDraft.receita_id) return;

    const selectedRecipe = recipes.find(recipe => recipe.id === lotDraft.receita_id);
    if (!selectedRecipe) {
      setError('Selecione uma receita válida para criar o lote.');
      return;
    }

    const plannedIngredients = lotRequiredIngredients.length
      ? lotRequiredIngredients
      : getLotIngredientPlan(selectedRecipe.id, Number(lotDraft.volume_desejado || selectedRecipe.volumeLitros || 20));

    const missingIngredients = plannedIngredients.filter(item => !item.suficiente);
    if (missingIngredients.length > 0) {
      const details = missingIngredients.map(item => `${item.nome} (${item.disponivel} ${item.unidade} disponíveis / ${item.quantidade} ${item.unidade} necessários)`).join(', ');
      setLotStockWarning(`Pendência por falta de insumos: ${details}.`);
      setError(`Não é possível criar o lote. Falta estoque para: ${details}.`);
      return;
    }

    try {
      const result = await api<ApiResponse<{ lote: LegacyLotData }>>('/api/lotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'criar', receita_id: lotDraft.receita_id, numero_lote: lotDraft.numero_lote, volume_desejado: Number(lotDraft.volume_desejado) }) });
      setLots(current => [...current, normalizeLot(result.data.lote)]);
      setLotDraft({ receita_id: '', numero_lote: '', volume_desejado: '20' });
      setLotRequiredIngredients([]);
      setLotStockWarning('');
      setError('');
      setLotFormOpen(false);
    } catch {
      setError('Não foi possível criar o lote.');
    }
  }

  async function createPurchaseRequestFromMissingStock(): Promise<boolean> {
    if (!lotDraft.receita_id) {
      return false;
    }

    const selectedRecipe = recipes.find(recipe => recipe.id === lotDraft.receita_id);
    if (!selectedRecipe) {
      setError('Selecione uma receita antes de solicitar materiais.');
      return false;
    }

    const plan = lotRequiredIngredients.length
      ? lotRequiredIngredients
      : getLotIngredientPlan(selectedRecipe.id, Number(lotDraft.volume_desejado || selectedRecipe.volumeLitros || 20));

    const missing = plan.filter(item => !item.suficiente && item.stockId);
    if (missing.length === 0) {
      setLotStockWarning('Não há falta de insumos para solicitar.');
      return false;
    }

    const requestItems: PurchaseRequestItem[] = missing.map(item => {
      const stock = stocks.find(stockItem => stockItem.id === item.stockId);
      const unitValue = stock?.precoUnitario ?? 0;
      const quantity = Number(Math.max(0, (item.quantidade || 0) - (item.disponivel || 0)).toFixed(2));
      return {
        id: crypto.randomUUID(),
        insumoId: item.stockId ?? '',
        nome: item.nome,
        quantidade: quantity,
        unidade: item.unidade,
        valorUnitario: unitValue,
        valorTotal: Number((quantity * unitValue).toFixed(2)),
      };
    });

    try {
      const lotResult = await api<ApiResponse<{ lote: LegacyLotData }>>('/api/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'criar', receita_id: selectedRecipe.id, numero_lote: lotDraft.numero_lote, volume_desejado: Number(lotDraft.volume_desejado) }),
      });
      const result = await api<ApiResponse<PurchaseRequest>>('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'criar',
          lote_id: lotResult.data.lote.id,
          solicitante: email,
          itens: requestItems,
        }),
      });

      setPurchaseRequests(current => [result.data, ...current]);
      setLots(current => [...current, normalizeLot(lotResult.data.lote)]);
      setLotFormOpen(false);
      setLotDraft({ receita_id: '', numero_lote: '', volume_desejado: '20' });
      setLotRequiredIngredients([]);
      setLotStockWarning('Solicitação de insumos enviada para revisão do estoque.');
      setError('');
      return true;
    } catch {
      setError('Não foi possível enviar a solicitação de compras.');
      return false;
    }
  }

  async function approvePurchaseRequest(request: PurchaseRequest) {
    try {
      const result = await api<ApiResponse<PurchaseRequest>>('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'aprovar', id: request.id }),
      });

      setPurchaseRequests(current => current.map(item => item.id === request.id ? result.data : item));
      setSelectedRequest(null);
      setRequestTab('aprovadas');
      const linkedLotId = request.loteId ?? request.lote_id;
      if (linkedLotId) {
        setLots(current => current.map(lot => lot.id === linkedLotId ? { ...lot, status: 'em_producao' } : lot));
      }
      setStocks(current => current.map(stock => {
        const item = result.data.itens.find(entry => entry.insumoId === stock.id);
        if (!item) return stock;
        return { ...stock, quantidade: Number((stock.quantidade + item.quantidade).toFixed(2)) };
      }));
      setError('');
    } catch {
      setError('Não foi possível aprovar a solicitação.');
    }
  }

  async function rejectPurchaseRequest(requestId: string) {
    try {
      await api('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'negar', id: requestId }),
      });
      setPurchaseRequests(current => current.filter(item => item.id !== requestId));
      setSelectedRequest(null);
      setError('');
    } catch {
      setError('Não foi possível negar a solicitação.');
    }
  }

  function advanceLot(lot: LegacyLot) {
    setSelectedLot(lot);
  }

  async function advanceLotPhase(lot: LegacyLot) {
    if (String(lot.status ?? '').toLowerCase() === 'pendente') {
      setError('Aguarde a aprovação da solicitação de insumos para avançar este lote.');
      return;
    }
    const currentPhase = String(lot.faseAtual ?? lot.status ?? 'planejamento').toLowerCase().replace('-', '_');
    const currentIndex = LOT_PHASES.indexOf(currentPhase);
    const nextPhase = LOT_PHASES[Math.min(currentIndex + 1, LOT_PHASES.length - 1)] ?? 'finalizado';
    try {
      await api('/api/lotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'atualizar_status', lote_id: lot.id, fase: nextPhase }) });
      setLots(current => current.map(item => item.id === lot.id ? { ...item, status: nextPhase === 'finalizado' ? 'finalizado' : 'em_producao', faseAtual: nextPhase } : item));
      setSelectedLot(current => current?.id === lot.id ? { ...current, status: nextPhase === 'finalizado' ? 'finalizado' : 'em_producao', faseAtual: nextPhase } : current);
    } catch {
      setError('Não foi possível atualizar o status do lote.');
    }
  }

  function openStockForm(stock?: Stock) {
    if (!stock) {
      window.history.pushState({}, '', legacyRoutes.stock);
      setLegacyPage('stock');
      setStockEditingId(null);
      setStockDraft({ nome: '', tipo: 'Malte', descricao: '', estoque: '0', unidade: 'kg', preco: '0' });
      setStockFormOpen(true);
      return;
    }
    setStockEditingId(stock?.id ?? null);
    setStockDraft(stock ? { nome: stock.nome.replace(`${stock.id} - `, ''), tipo: stock.tipo, descricao: stock.descricao, estoque: String(stock.quantidade), unidade: stock.unidade, preco: String(stock.precoUnitario) } : { nome: '', tipo: 'Malte', descricao: '', estoque: '0', unidade: 'kg', preco: '0' });
    setStockFormOpen(true);
  }

  async function saveStock(event: React.FormEvent) {
    event.preventDefault();
    try {
      const action = stockEditingId ? 'atualizar' : 'criar';
      const result = await api<ApiResponse<{ id: string }>>('/api/insumos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(stockEditingId ? { id: stockEditingId, insumo_id: stockEditingId } : {}), ...stockDraft, estoque: Number(stockDraft.estoque), preco: Number(stockDraft.preco) }) });
      const saved = normalizeStock({ ...stockDraft, id: stockEditingId ?? result.data.id, estoque: Number(stockDraft.estoque), preco_unitario: Number(stockDraft.preco) });
      setStocks(current => stockEditingId ? current.map(stock => stock.id === stockEditingId ? saved : stock) : [...current, saved]);
      setStockFormOpen(false);
    } catch { setError('Não foi possível salvar o insumo.'); }
  }

  async function deleteStock(stock: Stock) {
    if (!window.confirm(`Excluir ${stock.nome}?`)) return;
    try {
      await api(`/api/insumos/${stock.id}`, { method: 'DELETE' });
      setStocks(current => current.filter(item => item.id !== stock.id));
    } catch { setError('Não foi possível excluir o insumo.'); }
  }

  async function deleteLot(lot: LegacyLot) {
    if (!window.confirm(`Excluir o lote ${lot.numeroLote ?? lot.nome}?`)) return;
    try {
      await api(`/api/lotes/${lot.id}`, { method: 'DELETE' });
      setLots(current => current.filter(item => item.id !== lot.id));
      setSelectedLot(null);
      setError('');
    } catch { setError('Não foi possível excluir o lote.'); }
  }

  function openMovementForm(mode: 'entrada' | 'saida', stock?: Stock) {
    const selectedStock = stock ?? stocks[0] ?? null;
    setMovementDraft({
      tipo_movimento: mode,
      quantidade: '1',
      motivo: '',
      custo_unitario: String(selectedStock?.precoUnitario ?? 0),
    });
    setMovementStock(selectedStock ?? null);
    setMovementSearch('');
  }

  async function registerMovement(event: React.FormEvent) {
    event.preventDefault();
    if (!movementStock) return;

    const quantity = Number(movementDraft.quantidade);
    const unitCost = Number(movementDraft.custo_unitario);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Informe uma quantidade válida para a movimentação.');
      return;
    }

    try {
      const shouldUpdateCost = Number(movementStock.precoUnitario ?? 0) !== unitCost;
      if (shouldUpdateCost) {
        await api('/api/insumos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'atualizar',
            id: movementStock.id,
            nome: movementStock.nome.replace(`${movementStock.id} - `, ''),
            tipo: movementStock.tipo,
            descricao: movementStock.descricao,
            unidade: movementStock.unidade,
            estoque: movementStock.quantidade,
            preco: unitCost,
          }),
        });
      }

      const result = await api<ApiResponse<{ estoque_atual: number }>>('/api/insumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'registrar_movimentacao',
          insumo_id: movementStock.id,
          tipo_movimento: movementDraft.tipo_movimento,
          quantidade: quantity,
          motivo: movementDraft.motivo,
        }),
      });

      setStocks(current => current.map(stock => stock.id === movementStock.id ? { ...stock, quantidade: result.data.estoque_atual, precoUnitario: unitCost } : stock));
      setMovementStock(null);
      setMovementSearch('');
      setError('');
    } catch { setError('Não foi possível registrar a movimentação.'); }
  }

  if (!authenticated) {
    return (
      <main className="auth-shell">
        <section className="auth-brand-panel">
          <div className="auth-brand-logo"><Beer size={58} strokeWidth={1.5} /><strong>BrewMaster</strong><span>GESTÃO PROFISSIONAL</span></div>
          <p>Controle sua produção, gerencie insumos e<br /> aperfeiçoe suas receitas em uma plataforma<br /> integrada.</p>
        </section>
        <section className="auth-panel">
          <div className="auth-heading"><h1>Bem-vindo</h1><p>Acesse sua conta para continuar</p></div>
          <form onSubmit={login} className="auth-form">
            <label>E-mail Corporativo<input type="email" placeholder="nome@empresa.com" value={email} onChange={event => setEmail(event.target.value)} required /></label>
            <label>Senha de Acesso<div className="password-field"><input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={event => setPassword(event.target.value)} required /><button type="button" className="password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="submit-button">Acessar Painel <span aria-hidden="true">→</span></button>
          </form>
          <a
            className="desktop-download-link"
            href="https://drive.google.com/file/d/1fhheh3fUryOFarxJpHkdEuUhI1G_ljhX/view?usp=drive_link"
          >
            <Download size={17} aria-hidden="true" />
            <span>Baixar e usar no Android</span>
            <span className="desktop-download-arrow" aria-hidden="true">→</span>
          </a>
          <a
            className="desktop-download-link"
            href="https://drive.google.com/file/d/1HFcbvfarYagdsHNamCClYAltQ3j8iR40/view?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download size={17} aria-hidden="true" />
            <span>Baixar e usar no Windows</span>
            <span className="desktop-download-arrow" aria-hidden="true">→</span>
          </a>
        </section>
      </main>
    );
  }

  if (page === 'legacy') {
    const activeMenu = legacyMenu.find(item => item.key === legacyPage) ?? legacyMenu.find(item => item.key === 'stock') ?? legacyMenu[0];
    const totalStock = stocks.reduce((total, stock) => total + stock.quantidade, 0);

    function pageHeading(title: string, description: string) {
      return <div className="legacy-page-heading"><div><h1>{title}</h1><p className="muted">{description}</p></div></div>;
    }

    function legacyContent() {
      if (legacyPage === 'stock') {
        const types = ['Malte', 'Lúpulo', 'Levedura'];
        const visibleStocks = stocks.filter(stock => normalizeText(`${stock.id} ${stock.nome}`).includes(normalizeText(stockSearch)) && stock.tipo.localeCompare(stockType, 'pt-BR', { sensitivity: 'base' }) === 0);
        const stockValue = stocks.reduce((total, stock) => total + stock.quantidade * stock.precoUnitario, 0);
        const critical = stocks.filter(stock => stock.quantidade > 0 && stock.quantidade <= 5).length;
        const empty = stocks.filter(stock => stock.quantidade <= 0).length;
        return <section className="stocks-page"><nav className="stock-category-nav" aria-label="Filtrar insumos">{types.map(type => <button key={type} type="button" className={stockType === type ? 'selected' : ''} onClick={() => setStockType(type)}>{type}</button>)}</nav><div className="stocks-hero"><div><h1><Warehouse size={23} /> Gestão de Insumos</h1><p>Gerencie todos os ingredientes em estoque com alertas automáticos.</p></div><div className="stock-actions-row"><button className="stock-primary" onClick={() => openStockForm()}>＋ Novo Insumo</button><button className="stock-primary stock-secondary-action" onClick={() => openMovementForm('entrada')}>Entrada estoque</button><button className="stock-primary stock-secondary-action" onClick={() => openMovementForm('saida')}>Saída estoque</button></div></div><div className="stock-stat-grid"><article><strong>{stocks.length}</strong><span>Total de insumos</span></article><article><strong>R$ {stockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><span>Valor em estoque</span></article><article><strong>{critical}</strong><span>Itens críticos</span></article><article><strong>{empty}</strong><span>Sem estoque</span></article></div>{stockFormOpen && <form className="stock-form-panel" onSubmit={saveStock}><div><strong>{stockEditingId ? 'Editar insumo' : 'Novo insumo'}</strong><button type="button" onClick={() => setStockFormOpen(false)}>×</button></div><label>Nome<input required value={stockDraft.nome} onChange={event => setStockDraft({ ...stockDraft, nome: event.target.value })} /></label><label>Tipo<select value={stockDraft.tipo} onChange={event => setStockDraft({ ...stockDraft, tipo: event.target.value })}><option>Malte</option><option>Lúpulo</option><option>Levedura</option><option>Outro</option></select></label><label>Descrição<input value={stockDraft.descricao} onChange={event => setStockDraft({ ...stockDraft, descricao: event.target.value })} /></label><label>Quantidade<input type="number" min="0" step="0.01" value={stockDraft.estoque} onChange={event => setStockDraft({ ...stockDraft, estoque: event.target.value })} /></label><label>Unidade<select value={stockDraft.unidade} onChange={event => setStockDraft({ ...stockDraft, unidade: event.target.value })}><option>kg</option><option>g</option><option>L</option><option>un</option></select></label><label>Preço unitário<input type="number" min="0" step="0.01" value={stockDraft.preco} onChange={event => setStockDraft({ ...stockDraft, preco: event.target.value })} /></label><button className="stock-primary" type="submit">Salvar insumo</button></form>}{movementStock && <form className="stock-movement-panel" onSubmit={registerMovement}><div><strong>{movementDraft.tipo_movimento === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque'}: {movementStock.nome}</strong><button type="button" onClick={() => setMovementStock(null)}>×</button></div><label className="stock-movement-field stock-movement-wide"><span>Buscar insumo</span><input value={movementSearch} onChange={event => setMovementSearch(event.target.value)} placeholder="Código ou nome do insumo" /></label>{movementSearch.trim() ? <div className="stock-search-results">{stocks.filter(stock => normalizeText(`${stock.id} ${stock.nome}`).includes(normalizeText(movementSearch))).slice(0, 8).map(stock => <button key={stock.id} type="button" className={movementStock?.id === stock.id ? 'stock-option-selected' : 'stock-option'} onClick={() => { setMovementStock(stock); setMovementDraft(current => ({ ...current, custo_unitario: String(stock.precoUnitario) })); setMovementSearch(''); }}>{stock.id} · {stock.nome.startsWith(`${stock.id} - `) ? stock.nome.replace(`${stock.id} - `, '') : stock.nome}</button>)}</div> : null}{movementStock && <><label><span>Código</span><input value={movementStock.id} readOnly /></label><label><span>Insumo</span><input value={movementStock.nome} readOnly /></label><label><span>Quantidade</span><input type="number" min="0.01" step="0.01" required value={movementDraft.quantidade} onChange={event => setMovementDraft({ ...movementDraft, quantidade: event.target.value })} /></label><label><span>Motivo</span><input value={movementDraft.motivo} onChange={event => setMovementDraft({ ...movementDraft, motivo: event.target.value })} /></label><label className="stock-movement-field stock-movement-wide"><span>Estoque atual</span><input value={`${movementStock.quantidade.toLocaleString('pt-BR')} ${movementStock.unidade}`} readOnly /></label><button className="stock-primary" type="submit">Registrar</button></>}</form>}<div className="stock-controls"><div className="stock-search"><span>⌕</span><input placeholder="Buscar insumo por nome..." value={stockSearch} onChange={event => setStockSearch(event.target.value)} /></div><select value={stockType} onChange={event => setStockType(event.target.value)}>{types.map(type => <option key={type}>{type}</option>)}</select><div className="stock-view-toggle"><button type="button" className={stockView === 'grid' ? 'selected' : ''} onClick={() => setStockView('grid')}>▦ Grid</button><button type="button" className={stockView === 'table' ? 'selected' : ''} onClick={() => setStockView('table')}>☷ Tabela</button></div></div>{stockView === 'grid' ? <div className="stock-grid">{visibleStocks.map(stock => <article className={`stock-card-modern ${stock.quantidade <= 0 ? 'empty' : stock.quantidade <= 5 ? 'critical' : ''}`} key={stock.id}><div className="stock-card-top"><div><strong>{stock.nome}</strong><span>{stock.descricao || 'Sem descrição'}</span></div><b>{stock.tipo}</b></div><div className="stock-card-metrics"><div><small>Estoque</small><strong>{stock.quantidade.toLocaleString('pt-BR')} {stock.unidade}</strong></div><div><small>Preço unitário</small><strong>R$ {stock.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div><small>Valor total</small><strong>R$ {(stock.quantidade * stock.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div></div>{stock.quantidade <= 0 && <em>⚠ Sem estoque</em>}{stock.quantidade > 0 && stock.quantidade <= 5 && <em>⚠ Estoque crítico</em>}<div className="stock-card-actions"><button onClick={() => setMovementStock(stock)}>↕ Movimentar</button><button onClick={() => openStockForm(stock)}>Editar</button><button className="stock-delete" onClick={() => deleteStock(stock)} title="Excluir">▣</button></div></article>)}</div> : <div className="stock-table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Estoque</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{visibleStocks.map(stock => <tr key={stock.id}><td>{stock.nome}</td><td>{stock.tipo}</td><td>{stock.quantidade} {stock.unidade}</td><td>R$ {(stock.quantidade * stock.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td><button onClick={() => setMovementStock(stock)}>Movimentar</button><button onClick={() => openStockForm(stock)}>Editar</button><button onClick={() => deleteStock(stock)}>Excluir</button></td></tr>)}</tbody></table></div>}</section>;
      }

      if (legacyPage === 'recipes') {
        const styles = ['Todos', ...new Set(recipes.map(recipe => recipe.estilo).filter(style => style !== 'Não informado'))];
        const visibleRecipes = recipes.filter(recipe => normalizeText(recipe.nome).includes(normalizeText(recipeSearch)) && (recipeStyle === 'Todos' || recipe.estilo === recipeStyle));
        return <section className="recipes-page"><div className="recipe-hero"><div><h1><FlaskConical size={24} />Receitas</h1><p>Gerencie, ajuste e compare receitas com visão clara de ABV, IBU, volume e fermentação.</p></div><div className="recipe-hero-actions"><button className="recipe-button primary" onClick={() => openRecipeForm()}>＋ Nova Receita</button></div></div>{recipeFormOpen && <div className="recipe-modal-backdrop"><form className="recipe-form-panel recipe-modal" onSubmit={recipeEditingId ? updateRecipe : createRecipe}><div><strong>{recipeEditingId ? 'Editar receita' : 'Nova receita'}</strong><button type="button" onClick={() => setRecipeFormOpen(false)}>×</button></div><label>Nome<input required value={recipeDraft.nome} onChange={event => setRecipeDraft({ ...recipeDraft, nome: event.target.value })} /></label><label>Estilo<select required value={recipeDraft.estilo} onChange={event => { setRecipeDraft({ ...recipeDraft, estilo: event.target.value }); autoPopulateIngredientsForStyle(event.target.value); }}><option value="">Selecione um estilo...</option>{BEER_STYLES.map(style => <option key={style} value={style}>{style}</option>)}</select></label><label>Volume (L)<input type="number" min="1" value={recipeDraft.volume} onChange={event => setRecipeDraft({ ...recipeDraft, volume: event.target.value })} /></label><label>ABV - Teor Alcoólico (%)<input type="number" step="0.1" value={recipeDraft.abv} onChange={event => setRecipeDraft({ ...recipeDraft, abv: event.target.value })} /></label><label>IBU - Amargor<input type="number" value={recipeDraft.ibu} onChange={event => setRecipeDraft({ ...recipeDraft, ibu: event.target.value })} /></label><label>Tipo de Recipiente<select value={recipeSelectedContainer} onChange={event => setRecipeSelectedContainer(event.target.value)}>{CONTAINER_TYPES.map(container => <option key={container.name} value={container.name}>{container.name}</option>)}</select></label><div className="recipe-ingredients-section"><div className="recipe-ingredients-header"><h3>Insumos da Receita</h3><span className="ingredient-count">{recipeIngredients.length}</span></div>{recipeDraft.estilo && <div className="auto-populated-badge">✓ Insumos auto-selecionados para {recipeDraft.estilo}</div>}<div className="recipe-ingredient-add"><input type="text" placeholder="Buscar insumo..." value={recipeIngredientSearch} onChange={event => setRecipeIngredientSearch(event.target.value)} />{recipeIngredientSearch.trim() && <div className="ingredient-dropdown">{stocks.filter(s => s.nome.toLowerCase().includes(recipeIngredientSearch.toLowerCase().trim())).map(stock => <button key={stock.id} type="button" onClick={() => { addRecipeIngredient(stock, 1); setRecipeIngredientSearch(''); }} className="ingredient-option"><span>{stock.nome}</span><small>{stock.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {stock.unidade} em estoque</small></button>)}</div>}</div><div className="recipe-ingredients-list">{recipeIngredients.map((ing, idx) => <div key={idx} className="ingredient-item"><div><strong>{ing.nome}</strong><span>{ing.unidade}</span></div><div className="ingredient-quantity"><input type="number" min="0.1" step="0.1" required value={recipeIngredientQuantityDrafts[idx] ?? String(ing.quantidade)} onChange={event => { const value = event.target.value; setRecipeIngredientQuantityDrafts(current => current.map((quantity, i) => i === idx ? value : quantity)); if (value === '') { updateRecipeIngredientQuantity(idx, 0); return; } const quantity = Number(value); if (Number.isFinite(quantity)) updateRecipeIngredientQuantity(idx, quantity); }} /><span>R$ {(ing.quantidade * ing.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); removeRecipeIngredient(idx); }} className="remove-ingredient">✕</button></div></div>)}</div></div><button className="recipe-button primary" type="submit">{recipeEditingId ? 'Salvar alterações' : 'Salvar receita'}</button><div className="recipe-cost-summary"><div className="cost-item"><span>Custo Total de Insumos:</span><strong>R$ {recipeTotalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div className="cost-item"><span>Custo por Litro:</span><strong>R$ {(recipeTotalCost / Number(recipeDraft.volume || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div></div><div className="recipe-packaging-calc">{recipeDraft.volume && recipeSelectedContainer ? (() => { const container = CONTAINER_TYPES.find(c => c.name === recipeSelectedContainer); const volume = Number(recipeDraft.volume); if (container) { const { units, cases, paletes } = calculatePackaging(volume, container.volume, container.unitsPerCase); return <><div className="packaging-result-row"><span>Unidades:</span><strong>{units}</strong></div><div className="packaging-result-row"><span>Engradados ({container.unitsPerCase} un):</span><strong>{cases}</strong></div><div className="packaging-result-row"><span>Paletes (40 engr):</span><strong>{paletes}</strong></div></>; } return null; })() : null}</div></form></div>}<div className="recipe-controls"><div className="recipe-search"><span>⌕</span><input placeholder="Buscar receita por nome..." value={recipeSearch} onChange={event => setRecipeSearch(event.target.value)} /></div><select value={recipeStyle} onChange={event => setRecipeStyle(event.target.value)}>{styles.map(style => <option key={style}>{style === 'Todos' ? 'Todos os Estilos' : style}</option>)}</select><div className="recipe-view-toggle"><button className={recipeView === 'grid' ? 'selected' : ''} onClick={() => setRecipeView('grid')} type="button">▦ Grid</button><button className={recipeView === 'table' ? 'selected' : ''} onClick={() => setRecipeView('table')} type="button">☷ Tabela</button></div></div>{recipeView === 'grid' ? <div className="recipe-grid">{visibleRecipes.map(recipe => <article className="recipe-card-modern" key={recipe.id}><div className="recipe-card-header"><div><span className="recipe-badge">Receita</span><h3>{recipe.nome}</h3><span className="recipe-style">{recipe.estilo}</span></div></div><div className="recipe-card-body"><p>{recipe.descricao || 'Receita desenvolvida para equilibrar maltagem, lúpulo e fermentação em um perfil de produção consistente.'}</p><div className="recipe-stats-modern"><div><small>ABV</small><strong>{recipe.abv.toLocaleString('pt-BR')}%</strong></div><div><small>IBU</small><strong>{recipe.ibu}</strong></div><div><small>Volume</small><strong>{recipe.volumeLitros} L</strong></div><div><small>Fermentação</small><strong>{recipe.tempoFermentacao} dias</strong></div></div></div><p className="recipe-hint">⌁ Visualização resumida da receita</p><div className="recipe-card-actions"><button className="recipe-edit-action" onClick={() => openRecipeForm(recipe)} title="Editar receita">✎ Editar</button><button onClick={() => deleteRecipe(recipe.id)} className="delete-recipe" title="Excluir">▣</button></div></article>)}</div> : <div className="recipe-table-wrap"><table><thead><tr><th>Nome</th><th>Estilo</th><th>ABV</th><th>IBU</th><th>Volume</th><th>Ações</th></tr></thead><tbody>{visibleRecipes.map(recipe => <tr key={recipe.id}><td>{recipe.nome}</td><td>{recipe.estilo}</td><td>{recipe.abv}%</td><td>{recipe.ibu}</td><td>{recipe.volumeLitros} L</td><td><button onClick={() => openRecipeForm(recipe)}>Editar</button><button onClick={() => deleteRecipe(recipe.id)}>Excluir</button></td></tr>)}</tbody></table></div>}</section>;
      }

      if (legacyPage === 'quality') {
        const criticalStocks = stocks.filter(stock => stock.quantidade <= 5);
        const pendingLots = lots.filter(lot => String(lot.status ?? '').toLowerCase() === 'pendente');
        const recipesWithoutIngredients = recipes.filter(recipe => recipe.insumos.length === 0);
        const recipesWithStockIssues = recipes.filter(recipe => {
          if (!recipe.insumos.length) return false;
          const plan = getLotIngredientPlan(recipe.id, recipe.volumeLitros);
          return plan.some(item => !item.suficiente);
        });

        const cards = [
          {
            title: 'Estoque crítico',
            count: criticalStocks.length,
            tone: criticalStocks.length > 0 ? 'warning' : 'success',
            summary: criticalStocks.length > 0 ? 'Insumos abaixo do limite de segurança.' : 'Nenhum insumo precisa de atenção imediata.',
            items: criticalStocks.length > 0 ? criticalStocks.slice(0, 4).map(stock => `${stock.nome} · ${stock.quantidade} ${stock.unidade}`) : ['Todos os insumos estão dentro do limite aceitável.'],
          },
          {
            title: 'Lotes pendentes',
            count: pendingLots.length,
            tone: pendingLots.length > 0 ? 'warning' : 'success',
            summary: pendingLots.length > 0 ? 'Lotes esperando aprovação ou estoque disponível.' : 'Nenhum lote está pendente de verificação.',
            items: pendingLots.length > 0 ? pendingLots.slice(0, 4).map(lot => `${lot.nome} · ${lot.receitaNome ?? 'Receita não informada'}`) : ['Nenhuma pendência de produção registrada.'],
          },
          {
            title: 'Receitas com inconsistências',
            count: recipesWithoutIngredients.length + recipesWithStockIssues.length,
            tone: recipesWithoutIngredients.length + recipesWithStockIssues.length > 0 ? 'warning' : 'success',
            summary: recipesWithoutIngredients.length + recipesWithStockIssues.length > 0 ? 'Receitas que precisam de revisão antes da produção.' : 'Todas as receitas passaram na verificação inicial.',
            items: recipesWithoutIngredients.length + recipesWithStockIssues.length > 0
              ? [
                  ...recipesWithoutIngredients.slice(0, 2).map(recipe => `${recipe.nome} · sem insumos cadastrados`),
                  ...recipesWithStockIssues.slice(0, 2).map(recipe => `${recipe.nome} · estoque insuficiente para o plano`),
                ]
              : ['Nenhuma inconsistência encontrada nas receitas.'],
          },
        ];

        return <section className="stocks-page"><div className="stocks-hero"><div><h1><ShieldCheck size={23} /> Verificações</h1><p>Acompanhe rapidamente os itens que precisam de atenção antes da produção seguir.</p></div></div><div className="stock-stat-grid"><article><strong>{cards.reduce((total, card) => total + card.count, 0)}</strong><span>Itens em revisão</span></article><article><strong>{recipes.length}</strong><span>Receitas cadastradas</span></article><article><strong>{lots.length}</strong><span>Lotes registrados</span></article><article><strong>{stocks.length}</strong><span>Insumos monitorados</span></article></div><div className="stock-grid">{cards.map(card => <article key={card.title} className="stock-card-modern"><div className="stock-card-top"><div><strong>{card.title}</strong><span>{card.summary}</span></div><b className={card.tone === 'warning' ? 'warning' : 'success'}>{card.count}</b></div><div className="stock-card-metrics">{card.items.map((item, index) => <div key={`${card.title}-${index}`}><small>Verificação</small><strong>{item}</strong></div>)}</div></article>)}</div></section>;
      }

      if (legacyPage === 'settings') {
        const settingsTabs: { key: SettingsTab; label: string; icon: LucideIcon }[] = [
          { key: 'brewery', label: 'Dados Cervejaria', icon: Building2 },
          { key: 'delivery', label: 'Origem de Entrega', icon: Truck },
          ...(isAdmin ? [{ key: 'users' as const, label: 'Usuários', icon: UserCircle }] : []),
        ];
        return <section className="stocks-page system-settings-page">
          <nav className="settings-tabs" aria-label="Seções de configurações">
            {settingsTabs.map(tab => <button key={tab.key} type="button" className={settingsTab === tab.key ? 'active' : ''} aria-current={settingsTab === tab.key ? 'page' : undefined} onClick={() => setSettingsTab(tab.key)}><tab.icon size={17} />{tab.label}</button>)}
          </nav>
          {settingsTab === 'brewery' && <form className="system-settings-form" onSubmit={saveSystemSettings}>
            <section className="system-settings-section">
              <div className="system-settings-heading"><Building2 size={19} /><div><h2>Dados da cervejaria</h2><p>Identificação utilizada nos registros e nas entregas.</p></div></div>
              <div className="system-settings-fields">
                <label>Nome da empresa<input required value={settingsDraft.nomeEmpresa} onChange={event => setSettingsDraft(current => ({ ...current, nomeEmpresa: event.target.value }))} /></label>
                <label>CNPJ<input required inputMode="numeric" maxLength={18} placeholder="00.000.000/0000-00" value={settingsDraft.cnpj} onChange={event => setSettingsDraft(current => ({ ...current, cnpj: event.target.value }))} /></label>
              </div>
            </section>
            <div className="system-settings-actions"><span role="status">{settingsStatus}</span><button className="stock-primary" type="submit">Salvar dados</button></div>
          </form>}
          {settingsTab === 'delivery' && <form className="system-settings-form" onSubmit={saveSystemSettings}>
            <section className="system-settings-section">
              <div className="system-settings-heading"><Truck size={19} /><div><h2>Origem das entregas</h2><p>O CEP cadastrado aqui será usado como origem para calcular o frete das vendas.</p></div></div>
              <div className="system-settings-fields">
                <label className="settings-address-field">Endereço<input required value={settingsDraft.endereco} onChange={event => setSettingsDraft(current => ({ ...current, endereco: event.target.value }))} placeholder="Rua, número, bairro, cidade e estado" />{settingsCepStatus && <small className="cep-lookup-status" role="status">{settingsCepStatus}</small>}</label>
                <label>CEP da cervejaria<input required inputMode="numeric" maxLength={9} placeholder="00000-000" value={formatCep(settingsDraft.cep)} onChange={event => { setSettingsCepLookupRequested(true); setSettingsDraft(current => ({ ...current, cep: formatCep(event.target.value) })); }} /></label>
                <label>Valor-base do frete (R$/km)<input required type="number" min="0" step="0.01" value={settingsDraft.valorFreteBase} onChange={event => setSettingsDraft(current => ({ ...current, valorFreteBase: Number(event.target.value) }))} /></label>
              </div>
            </section>
            <div className="system-settings-actions"><span role="status">{settingsStatus}</span><button className="stock-primary" type="submit">Salvar origem de entrega</button></div>
          </form>}
          {settingsTab === 'users' && isAdmin && <div className="system-settings-form">
            <form className="system-settings-form" onSubmit={createUser}>
              <section className="system-settings-section">
                <div className="system-settings-heading"><UserCircle size={19} /><div><h2>Criar usuário</h2><p>Cadastre uma conta de acesso ao BrewMaster.</p></div></div>
                <div className="system-settings-fields">
                  <label>E-mail<input type="email" autoComplete="email" required value={newUserEmail} onChange={event => setNewUserEmail(event.target.value)} /></label>
                  <label>Senha<input type="password" autoComplete="new-password" minLength={8} required value={newUserPassword} onChange={event => setNewUserPassword(event.target.value)} /></label>
                </div>
              </section>
              <div className="system-settings-actions"><span role="status">{newUserStatus}</span><button className="stock-primary" type="submit">Criar usuário</button></div>
            </form>
            <section className="system-settings-section system-users-section">
              <div className="system-settings-heading"><UserCircle size={19} /><div><h2>Usuários cadastrados</h2><p>Contas que podem acessar o BrewMaster.</p></div></div>
              {usersLoading ? <p className="system-users-message" role="status">Carregando usuários...</p>
                : usersStatus ? <p className="system-users-message system-users-error" role="alert">{usersStatus}</p>
                  : systemUsers.length === 0 ? <p className="system-users-message">Nenhum usuário cadastrado.</p>
                    : <div className="system-users-list">{systemUsers.map(user => <div className="system-user-row" key={user.email}><UserCircle size={19} /><span>{user.email}</span><small>{user.email.toLowerCase() === email.toLowerCase() ? 'Sua conta' : 'Usuário'}</small></div>)}</div>}
            </section>
          </div>}
        </section>;
      }

      if (legacyPage === 'productionStock') {
        const finishedLots = lots.filter(lot => !lot.vendido && (String(lot.status ?? '').toLowerCase() === 'finalizado' || String(lot.faseAtual ?? '').toLowerCase() === 'finalizado'));
        const totalVolume = finishedLots.reduce((total, lot) => total + Number(lot.quantidadeLitros ?? 0), 0);

        return <section className="stocks-page"><div className="stocks-hero"><div><h1><PackageCheck size={23} /> Estoque de Produção</h1><p>Visualize os lotes já concluídos e encaminhe os itens para venda ou faturamento.</p></div></div><div className="stock-stat-grid"><article><strong>{finishedLots.length}</strong><span>Lotes concluídos</span></article><article><strong>{totalVolume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong><span>Volume disponível</span></article><article><strong>{salesRecords.length}</strong><span>Vendas registradas</span></article><article><strong>R$ {salesRecords.reduce((total, sale) => total + sale.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><span>Faturamento total</span></article></div><div className="stock-grid">{finishedLots.length === 0 ? <div className="lot-empty-state">Nenhum lote concluído foi encontrado no estoque de produção.</div> : finishedLots.map(lot => <article key={lot.id} className="stock-card-modern"><div className="stock-card-top"><div><strong>{lot.numeroLote ?? lot.nome}</strong><span>{lot.receitaNome}</span></div><b className="success">Concluído</b></div><div className="stock-card-metrics"><div><small>Volume</small><strong>{Number(lot.quantidadeLitros ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong></div><div><small>Fase</small><strong>{lot.faseAtual ? LOT_PHASE_LABELS[lot.faseAtual] ?? lot.faseAtual : 'Finalizado'}</strong></div><div><small>Criação</small><strong>{lot.dataCriacao ? new Date(lot.dataCriacao).toLocaleDateString('pt-BR') : '—'}</strong></div></div><div className="stock-card-actions"><button type="button" onClick={() => { setSaleDraft(current => ({ ...current, loteId: lot.id })); navigateLegacy('sales'); }}>Vender lote</button></div></article>)}</div></section>;
      }

      if (legacyPage === 'sales') {
        const isFinished = (lot: LegacyLot) => [lot.status, lot.faseAtual].some(value => String(value ?? '').toLowerCase() === 'finalizado');
        const readyLots = lots.filter(lot => !lot.vendido && isFinished(lot));
        const selectedSaleLots = readyLots.filter(lot => saleSelectedLotIds.includes(lot.id));
        const saleVolume = selectedSaleLots.reduce((total, lot) => total + Number(lot.quantidadeLitros ?? 0), 0);
        const unitPrice = Number(saleDraft.valorUnitario || 0);
        const subtotal = saleVolume * unitPrice;
        const aliquota = Number(saleDraft.aliquota || 0);
        const imposto = subtotal * aliquota / 100;
        const destinationAddress = saleAddressPreview ? [saleAddressPreview.logradouro, saleAddressPreview.bairro, saleAddressPreview.localidade, saleAddressPreview.uf].filter(Boolean).join(', ') : '';
        const destinationLocality = saleAddressPreview ? `${saleAddressPreview.localidade}/${saleAddressPreview.uf}` : '';
        const freightQuotes = getFreightQuotes(saleDistanceKm, destinationLocality, systemSettings.nomeEmpresa, systemSettings.endereco, systemSettings.cep, destinationAddress, systemSettings.valorFreteBase);
        const selectedFreight = freightQuotes.find(quote => quote.company === saleDraft.empresaFrete) ?? freightQuotes[0] ?? null;
        const frete = selectedFreight?.price ?? 0;
        const total = subtotal + imposto + frete;

        function openSaleModal() {
          setError('');
          setSaleSelectedLotIds(saleDraft.loteId && readyLots.some(lot => lot.id === saleDraft.loteId) ? [saleDraft.loteId] : []);
          setSaleDraft(current => ({ ...current, loteId: '' }));
          setSaleModalOpen(true);
        }

        function closeSaleModal() {
          setSaleModalOpen(false);
        }

        function toggleSaleLot(lotId: string) {
          setSaleSelectedLotIds(current => current.includes(lotId)
            ? current.filter(id => id !== lotId)
            : [...current, lotId]);
        }

        function showSaleError(message: string) {
          setError(message);
          window.alert(message);
        }

        async function handleSaleSubmit(event: React.FormEvent) {
          event.preventDefault();
          setError('');

          if (selectedSaleLots.length === 0) {
            showSaleError('Selecione ao menos um lote concluído antes de registrar a venda.');
            return;
          }

          if (!saleDraft.cep.trim()) {
            showSaleError('Informe o CEP para calcular o valor e a cotação de frete.');
            return;
          }

          if (!saleDraft.numeroEndereco.trim()) {
            showSaleError('Informe o número do endereço de entrega.');
            return;
          }

          if (systemSettings.cep.replace(/\D/g, '').length !== 8) {
            showSaleError('Cadastre o CEP da cervejaria em Configurações antes de registrar vendas.');
            return;
          }

          if (saleLocationLoading) {
            showSaleError('A consulta dos CEPs ainda está em andamento. Aguarde alguns segundos e tente novamente.');
            return;
          }

          if (!saleLocation || saleDistanceKm < 0) {
            showSaleError(saleLocationError || 'Não foi possível validar o CEP de destino para calcular o frete.');
            return;
          }

          try {
            setSaleSubmitting(true);
            const result = await api<ApiResponse<SaleRecord[]>>('/api/vendas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ loteIds: selectedSaleLots.map(lot => lot.id), valorUnitario: unitPrice, aliquota, cep: saleDraft.cep, localidade: `${saleLocation.localidade}/${saleLocation.uf}`, numeroEndereco: saleDraft.numeroEndereco, complementoEndereco: saleDraft.complementoEndereco, distanciaKm: saleDistanceKm, empresaFrete: selectedFreight?.company ?? saleDraft.empresaFrete, frete }),
            });
            if (!result.success) throw new Error('A venda não foi registrada.');
            setSalesRecords(current => [...(result.data ?? []), ...current]);
            setLots(current => current.map(lot => selectedSaleLots.some(selected => selected.id === lot.id) ? { ...lot, vendido: true } : lot));
            setSaleSelectedLotIds([]);
            setSaleModalOpen(false);
            setSaleDraft({ loteId: '', valorUnitario: '0', cep: '', numeroEndereco: '', complementoEndereco: '', aliquota: '12', empresaFrete: '' });
            setError('');
            navigateLegacy('productionStock');
          } catch (saleError) {
            showSaleError(saleError instanceof Error ? saleError.message : 'Não foi possível registrar a venda.');
          } finally {
            setSaleSubmitting(false);
          }
        }

        return <section className="stocks-page"><div className="stocks-hero"><div><h1><ShoppingCart size={23} /> Vendas e faturamento</h1><p>Vende lotes concluídos com valor por litro, imposto, frete e total geral.</p></div><button type="button" className="stock-primary" onClick={openSaleModal}>Registrar venda</button></div><div className="stock-stat-grid"><article><strong>{readyLots.length}</strong><span>Lotes prontos</span></article><article><strong>{salesRecords.length}</strong><span>Vendas realizadas</span></article><article><strong>R$ {salesRecords.reduce((total, sale) => total + sale.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><span>Receita acumulada</span></article><article><strong>{readyLots.reduce((total, lot) => total + Number(lot.quantidadeLitros ?? 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong><span>Volume disponível</span></article></div><div className="stock-grid"><article className="stock-card-modern"><div className="stock-card-top"><div><strong>Resumo da venda</strong><span>{selectedSaleLots.length > 0 ? `${selectedSaleLots.length} lote(s) selecionado(s)` : 'Nenhum lote selecionado'}</span></div><b className="success">{selectedSaleLots.length}</b></div><div className="stock-card-metrics"><div><small>Volume</small><strong>{saleVolume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong></div><div><small>Subtotal</small><strong>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div><small>Imposto</small><strong>R$ {imposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div><small>Frete</small><strong>R$ {frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div><small>Total</small><strong>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div></div></article><article className="stock-card-modern"><div className="stock-card-top"><div><strong>Lotes concluídos</strong><span>Use o botão para abrir o registro e selecionar um ou mais lotes.</span></div></div><div className="stock-card-metrics">{readyLots.length === 0 ? <div><small>Resultado</small><strong>Nenhum lote concluído disponível.</strong></div> : readyLots.slice(0, 4).map(lot => <div key={lot.id}><small>{lot.numeroLote ?? lot.nome}</small><strong>{Number(lot.quantidadeLitros ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong></div>)}</div></article></div>{saleModalOpen && <div className="sale-modal-backdrop" onClick={closeSaleModal}><section className="sale-modal-panel" role="dialog" aria-modal="true" aria-labelledby="sale-modal-title" onClick={event => event.stopPropagation()}><div className="sale-modal-header"><div><span className="lot-modal-kicker">Comercial</span><h2 id="sale-modal-title">Registrar venda</h2></div><button type="button" className="modal-close-button" onClick={closeSaleModal} aria-label="Fechar">×</button></div><form onSubmit={handleSaleSubmit} className="sale-form-panel"><div className="sale-selection-grid"><div className="sale-selection-column"><label>Preço unitário (R$/L)<input type="number" min="0" step="0.01" value={saleDraft.valorUnitario} onChange={event => setSaleDraft(current => ({ ...current, valorUnitario: event.target.value }))} /></label><label>Alíquota (%)<input type="number" min="0" step="0.01" value={saleDraft.aliquota} onChange={event => setSaleDraft(current => ({ ...current, aliquota: event.target.value }))} /></label><label>CEP<input type="text" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={saleDraft.cep} onChange={event => setSaleDraft(current => ({ ...current, cep: formatCep(event.target.value) }))} /></label>{saleAddressStatus && <p className="sale-address-status" role="status">{saleAddressStatus}</p>}{saleAddressPreview && <div className="sale-address-fields"><p className="sale-address-preview">Endereço localizado (CEP {formatCep(saleAddressPreview.cep)}): {[saleAddressPreview.logradouro, saleAddressPreview.bairro, saleAddressPreview.localidade, saleAddressPreview.uf].filter(Boolean).join(', ')}</p><label>Número<input required autoComplete="address-line1" value={saleDraft.numeroEndereco} onChange={event => setSaleDraft(current => ({ ...current, numeroEndereco: event.target.value }))} placeholder="Número do imóvel" /></label><label>Complemento (opcional)<input autoComplete="address-line2" value={saleDraft.complementoEndereco} onChange={event => setSaleDraft(current => ({ ...current, complementoEndereco: event.target.value }))} placeholder="Apartamento, bloco, referência" /></label></div>}{saleLocationLoading ? <p className="sale-address-status" role="status">Calculando a distância e o valor do frete...</p> : saleLocationError ? <p className="sale-address-status error-text" role="alert">{saleLocationError}</p> : saleLocation ? <p className="sale-address-status" role="status">Frete calculado: {saleDistanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km × R$ {systemSettings.valorFreteBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km = R$ {frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</p> : <p className="sale-address-status" role="status">Informe o CEP de entrega e cadastre o CEP de origem para calcular o frete.</p>}<div className="sale-freight-grid">{freightQuotes.map(quote => <button key={quote.company} type="button" className={`sale-freight-option${saleDraft.empresaFrete === quote.company ? ' selected' : ''}`} onClick={() => setSaleDraft(current => ({ ...current, empresaFrete: quote.company }))}><small>{quote.company}</small><strong>R$ {quote.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><span>{quote.eta}</span></button>)}</div></div><div className="sale-selection-column"><h4>Lotes disponíveis <span>{saleSelectedLotIds.length} selecionado(s) de {readyLots.length}</span></h4><div className="sale-lot-list">{readyLots.length === 0 ? <div className="lot-empty-state">Nenhum lote concluído disponível.</div> : readyLots.map(lot => <button key={lot.id} type="button" className={`sale-lot-option${saleSelectedLotIds.includes(lot.id) ? ' selected' : ''}`} onClick={() => toggleSaleLot(lot.id)}><small>{lot.numeroLote ?? lot.nome}</small><strong>{lot.receitaNome}</strong><span>{Number(lot.quantidadeLitros ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</span></button>)}</div></div></div><div className="sale-summary-grid"><div><small>Volume</small><strong>{saleVolume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong></div><div><small>Subtotal</small><strong>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div><small>Imposto</small><strong>R$ {imposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div><small>Frete</small><strong>R$ {frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><span>{saleDistanceKm} km estimados × R$ {systemSettings.valorFreteBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km</span></div><div><small>Total</small><strong>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div></div><div className="sale-modal-actions"><button type="button" className="secondary-button" onClick={closeSaleModal}>Cancelar</button><button type="submit" className="stock-primary sale-submit-button" disabled={saleSubmitting}>{saleSubmitting ? 'Registrando venda...' : 'Confirmar venda'}</button></div></form></section></div>}</section>;
      }

      if (legacyPage === 'lots') {
        const isFinished = (lot: LegacyLot) => String(lot.status ?? '').toLowerCase() === 'finalizado';
        const activeLots = lots.filter(lot => !isFinished(lot));
        const finishedLots = lots.filter(isFinished);
        const displayedLots = (lotTab === 'active' ? activeLots : finishedLots).filter(lot => normalizeText(`${lot.nome} ${lot.receitaNome ?? ''}`).includes(normalizeText(lotSearch)));
        const completionRate = lots.length ? Math.round((finishedLots.length / lots.length) * 100) : 0;
        const statusLabel = (status?: string) => ({ pendente: 'Pendente', em_producao: 'Em produção', planejamento: 'Planejamento', moagem: 'Moagem', brassagem: 'Brassagem', fermentacao: 'Fermentação', acondicionamento: 'Acondicionamento', finalizado: 'Finalizado' }[String(status).toLowerCase()] ?? status ?? 'Planejamento');
        const selectedRecipe = lotDraft.receita_id ? recipes.find(recipe => recipe.id === lotDraft.receita_id) ?? null : null;
        const lotSummaryItems = selectedRecipe ? lotRequiredIngredients.length ? lotRequiredIngredients : getLotIngredientPlan(selectedRecipe.id, Number(lotDraft.volume_desejado || selectedRecipe.volumeLitros || 20)) : [];
        const hasLotStockIssue = lotSummaryItems.some(item => !item.suficiente);
        return <section className="lots-page"><div className="lots-hero"><div><h1><Boxes size={22} /> Monitor de Lotes</h1><p>Acompanhe a produção de seus lotes em tempo real.</p></div><div className="lot-view-toggle"><button className={lotView === 'grid' ? 'selected' : ''} onClick={() => setLotView('grid')} type="button">▦ Grid</button><button className={lotView === 'table' ? 'selected' : ''} onClick={() => setLotView('table')} type="button">☷ Tabela</button></div></div><div className="lot-stat-grid"><article><strong>{lots.length}</strong><span>Total de lotes</span></article><article><strong>{activeLots.length}</strong><span>Ativos</span></article><article><strong>{finishedLots.length}</strong><span>Finalizados</span></article><article><strong>{completionRate}%</strong><span>Taxa conclusão</span></article></div><div className="lot-tabs"><button className={lotTab === 'active' ? 'active' : ''} onClick={() => setLotTab('active')}>● Lotes em Produção <small>{activeLots.length}</small></button><button className={lotTab === 'finished' ? 'active' : ''} onClick={() => setLotTab('finished')}>✓ Lotes Finalizados <small>{finishedLots.length}</small></button></div><div className="lot-controls"><div className="lot-search"><span>⌕</span><input placeholder="Buscar lote..." value={lotSearch} onChange={event => setLotSearch(event.target.value)} /></div><button className="lot-new-button" onClick={() => { setError(''); setLotStockWarning(''); setLotDraft({ receita_id: '', numero_lote: generateNextLotNumber(), volume_desejado: '20' }); setLotFormOpen(true); }}>＋ Novo Lote</button></div>{lotFormOpen && <form className="lot-form-panel" onSubmit={createLot}><div className="lot-modal-header"><div><span className="lot-modal-kicker">Produção</span><strong>Novo lote</strong></div><button type="button" onClick={() => { setLotFormOpen(false); setLotStockWarning(''); setError(''); }}>×</button></div><div className="lot-form-column"><label>Receita<select required value={lotDraft.receita_id} onChange={event => { const selectedRecipe = recipes.find(recipe => recipe.id === event.target.value); const nextVolume = String(selectedRecipe?.volumeLitros || 20); setLotDraft({ ...lotDraft, receita_id: event.target.value, numero_lote: lotDraft.numero_lote || generateNextLotNumber(), volume_desejado: nextVolume }); setError(''); setLotStockWarning(''); }}><option value="">Selecione uma receita...</option>{recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.nome}</option>)}</select></label><label>Número do lote<input readOnly required placeholder="LOTE-2026-0001" value={lotDraft.numero_lote} /></label><label>Volume configurado (L)<input readOnly={Boolean(selectedRecipe)} required type="number" min="1" value={lotDraft.volume_desejado} onChange={event => { if (!selectedRecipe) { setLotDraft({ ...lotDraft, volume_desejado: event.target.value }); } }} /></label></div><div className="lot-form-column">{selectedRecipe ? <div className="lot-recipe-focus"><span className="lot-focus-label">Receita selecionada</span><h3>{selectedRecipe.nome}</h3><div className="lot-focus-meta"><span>{selectedRecipe.estilo}</span><span>{selectedRecipe.volumeLitros} L</span><span>{selectedRecipe.abv}% ABV</span><span>{selectedRecipe.ibu} IBU</span></div></div> : <div className="lot-recipe-placeholder"><strong>Receita ainda não selecionada</strong><span>Escolha uma receita para carregar a composição do lote e validar o estoque.</span></div>}</div>{selectedRecipe && <div className="lot-summary-panel"><div className="lot-summary-header"><span>Planejamento de insumos</span><strong className={hasLotStockIssue ? 'warning' : 'ok'}>{hasLotStockIssue ? 'Pendência' : 'Disponível'}</strong></div><div className="lot-ingredient-list">{lotSummaryItems.length === 0 ? <span className="lot-empty-inline">Sem insumos definidos.</span> : lotSummaryItems.map(ingredient => <div key={`${ingredient.stockId ?? ingredient.nome}-${ingredient.quantidade}`} className={`lot-ingredient-item ${ingredient.suficiente ? 'ok' : 'pending'}`}><div><span>{ingredient.nome}</span><small>{ingredient.suficiente ? 'Disponível' : 'Faltante'}</small></div><b>{ingredient.disponivel.toLocaleString('pt-BR')} / {ingredient.quantidade.toLocaleString('pt-BR')} {ingredient.unidade}</b></div>)}</div>{lotStockWarning && <div className={`lot-warning-banner ${hasLotStockIssue ? 'warning' : 'ok'}`}>{lotStockWarning}</div>}<div className="lot-form-actions"><button type="button" className="secondary-button" onClick={() => { setLotFormOpen(false); setLotStockWarning(''); setError(''); }}>Cancelar</button><button type="button" className="lot-request-button" onClick={async () => { const created = await createPurchaseRequestFromMissingStock(); if (created) { navigateLegacy('production'); } }} disabled={!hasLotStockIssue}>Solicitar insumo</button><button type="submit" className="primary-button" disabled={hasLotStockIssue}>{hasLotStockIssue ? 'Pendência de estoque' : 'Criar lote'}</button></div></div>}{!selectedRecipe && <div className="lot-empty-state">Selecione uma receita para verificar o planejamento do lote.</div>}</form>}{displayedLots.length === 0 ? <div className="empty-state"><Boxes size={26} /><strong>Nenhum lote encontrado</strong><span>Não há registros compatíveis com a busca atual.</span></div> : <div className={lotView === 'grid' ? 'lot-grid' : 'lot-table'}>{displayedLots.map(lot => <article className="lot-card" key={lot.id}><div className="lot-card-header"><div><strong>{lot.nome}</strong><span>{lot.receitaNome}</span></div><span className={`lot-status ${String(lot.status ?? '').toLowerCase()}`}>{statusLabel(lot.status)}</span></div><div className="lot-card-meta"><span>Volume: {Number(lot.quantidadeLitros ?? 0).toLocaleString('pt-BR')} L</span><span>{lot.numeroLote ?? 'Sem número'}</span></div><div className="lot-card-footer"><small>{lot.dataCriacao ? new Date(lot.dataCriacao).toLocaleDateString('pt-BR') : 'Sem data'}</small><button type="button" onClick={() => advanceLot(lot)}>Avançar</button></div></article>)}</div>}</section>;
      }if (legacyPage === 'production') {
        const pendingRequests = purchaseRequests.filter(item => item.status === 'pendente');
        const approvedRequests = purchaseRequests.filter(item => item.status === 'aprovada');
        return <section className="stocks-page"><div className="stocks-hero"><div><h1><Factory size={23} /> Solicitações de compra</h1><p>Acompanhe os pedidos de insumos e aprove ou recuse conforme a disponibilidade da produção.</p></div></div><div className="stock-stat-grid"><article><strong>{pendingRequests.length}</strong><span>Pendentes</span></article><article><strong>{approvedRequests.length}</strong><span>Aprovadas</span></article><article><strong>{purchaseRequests.length}</strong><span>Total</span></article><article><strong>{totalStock.toLocaleString('pt-BR')}</strong><span>Estoque</span></article></div><div className="lot-tabs"><button className={requestTab === 'pendentes' ? 'active' : ''} onClick={() => setRequestTab('pendentes')} type="button">● Pendentes</button><button className={requestTab === 'aprovadas' ? 'active' : ''} onClick={() => setRequestTab('aprovadas')} type="button">✓ Aprovadas</button></div>{requestTab === 'pendentes' ? <div className="stock-grid">{pendingRequests.length === 0 ? <div className="lot-empty-state">Nenhuma solicitação pendente.</div> : pendingRequests.map(request => <article key={request.id} className="stock-card-modern"><div className="stock-card-top"><div><strong>{request.numero}</strong><span>{new Date(request.data).toLocaleString('pt-BR')}</span></div><b>{request.solicitante}</b></div><div className="stock-card-metrics">{request.itens.slice(0, 2).map(item => <div key={item.id}><small>{item.nome}</small><strong>{item.quantidade} {item.unidade}</strong></div>)}{request.itens.length > 2 && <div><small>Itens</small><strong>{request.itens.length}</strong></div>}</div><div className="stock-card-actions"><button type="button" onClick={() => setSelectedRequest(request)}>Ver</button></div></article>)}</div> : <div className="stock-grid">{approvedRequests.length === 0 ? <div className="lot-empty-state">Nenhuma solicitação aprovada.</div> : approvedRequests.map(request => <article key={request.id} className="stock-card-modern"><div className="stock-card-top"><div><strong>{request.numero}</strong><span>{new Date(request.data).toLocaleString('pt-BR')}</span></div><b>Aprovada</b></div><div className="stock-card-metrics">{request.itens.slice(0, 2).map(item => <div key={item.id}><small>{item.nome}</small><strong>{item.quantidade} {item.unidade}</strong></div>)}{request.itens.length > 2 && <div><small>Itens</small><strong>{request.itens.length}</strong></div>}</div><div className="stock-card-actions"><button type="button" onClick={() => setSelectedRequest(request)}>Detalhes</button></div></article>)}</div>}{selectedRequest && <div className="stock-movement-panel request-detail-modal" style={{ position: 'fixed', inset: '50% auto auto 50%', zIndex: 20, display: 'grid', transform: 'translate(-50%, -50%)' }}><div><strong>Solicitação {selectedRequest.numero}</strong><button type="button" onClick={() => setSelectedRequest(null)}>×</button></div><div className="stock-movement-field"><label>Solicitante<input value={selectedRequest.solicitante} readOnly /></label></div><div className="stock-movement-field"><label>Data/Hora<input value={new Date(selectedRequest.data).toLocaleString('pt-BR')} readOnly /></label></div>{selectedRequest.itens.map(item => <div key={item.id} className="stock-movement-wide" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '8px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}><span>{item.nome}</span><span>{item.quantidade} {item.unidade}</span><span>R$ {item.valorUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><span>R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>)}<div className="lot-form-actions stock-movement-wide"><button type="button" className="secondary-button" onClick={() => setSelectedRequest(null)}>Voltar</button><button type="button" className="primary-button" onClick={() => approvePurchaseRequest(selectedRequest)} disabled={selectedRequest.status !== 'pendente'}>Aprovar</button><button type="button" className="secondary-button" onClick={() => rejectPurchaseRequest(selectedRequest.id)} disabled={selectedRequest.status !== 'pendente'}>Negar</button></div></div>}</section>;
      }

      if (legacyPage === 'deliveries' || legacyPage === 'myDeliveries') {
        const deliverySales = salesRecords.filter(sale => sale.statusEntrega !== 'entregue');
        const visibleSales = legacyPage === 'myDeliveries' ? deliverySales.filter(sale => sale.statusEntrega === 'em_entrega') : deliverySales;
        const deliveryLabel = (status?: string) => status === 'em_entrega' ? 'Em entrega' : 'Aguardando entrega';
        const paymentLabel = (payment?: string) => ({ nota: 'Nota', boleto: 'Boleto', cartao_credito: 'Cartão de crédito', cartao_debito: 'Cartão de débito', pix: 'Pix' }[payment ?? ''] ?? payment ?? '-');
        async function updateDelivery(sale: SaleRecord, action: 'iniciar' | 'finalizar') {
          const payment = deliveryPayments[sale.id];
          if (action === 'finalizar' && !payment) { setError('Selecione a forma de pagamento antes de finalizar.'); return; }
          try {
            const result = await api<ApiResponse<SaleRecord>>(`/api/vendas/${sale.id}/entrega`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, formaPagamento: payment }) });
            if (!result.success) throw new Error('Não foi possível atualizar a entrega.');
            setSalesRecords(current => current.map(item => item.id === sale.id ? result.data : item));
            setError('');
          } catch (deliveryError) {
            setError(deliveryError instanceof Error ? deliveryError.message : 'Não foi possível atualizar a entrega.');
          }
        }
        return <section className="stocks-page"><div className="stocks-hero"><div><h1><Truck size={23} /> {legacyPage === 'myDeliveries' ? 'Minhas entregas' : 'Entregas'}</h1><p>{legacyPage === 'myDeliveries' ? 'Acompanhe suas entregas em rota e finalize no ponto de destino.' : 'Selecione uma venda para iniciar a entrega e acompanhar a rota.'}</p></div></div><div className="stock-stat-grid"><article><strong>{deliverySales.filter(sale => sale.statusEntrega !== 'em_entrega').length}</strong><span>Aguardando entrega</span></article><article><strong>{deliverySales.filter(sale => sale.statusEntrega === 'em_entrega').length}</strong><span>Em rota</span></article><article><strong>{salesRecords.filter(sale => sale.statusEntrega === 'entregue').length}</strong><span>Entregues</span></article><article><strong>{deliverySales.length}</strong><span>Total pendente</span></article></div><div className="delivery-tabs"><button type="button" className={legacyPage === 'deliveries' ? 'active' : ''} onClick={() => navigateLegacy('deliveries')}>Todas para entrega</button><button type="button" className={legacyPage === 'myDeliveries' ? 'active' : ''} onClick={() => navigateLegacy('myDeliveries')}>Minhas entregas</button></div>{visibleSales.length === 0 ? <div className="lot-empty-state">Nenhuma entrega nesta etapa.</div> : <div className="delivery-grid">{visibleSales.map(sale => { const mapQuery = encodeURIComponent(`${sale.localidade ?? sale.cep}, Brasil`); return <article key={sale.id} className="delivery-card"><div className="delivery-card-header"><div><span className="panel-kicker">Venda #{sale.id}</span><h3>{sale.nome}</h3><p>{sale.receitaNome} · {sale.volume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</p></div><b className={sale.statusEntrega === 'em_entrega' ? 'delivery-status in-route' : 'delivery-status'}>{deliveryLabel(sale.statusEntrega)}</b></div><div className="delivery-details"><span><small>Destino</small><strong>{sale.localidade ?? sale.cep}</strong></span><span><small>Frete</small><strong>R$ {sale.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span><span><small>Distância</small><strong>{sale.distanciaKm ?? '-'} km</strong></span><span><small>Total</small><strong>R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span></div><iframe className="delivery-map" title={`Mapa da entrega ${sale.nome}`} src={`https://www.openstreetmap.org/export/embed.html?bbox=-46.8%2C-23.7%2C-46.4%2C-23.4&layer=mapnik&marker=-23.55%2C-46.63`} /><a className="delivery-route-link" href={`https://www.openstreetmap.org/search?query=${mapQuery}`} target="_blank" rel="noreferrer"><MapPinned size={15} /> Abrir destino no mapa</a><div className="delivery-actions">{sale.statusEntrega !== 'em_entrega' && <button type="button" className="stock-primary" onClick={() => updateDelivery(sale, 'iniciar')}>Entregar</button>}{sale.statusEntrega === 'em_entrega' && <><select value={deliveryPayments[sale.id] ?? ''} onChange={event => setDeliveryPayments(current => ({ ...current, [sale.id]: event.target.value }))}><option value="">Forma de pagamento</option><option value="nota">Nota</option><option value="boleto">Boleto</option><option value="cartao_credito">Cartão de crédito</option><option value="cartao_debito">Cartão de débito</option><option value="pix">Pix</option></select><button type="button" className="stock-primary" onClick={() => updateDelivery(sale, 'finalizar')}>Finalizar entrega</button></>}{sale.formaPagamento && <span className="delivery-payment">Pagamento: {paymentLabel(sale.formaPagamento)}</span>}</div></article>; })}</div>}</section>;
      }

      if (legacyPage === 'history') {
        const deliveredSales = salesRecords.filter(sale => sale.statusEntrega === 'entregue');
        const totalSales = deliveredSales.reduce((total, sale) => total + sale.total, 0);
        const totalVolume = deliveredSales.reduce((total, sale) => total + sale.volume, 0);
        const totalFreight = deliveredSales.reduce((total, sale) => total + sale.frete, 0);
        return <section className="stocks-page"><div className="stocks-hero"><div><h1><History size={23} /> Histórico de entregas</h1><p>Consulte as entregas finalizadas, pagamento e valores registrados.</p></div></div><div className="stock-stat-grid"><article><strong>{deliveredSales.length}</strong><span>Entregas concluídas</span></article><article><strong>{totalVolume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong><span>Volume entregue</span></article><article><strong>R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><span>Faturamento</span></article><article><strong>R$ {totalFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong><span>Frete total</span></article></div>{deliveredSales.length === 0 ? <div className="lot-empty-state">Nenhuma entrega finalizada foi registrada.</div> : <div className="stock-grid">{deliveredSales.map(sale => <article key={sale.id} className="stock-card-modern"><div className="stock-card-top"><div><strong>{sale.nome}</strong><span>{sale.receitaNome}</span></div><b className="success">Entregue</b></div><div className="stock-card-metrics"><div><small>Entrega</small><strong>{sale.dataEntrega ? new Date(sale.dataEntrega).toLocaleString('pt-BR') : '-'}</strong></div><div><small>Localidade</small><strong>{sale.localidade ?? sale.cep}</strong></div><div><small>Pagamento</small><strong>{sale.formaPagamento ?? '-'}</strong></div><div><small>Frete</small><strong>R$ {sale.frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div><div><small>Volume</small><strong>{sale.volume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong></div><div><small>Total</small><strong>R$ {sale.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div></div></article>)}</div>}</section>;
      }

      if (legacyPage === 'commercialReports') {
        const now = new Date();
        let periodStart = new Date(now);
        let periodEnd = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd.setHours(23, 59, 59, 999);

        if (commercialReportPeriod === '15d') periodStart.setDate(periodStart.getDate() - 14);
        if (commercialReportPeriod === 'month') periodStart.setDate(1);
        if (commercialReportPeriod === '3m' || commercialReportPeriod === '6m') {
          periodStart.setDate(1);
          periodStart.setMonth(periodStart.getMonth() - (commercialReportPeriod === '3m' ? 2 : 5));
        }
        if (commercialReportPeriod === 'day') {
          periodStart = new Date(`${commercialReportDay}T00:00:00`);
          periodEnd = new Date(`${commercialReportDay}T23:59:59.999`);
        }
        if (commercialReportPeriod === 'year') {
          periodStart = new Date(Number(commercialReportYear), 0, 1, 0, 0, 0, 0);
          periodEnd = new Date(Number(commercialReportYear), 11, 31, 23, 59, 59, 999);
        }

        const periodLabel = commercialReportPeriod === 'day'
          ? periodStart.toLocaleDateString('pt-BR')
          : `${periodStart.toLocaleDateString('pt-BR')} a ${periodEnd.toLocaleDateString('pt-BR')}`;
        const isInPeriod = (value?: string) => {
          if (!value) return false;
          const date = new Date(value);
          return Number.isFinite(date.getTime()) && date >= periodStart && date <= periodEnd;
        };
        const createdLots = lots.filter(lot => isInPeriod(lot.dataCriacao));
        const isFinished = (lot: LegacyLot) => [lot.status, lot.faseAtual].some(value => String(value ?? '').toLowerCase() === 'finalizado');
        const manufacturedLots = lots.filter(lot => isFinished(lot) && isInPeriod(lot.dataFinalizacao ?? lot.dataCriacao));
        const periodSales = salesRecords.filter(sale => isInPeriod(sale.data));
        const totalRevenue = periodSales.reduce((total, sale) => total + sale.total, 0);
        const totalFreight = periodSales.reduce((total, sale) => total + sale.frete, 0);
        const totalTax = periodSales.reduce((total, sale) => total + sale.imposto, 0);
        const soldVolume = periodSales.reduce((total, sale) => total + sale.volume, 0);
        const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-';
        const createdLotRows = createdLots.map(lot => [lot.numeroLote ?? lot.nome, lot.receitaNome ?? 'Não informada', lot.status ?? 'Em produção', `${Number(lot.quantidadeLitros ?? 0).toLocaleString('pt-BR')} L`, formatDate(lot.dataCriacao)]);
        const manufacturedLotRows = manufacturedLots.map(lot => [lot.numeroLote ?? lot.nome, lot.receitaNome ?? 'Não informada', `${Number(lot.quantidadeLitros ?? 0).toLocaleString('pt-BR')} L`, formatDate(lot.dataFinalizacao ?? lot.dataCriacao)]);
        const saleRows = periodSales.map(sale => [sale.id, sale.nome, sale.receitaNome, `${sale.volume.toLocaleString('pt-BR')} L`, formatCurrency(sale.frete), formatCurrency(sale.total), formatDate(sale.data)]);
        const summaryRows = [
          ['Lotes criados', String(createdLots.length)],
          ['Lotes fabricados', String(manufacturedLots.length)],
          ['Vendas registradas', String(periodSales.length)],
          ['Faturamento', formatCurrency(totalRevenue)],
          ['Impostos', formatCurrency(totalTax)],
          ['Frete cobrado', formatCurrency(totalFreight)],
          ['Volume vendido', `${soldVolume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`],
        ];
        const reportOptions: { key: CommercialReportPeriod; label: string }[] = [
          { key: '15d', label: '15 dias' },
          { key: 'month', label: 'Mês' },
          { key: '3m', label: '3 meses' },
          { key: '6m', label: '6 meses' },
          { key: 'day', label: 'Dia' },
          { key: 'year', label: 'Ano' },
        ];

        async function downloadWordReport() {
          setReportExportStatus('');
          try {
            const { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import('docx');
            const createWordTable = (headers: string[], rows: string[][]) => {
              const buildRow = (values: string[], isHeader = false) => new TableRow({
                children: values.map(value => new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: value, bold: isHeader })] })],
                })),
              });
              const visibleRows = rows.length ? rows : [headers.map((_, index) => index === 0 ? 'Sem registros no período' : '')];
              return new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [buildRow(headers, true), ...visibleRows.map(row => buildRow(row))],
              });
            };
            const report = new Document({
              creator: 'BrewMaster',
              title: `Relatório comercial ${periodLabel}`,
              sections: [{ children: [
                new Paragraph({ text: 'Relatório comercial', heading: HeadingLevel.TITLE }),
                new Paragraph({ children: [new TextRun({ text: `Período: ${periodLabel}`, bold: true })] }),
                new Paragraph({ text: 'Resumo estatístico', heading: HeadingLevel.HEADING_1 }),
                createWordTable(['Indicador', 'Resultado'], summaryRows),
                new Paragraph({ text: 'Lotes criados', heading: HeadingLevel.HEADING_1 }),
                createWordTable(['Lote', 'Receita', 'Status', 'Volume', 'Criação'], createdLotRows),
                new Paragraph({ text: 'Lotes fabricados', heading: HeadingLevel.HEADING_1 }),
                createWordTable(['Lote', 'Receita', 'Volume', 'Data de finalização'], manufacturedLotRows),
                new Paragraph({ text: 'Vendas', heading: HeadingLevel.HEADING_1 }),
                createWordTable(['Venda', 'Lote', 'Receita', 'Volume', 'Frete', 'Total', 'Data'], saleRows),
              ] }],
            });
            const blob = await Packer.toBlob(report);
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Relatorio-comercial-${localDateInputValue(periodStart)}.docx`;
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            setReportExportStatus('Documento Word baixado.');
          } catch {
            setReportExportStatus('Não foi possível gerar o documento Word.');
          }
        }

        function renderReportTable(title: string, headers: string[], rows: string[][]) {
          return <section className="commercial-report-section" key={title}><header><h2>{title}</h2><span>{rows.length} registro(s)</span></header>{rows.length === 0 ? <div className="lot-empty-state">Nenhum registro neste período.</div> : <div className="commercial-report-table-wrap"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${title}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>}</section>;
        }

        return <section className="stocks-page commercial-reports"><div className="stocks-hero"><div><h1><ChartNoAxesCombined size={23} /> Relatórios comerciais</h1><p>Acompanhe produção, vendas e lotes em um período selecionado.</p></div><button type="button" className="stock-primary report-download-button" onClick={downloadWordReport}><Download size={16} /> Baixar Word</button></div><div className="commercial-report-toolbar"><div className="report-period-tabs" role="group" aria-label="Período do relatório">{reportOptions.map(option => <button key={option.key} type="button" className={commercialReportPeriod === option.key ? 'selected' : ''} onClick={() => setCommercialReportPeriod(option.key)}>{option.label}</button>)}</div>{commercialReportPeriod === 'day' && <label className="report-custom-filter">Dia<input type="date" value={commercialReportDay} onChange={event => setCommercialReportDay(event.target.value)} /></label>}{commercialReportPeriod === 'year' && <label className="report-custom-filter">Ano<select value={commercialReportYear} onChange={event => setCommercialReportYear(event.target.value)}>{Array.from({ length: 7 }, (_, index) => String(new Date().getFullYear() - index)).map(year => <option key={year} value={year}>{year}</option>)}</select></label>}<span className="report-period-label">{periodLabel}</span></div><div className="commercial-report-kpis"><article><small>Lotes criados</small><strong>{createdLots.length}</strong></article><article><small>Lotes fabricados</small><strong>{manufacturedLots.length}</strong></article><article><small>Vendas</small><strong>{periodSales.length}</strong></article><article><small>Faturamento</small><strong>{formatCurrency(totalRevenue)}</strong></article><article><small>Volume vendido</small><strong>{soldVolume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L</strong></article></div><div className="commercial-report-summary"><span>Impostos <strong>{formatCurrency(totalTax)}</strong></span><span>Frete <strong>{formatCurrency(totalFreight)}</strong></span><span>Ticket médio <strong>{formatCurrency(periodSales.length ? totalRevenue / periodSales.length : 0)}</strong></span></div>{reportExportStatus && <p className="report-export-status" role="status">{reportExportStatus}</p>}{renderReportTable('Lotes do período', ['Lote', 'Receita', 'Status', 'Volume', 'Criação'], createdLotRows)}{renderReportTable('Lotes fabricados', ['Lote', 'Receita', 'Volume', 'Data de finalização'], manufacturedLotRows)}{renderReportTable('Vendas do período', ['Venda', 'Lote', 'Receita', 'Volume', 'Frete', 'Total', 'Data'], saleRows)}</section>;
      }

      if (legacyPage === 'dashboard') {
        return <DashboardView email={email} stocks={stocks} recipes={recipes} lots={lots} purchaseRequests={purchaseRequests} salesRecords={salesRecords} loading={loading} onNavigate={navigateLegacy} />;
      }

      return <div className="legacy-empty"><activeMenu.icon size={30} /><strong>{activeMenu.label}</strong><span>Esta área foi configurada na navegação legada e será conectada aos dados do módulo correspondente.</span></div>;

      const activeLots = lots.filter(lot => String(lot.status ?? '').toLowerCase() !== 'finalizado').length;
      const criticalStocks = stocks.filter(stock => stock.quantidade <= 5);
      const stockTypes = [...new Set(stocks.map(stock => stock.tipo))].slice(0, 4);
      const stockValue = stocks.reduce((total, stock) => total + stock.quantidade * stock.precoUnitario, 0);
      return <><section className="dashboard-welcome"><div><h2>Bem-vindo, {email.split('@')[0]}!</h2><p>Gerencie sua produção de cervejas com inteligência</p></div><button className="dashboard-refresh" onClick={() => window.location.reload()} title="Atualizar dados">⟳</button></section><div className="dashboard-kpis"><article className="dashboard-kpi blue"><div><FlaskConical size={22} /></div><strong>{recipes.length}</strong><span>RECEITAS</span></article><article className="dashboard-kpi orange"><div><Factory size={22} /></div><strong>{activeLots}</strong><span>LOTES PRONTOS</span></article><article className="dashboard-kpi green"><div><Warehouse size={22} /></div><strong>R$ 0,00</strong><span>PATRIMÔNIO</span></article><article className="dashboard-kpi purple"><div><ShoppingCart size={22} /></div><strong>0</strong><span>VENDAS (MÊS)</span></article><article className="dashboard-kpi teal"><div><ChartNoAxesCombined size={22} /></div><strong>R$ 0,00</strong><span>LUCRO BRUTO (MÊS)</span></article></div><section className="dashboard-chart-panel"><div className="dashboard-chart-placeholder"><div className="chart-axis"><span>Distribuição do estoque</span><span>{loading ? 'Atualizando...' : 'Atualizado agora'}</span></div><div className="chart-legend">{stockTypes.map((type, index) => <span key={type}><i className={`legend-dot dot-${index}`} />{type}</span>)}</div></div></section><section className="critical-panel"><div className="critical-heading"><span><b>●</b> Reposição Crítica</span><button onClick={() => navigateLegacy('stock')}>Ver estoque</button></div>{criticalStocks.length === 0 ? <p>Nenhum insumo precisa de reposição no momento.</p> : <div className="critical-list">{criticalStocks.map(stock => <span key={stock.id}>{stock.nome} · {stock.quantidade} {stock.unidade}</span>)}</div>}</section></>;
    }

    const operationMenu = legacyMenu.filter(item => ['dashboard', 'recipes', 'lots', 'stock', 'productionStock', 'production'].includes(item.key));
    const commercialMenu = legacyMenu.filter(item => ['sales', 'commercialReports', 'deliveries', 'myDeliveries', 'history'].includes(item.key));
    const financialMenu: LegacyMenuItem[] = legacyMenu.filter(item => item.key === 'profile' || item.key === 'settings');
    const menuGroup = (items: LegacyMenuItem[]) => <nav>{items.map(item => <button className={legacyPage === item.key ? 'active' : ''} key={item.key} onClick={() => navigateLegacy(item.key)}><item.icon size={18} />{item.key === 'lots' ? 'Monitor de Lotes' : item.key === 'stock' ? 'Insumos' : item.key === 'productionStock' ? 'Estoque Produção' : item.key === 'production' ? 'Solicitações' : item.label}</button>)}</nav>;

    return <main className="legacy-shell"><aside className="legacy-sidebar"><div className="legacy-sidebar-brand"><Beer size={22} /><strong>BrewMaster</strong><button className="sidebar-close" aria-label="Fechar menu">×</button></div><p className="legacy-menu-label">Principal</p>{menuGroup(operationMenu.slice(0, 1))}<p className="legacy-menu-label">Produção</p>{menuGroup(operationMenu.slice(1, 3))}<p className="legacy-menu-label">Estoque</p>{menuGroup(operationMenu.slice(3))}<p className="legacy-menu-label">Comercial</p>{menuGroup(commercialMenu)}<p className="legacy-menu-label">Administração</p>{menuGroup(financialMenu)}<div className="legacy-sidebar-footer">
  <div className="legacy-user">
    <span>A</span>
    <div>
      <strong>{email}</strong>
      <small>{isAdmin ? 'ADMINISTRADOR' : 'USUÁRIO'}</small>
    </div>
  </div>
  <button type="button" onClick={() => navigateLegacy('settings')} title="Configurações" aria-label="Configurações"><Settings size={17} /></button>
  <button onClick={logout} title="Sair"><LogOut size={17} /></button>
</div>
<div className="legacy-footer-links">Configurações <span>•</span> Sair</div></aside><section className="legacy-main"><header className="legacy-topbar"><span>{activeMenu.label}</span><div><button className="legacy-date-button" aria-label="Calendário">▣</button><time>{new Date().toLocaleDateString('pt-BR')}</time></div></header><div className="legacy-content">{activeMenu.key === 'dashboard' ? null : pageHeading(activeMenu.label, `Gerencie os dados e fluxos da página ${activeMenu.label.toLowerCase()}.`)}{legacyContent()}{legacyPage === 'stock' && stockFormOpen && stockEditingId && <button className="stock-modal-delete" type="button" onClick={async () => { const stock = stocks.find(item => item.id === stockEditingId); if (stock) { await deleteStock(stock); setStockFormOpen(false); } }}>Excluir insumo</button>}</div></section>{selectedLot && <div className="lot-process-backdrop"><section className="lot-process-modal" role="dialog" aria-modal="true" aria-labelledby="lot-process-title"><header><div><span className="lot-modal-kicker">Acompanhamento da produção</span><h2 id="lot-process-title">{selectedLot.numeroLote ?? selectedLot.nome}</h2><p>{selectedLot.receitaNome ?? 'Receita não informada'} · {Number(selectedLot.quantidadeLitros ?? 0).toLocaleString('pt-BR')} L</p></div><button type="button" onClick={() => setSelectedLot(null)} aria-label="Fechar">×</button></header><div className="lot-process-list">{LOT_PHASES.map((phase, index) => { const currentPhase = String(selectedLot.faseAtual ?? selectedLot.status ?? 'planejamento').toLowerCase().replace('-', '_'); const currentIndex = LOT_PHASES.indexOf(currentPhase); const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'next'; return <div className={`lot-process-step ${state}`} key={phase}><span className="lot-process-marker">{state === 'done' ? '✓' : index + 1}</span><div><strong>{LOT_PHASE_LABELS[phase]}</strong><small>{state === 'done' ? 'Concluída' : state === 'current' ? 'Etapa atual' : 'Próxima etapa'}</small></div></div>; })}</div><footer><button type="button" className="lot-modal-delete" onClick={() => deleteLot(selectedLot)}>Excluir lote</button><button type="button" className="secondary-button" onClick={() => setSelectedLot(null)}>Voltar</button><button type="button" className="primary-button" onClick={() => advanceLotPhase(selectedLot)} disabled={String(selectedLot.faseAtual ?? selectedLot.status).toLowerCase().replace('-', '_') === 'finalizado'}>Avançar fase <span aria-hidden="true">→</span></button></footer></section></div>}</main>;
  }

  const totalStock = stocks.reduce((total, stock) => total + stock.quantidade, 0);
  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand-mark"><Beer size={22} /> BrewMaster</div><div className="topbar-actions"><button className="text-button" onClick={() => setPage('legacy')}>SisLegado</button><button className="icon-button" onClick={logout} title="Sair"><LogOut size={18} /></button></div></header>
      <section className="content">
        <div className="heading-row"><div><p className="eyebrow">Visão geral</p><h1>Painel de produção</h1></div><span className="status"><span /> SQL Server conectado</span></div>
        {error && <p className="error">{error}</p>}
        <div className="metric-grid">
          <article className="metric"><Boxes size={21} /><span>Insumos cadastrados</span><strong>{stocks.length}</strong></article>
          <article className="metric"><FlaskConical size={21} /><span>Receitas disponíveis</span><strong>{recipes.length}</strong></article>
          <article className="metric"><PackageCheck size={21} /><span>Estoque total</span><strong>{totalStock.toLocaleString('pt-BR')}</strong></article>
        </div>
        <div className="section-heading"><h2>Estoque atual</h2><span>{loading ? 'Atualizando...' : 'Sincronizado agora'}</span></div>
        <div className="table-wrap"><table><thead><tr><th>Insumo</th><th>Categoria</th><th>Quantidade</th></tr></thead><tbody>{stocks.map(stock => <tr key={stock.id}><td>{stock.nome}</td><td>{stock.tipo}</td><td>{stock.quantidade.toLocaleString('pt-BR')} {stock.unidade}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  );
}

export { AppErrorBoundary };
export default App;
