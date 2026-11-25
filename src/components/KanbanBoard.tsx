import React, { useState, useMemo } from 'react';
import {
  ServiceOrder,
  Client,
  Vehicle,
  Mechanic,
  OrderStatus,
  PaymentMethod,
} from '../types';
import {
  Search,
  Filter,
  Plus,
  MessageCircle,
  Clock,
  Printer,
  ChevronRight,
  ChevronLeft,
  Car,
  User,
  Wrench,
  CheckCircle,
  X,
  Hash,
  DollarSign,
  Eye,
  EyeOff,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { WhatsAppService } from '../services/whatsapp';
import { QuickOrderCheckoutModal } from './QuickOrderCheckoutModal';
import { getOrderWarranty } from '../utils/warranty';

interface KanbanBoardProps {
  orders: ServiceOrder[];
  clients: Client[];
  vehicles: Vehicle[];
  mechanics: Mechanic[];
  onOpenOrder: (order: ServiceOrder) => void;
  onNewOrder: () => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onPrintReceipt: (order: ServiceOrder) => void;
  onQuickCheckout?: (order: ServiceOrder, paymentMethod: PaymentMethod, isPaid: boolean) => void;
}

const KANBAN_COLUMNS: { status: OrderStatus; label: string; color: string; badgeClass: string }[] = [
  { status: 'orcamento', label: '1. Orçamento / Recepção', color: 'border-slate-700', badgeClass: 'bg-slate-800 text-slate-300' },
  { status: 'aguardando_aprovacao', label: '2. Aguardando Aprovação', color: 'border-amber-500/50', badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  { status: 'aprovado', label: '3. Aprovado / Peças', color: 'border-blue-500/50', badgeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  { status: 'em_andamento', label: '4. Em Execução no Pátio', color: 'border-purple-500/50', badgeClass: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  { status: 'pronto', label: '5. Pronto para Retirada', color: 'border-emerald-500/50', badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  { status: 'finalizado', label: '6. Entregue / Faturado', color: 'border-green-800', badgeClass: 'bg-green-900/30 text-green-400 border border-green-700/50' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  orders,
  clients,
  vehicles,
  mechanics,
  onOpenOrder,
  onNewOrder,
  onUpdateStatus,
  onPrintReceipt,
  onQuickCheckout,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mechanicFilter, setMechanicFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'patio' | 'finalizado'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'highest_value' | 'lowest_value' | 'highest_profit' | 'warranty'>('recent');
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [checkoutOrder, setCheckoutOrder] = useState<ServiceOrder | null>(null);

  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
  const getVehicle = (vehicleId: string) => vehicles.find((v) => v.id === vehicleId);
  const getMechanic = (mechanicId: string) => mechanics.find((m) => m.id === mechanicId);

  const toggleColumnCollapse = (status: OrderStatus) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  // Normalização para busca sem acentos e caracteres especiais
  const normalizeText = (text: string) =>
    (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const cleanAlphaNum = (text: string) =>
    normalizeText(text).replace(/[^a-z0-9]/g, '');

  // Verificação de correspondência e destaque
  const getMatchStatus = (order: ServiceOrder) => {
    const vehicle = getVehicle(order.vehicleId);
    const client = getClient(order.clientId);

    if (!searchTerm.trim()) {
      return { matches: true, matchClient: false, matchPlate: false, matchOS: false };
    }

    const termNorm = normalizeText(searchTerm.trim());
    const termClean = cleanAlphaNum(searchTerm.trim());

    const matchClient = Boolean(
      (client && normalizeText(client.name).includes(termNorm)) ||
      (client && cleanAlphaNum(client.phone).includes(termClean))
    );

    const matchPlate = Boolean(
      vehicle &&
      (normalizeText(vehicle.plate).includes(termNorm) ||
       cleanAlphaNum(vehicle.plate).includes(termClean) ||
       normalizeText(vehicle.model).includes(termNorm) ||
       normalizeText(vehicle.brand).includes(termNorm))
    );

    const matchOS = Boolean(
      normalizeText(order.orderNumber).includes(termNorm) ||
      cleanAlphaNum(order.orderNumber).includes(termClean) ||
      order.id.toLowerCase().includes(termNorm)
    );

    const matches = matchClient || matchPlate || matchOS;

    return { matches, matchClient, matchPlate, matchOS };
  };

  // Contagens de referência do banco geral
  const totalPatioCount = orders.filter((o) => o.status !== 'finalizado' && o.status !== 'cancelado').length;
  const totalFinishedCount = orders.filter((o) => o.status === 'finalizado').length;

  // Estatísticas agregadas por mecânico para o seletor rápido
  const mechanicStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number; profit: number }> = {};
    orders.forEach((o) => {
      if (o.mechanicId) {
        if (!stats[o.mechanicId]) stats[o.mechanicId] = { count: 0, total: 0, profit: 0 };
        stats[o.mechanicId].count += 1;
        stats[o.mechanicId].total += o.netTotal;
        stats[o.mechanicId].profit += o.netProfit;
      }
    });
    return stats;
  }, [orders]);

  // Filtragem
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (mechanicFilter && order.mechanicId !== mechanicFilter) return false;

      if (statusFilter === 'patio' && (order.status === 'finalizado' || order.status === 'cancelado')) {
        return false;
      }
      if (statusFilter === 'finalizado' && order.status !== 'finalizado') {
        return false;
      }

      return getMatchStatus(order).matches;
    });
  }, [orders, mechanicFilter, statusFilter, searchTerm]);

  // Ordenação
  const sortedAndFilteredOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest_value':
          return b.netTotal - a.netTotal;
        case 'lowest_value':
          return a.netTotal - b.netTotal;
        case 'highest_profit':
          return b.netProfit - a.netProfit;
        case 'warranty': {
          const warA = getOrderWarranty(a);
          const warB = getOrderWarranty(b);
          return warA.daysRemaining - warB.daysRemaining;
        }
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [filteredOrders, sortBy]);

  // Métricas financeiras e subtotais das ordens visíveis
  const visibleRevenue = useMemo(
    () => sortedAndFilteredOrders.reduce((acc, o) => acc + o.netTotal, 0),
    [sortedAndFilteredOrders]
  );
  const visibleProfit = useMemo(
    () => sortedAndFilteredOrders.reduce((acc, o) => acc + o.netProfit, 0),
    [sortedAndFilteredOrders]
  );
  const visibleMargin = visibleRevenue > 0 ? (visibleProfit / visibleRevenue) * 100 : 0;

  const visiblePatioOrders = useMemo(
    () => sortedAndFilteredOrders.filter((o) => o.status !== 'finalizado' && o.status !== 'cancelado'),
    [sortedAndFilteredOrders]
  );
  const visiblePatioRevenue = useMemo(() => visiblePatioOrders.reduce((acc, o) => acc + o.netTotal, 0), [visiblePatioOrders]);
  const visiblePatioProfit = useMemo(() => visiblePatioOrders.reduce((acc, o) => acc + o.netProfit, 0), [visiblePatioOrders]);

  const visibleFinishedOrders = useMemo(
    () => sortedAndFilteredOrders.filter((o) => o.status === 'finalizado'),
    [sortedAndFilteredOrders]
  );
  const visibleFinishedRevenue = useMemo(() => visibleFinishedOrders.reduce((acc, o) => acc + o.netTotal, 0), [visibleFinishedOrders]);
  const visibleFinishedProfit = useMemo(() => visibleFinishedOrders.reduce((acc, o) => acc + o.netProfit, 0), [visibleFinishedOrders]);

  const emptyColumnsCount = useMemo(() => {
    return KANBAN_COLUMNS.filter((col) => {
      return sortedAndFilteredOrders.filter((o) => o.status === col.status).length === 0;
    }).length;
  }, [sortedAndFilteredOrders]);

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    switch (current) {
      case 'orcamento':
        return 'aguardando_aprovacao';
      case 'aguardando_aprovacao':
        return 'aprovado';
      case 'aprovado':
        return 'em_andamento';
      case 'em_andamento':
        return 'pronto';
      case 'pronto':
        return 'finalizado';
      default:
        return null;
    }
  };

  const isFiltered = Boolean(searchTerm.trim() || mechanicFilter || statusFilter !== 'all' || sortBy !== 'recent');

  return (
    <div className="space-y-4">
      {/* Resumo Financeiro & Contagem Consolidada */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: No Pátio */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'patio' ? 'all' : 'patio')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'patio'
              ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
          title="Clique para filtrar apenas O.S. no pátio"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-amber-400" />
              No Pátio (Andamento)
            </span>
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {visiblePatioOrders.length}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
              R$ {visiblePatioRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Lucro: R$ {visiblePatioProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: Entregues / Faturadas */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'finalizado' ? 'all' : 'finalizado')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'finalizado'
              ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/50'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
          title="Clique para filtrar apenas O.S. finalizadas/entregues"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Entregue / Faturado
            </span>
            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {visibleFinishedOrders.length}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
              R$ {visibleFinishedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Lucro: R$ {visibleFinishedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 3: Faturamento Total Visível */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-400" />
              Faturamento Exibido
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {sortedAndFilteredOrders.length} de {orders.length} OS
            </span>
          </div>
          <div className="mt-2">
            <span className="text-sm sm:text-base font-black text-white font-mono">
              R$ {visibleRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 4: Lucro Real Total com Margem */}
        <div className="p-3 rounded-xl border border-amber-500/30 bg-gradient-to-br from-slate-900 to-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Lucro Real Geral
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-1.5 py-0.2 rounded border border-emerald-500/40">
              {Math.round(visibleMargin)}% margem
            </span>
          </div>
          <div className="mt-2">
            <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
              R$ {visibleProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros Rápidos */}
      <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-3">
        {/* Linha 1: Busca, Mecânico, Ordenação, Visão e Nova OS */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Campo de Busca Principal Unificado */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Localizar por Nome do Cliente, Placa, Nº O.S. ou Veículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-9 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Mecânico com somatório de O.S. */}
            <select
              value={mechanicFilter}
              onChange={(e) => setMechanicFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 shrink-0"
              title="Filtrar por Mecânico Responsável"
            >
              <option value="">Todos Mecânicos ({orders.length} OS)</option>
              {mechanics.map((m) => {
                const s = mechanicStats[m.id] || { count: 0, total: 0, profit: 0 };
                return (
                  <option key={m.id} value={m.id}>
                    {m.name} ({s.count} OS • R$ {s.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                  </option>
                );
              })}
            </select>

            {/* Ordenação rápida */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                title="Critério de ordenação"
              >
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigas</option>
                <option value="highest_value">Maior valor (R$)</option>
                <option value="lowest_value">Menor valor (R$)</option>
                <option value="highest_profit">Maior lucro (R$)</option>
                <option value="warranty">Garantia (mais próxima)</option>
              </select>
            </div>

            {/* Alternar modo de visão */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                  viewMode === 'kanban' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kanban Pátio
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lista
              </button>
            </div>

            {/* Botão Nova OS */}
            <button
              type="button"
              onClick={onNewOrder}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs shadow-sm transition-all shrink-0 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              Nova OS
            </button>
          </div>
        </div>

        {/* Linha 2: Filtros rápidos de Etapa e Controle de Colunas Vazias */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
          {/* Segmented Control de Status */}
          <div className="flex items-center gap-1 bg-slate-800/70 p-1 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-700 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas as O.S. ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('patio')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                statusFilter === 'patio'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Car className="w-3 h-3" />
              Apenas Pátio ({totalPatioCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('finalizado')}
              className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                statusFilter === 'finalizado'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              Faturadas ({totalFinishedCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão para Recolher/Ocultar Etapas Vazias (apenas no Kanban) */}
            {viewMode === 'kanban' && (
              <button
                type="button"
                onClick={() => setHideEmptyColumns(!hideEmptyColumns)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                  hideEmptyColumns
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={hideEmptyColumns ? 'Restaurar todas as colunas visíveis' : 'Recolher colunas com 0 O.S. para liberar espaço'}
              >
                {hideEmptyColumns ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                <span>
                  {hideEmptyColumns ? 'Mostrar 6 Etapas' : `Recolher Vazias (${emptyColumnsCount})`}
                </span>
              </button>
            )}

            {/* Limpar Filtros quando houver busca ativa */}
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setMechanicFilter('');
                  setStatusFilter('all');
                  setSortBy('recent');
                }}
                className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-1"
              >
                Limpar filtros ({filteredOrders.length} visíveis)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seletor Rápido de Etapas no Mobile (Atalho Horizontal com Contadores) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {KANBAN_COLUMNS.map((col) => {
          const count = sortedAndFilteredOrders.filter((o) => o.status === col.status).length;
          const shortName = col.label.replace(/^\d+\.\s*/, '').split('/')[0].trim();
          return (
            <button
              key={col.status}
              type="button"
              onClick={() => {
                const el = document.getElementById(`kanban-col-${col.status}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                count > 0
                  ? 'bg-slate-800/90 text-slate-200 border-slate-700 shadow-sm active:scale-95'
                  : 'bg-slate-900/60 text-slate-500 border-slate-800/80'
              }`}
            >
              <span>{shortName}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${col.badgeClass}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visão KANBAN */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4 items-start min-h-[calc(100vh-270px)] snap-x snap-mandatory scroll-smooth">
          {KANBAN_COLUMNS.map((column) => {
            const columnOrders = sortedAndFilteredOrders.filter((o) => o.status === column.status);
            const columnTotalValue = columnOrders.reduce((acc, o) => acc + o.netTotal, 0);
            const columnTotalProfit = columnOrders.reduce((acc, o) => acc + o.netProfit, 0);
            const columnMargin = columnTotalValue > 0 ? (columnTotalProfit / columnTotalValue) * 100 : 0;
            const isCollapsed = collapsedColumns[column.status] || (hideEmptyColumns && columnOrders.length === 0);

            // Coluna Recolhida / Compacta
            if (isCollapsed) {
              return (
                <div
                  key={column.status}
                  id={`kanban-col-${column.status}`}
                  onClick={() => toggleColumnCollapse(column.status)}
                  className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col items-center justify-between w-12 min-w-[48px] h-[calc(100vh-270px)] cursor-pointer transition-all group shrink-0 snap-center"
                  title={`Etapa: ${column.label} (${columnOrders.length} O.S.) - Clique para expandir`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${column.badgeClass}`}>
                      {columnOrders.length}
                    </span>
                    <Maximize2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <div className="[writing-mode:vertical-lr] rotate-180 text-[11px] font-bold text-slate-400 group-hover:text-slate-200 tracking-wider truncate py-4">
                    {column.label}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition-colors" />
                </div>
              );
            }

            // Coluna Expandida Normal
            return (
              <div
                key={column.status}
                id={`kanban-col-${column.status}`}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col w-[85vw] max-w-[88vw] sm:w-auto sm:min-w-[280px] sm:max-w-[320px] flex-1 min-h-[480px] sm:h-[calc(100vh-270px)] shrink-0 snap-center shadow-lg"
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-200 truncate">{column.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${column.badgeClass}`}>
                      {columnOrders.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleColumnCollapse(column.status)}
                      className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition-colors"
                      title="Recolher esta etapa"
                    >
                      <Minimize2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Subtotais da Etapa: Faturamento E Lucro Real com Margem */}
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 mb-2.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Faturamento:</span>
                    <span className="font-bold text-white">
                      R$ {columnTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400 mt-1">
                    <span className="flex items-center gap-1">
                      <span>Lucro:</span>
                      {columnTotalValue > 0 && (
                        <span className="text-[9px] bg-emerald-500/15 text-emerald-300 px-1 rounded font-bold border border-emerald-500/30">
                          {Math.round(columnMargin)}% mg
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-emerald-400">
                      R$ {columnTotalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Lista de Cartões de OS */}
                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                  {columnOrders.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 text-xs italic">
                      Nenhuma O.S. nesta etapa
                    </div>
                  ) : (
                    columnOrders.map((order) => {
                      const vehicle = getVehicle(order.vehicleId);
                      const client = getClient(order.clientId);
                      const mechanic = getMechanic(order.mechanicId);
                      const nextStatus = getNextStatus(order.status);
                      const matchInfo = getMatchStatus(order);
                      const marginPercent = order.netTotal > 0 ? (order.netProfit / order.netTotal) * 100 : 0;

                      return (
                        <div
                          key={order.id}
                          onClick={() => onOpenOrder(order)}
                          className={`bg-slate-800/80 hover:bg-slate-800 border ${
                            matchInfo.matches && searchTerm.trim() ? 'border-amber-500/80 ring-1 ring-amber-500/30' : column.color
                          } rounded-xl p-3 cursor-pointer shadow-sm transition-all hover:scale-[1.01] hover:shadow-md group`}
                        >
                          {/* Topo do Card: Número OS & Placa */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span
                              className={`text-xs font-mono font-black transition-all ${
                                matchInfo.matchOS && searchTerm.trim()
                                  ? 'bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded shadow-sm'
                                  : 'text-amber-400'
                              }`}
                            >
                              {order.orderNumber}
                            </span>
                            {vehicle?.plate && (
                              <div
                                className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider flex items-center gap-1 transition-all ${
                                  matchInfo.matchPlate && searchTerm.trim()
                                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black shadow-md'
                                    : 'bg-slate-950 border border-slate-700 text-white'
                                }`}
                              >
                                <span
                                  className={
                                    matchInfo.matchPlate && searchTerm.trim()
                                      ? 'text-slate-900 font-black text-[8px]'
                                      : 'text-[8px] text-blue-400'
                                  }
                                >
                                  BR
                                </span>
                                {vehicle.plate}
                              </div>
                            )}
                          </div>

                          {/* Modelo e Cliente */}
                          <div className="mb-2">
                            <h4 className="text-xs font-bold text-white truncate">
                              {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Veículo não informado'}
                            </h4>
                            <p
                              className={`text-[11px] truncate flex items-center gap-1 mt-0.5 transition-all ${
                                matchInfo.matchClient && searchTerm.trim()
                                  ? 'text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30'
                                  : 'text-slate-400'
                              }`}
                            >
                              <User
                                className={`w-3 h-3 shrink-0 ${
                                  matchInfo.matchClient && searchTerm.trim() ? 'text-amber-400' : 'text-slate-500'
                                }`}
                              />
                              {client?.name || 'Cliente'}
                            </p>
                          </div>

                          {/* Mecânico Atribuído */}
                          {mechanic && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1.5">
                              <Wrench className="w-3 h-3 text-amber-500/70 shrink-0" />
                              <span>Mecânico: <strong className="text-slate-300">{mechanic.name}</strong></span>
                            </div>
                          )}

                          {/* Data do Serviço & Vencimento da Garantia (Apenas alerta quando perto do vencimento) */}
                          {(() => {
                            const warranty = getOrderWarranty(order);
                            if (!warranty.hasServiceDate) {
                              return (
                                <div className="text-[10px] text-slate-400 mb-2 py-1 px-2 bg-slate-950/60 rounded border border-slate-800/80 flex items-center justify-between">
                                  <span>Entrada: <span className="text-slate-300 font-medium">{warranty.formattedEntryDate}</span></span>
                                  <span className="text-slate-500">Garantia 90d após aprov.</span>
                                </div>
                              );
                            }

                            const isExpired = warranty.isExpired;
                            const isExpiringSoon = !isExpired && warranty.daysRemaining <= 15;

                            return (
                              <div
                                className={`text-[10px] mb-2 py-1 px-2 rounded border flex items-center justify-between transition-colors ${
                                  isExpired
                                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                    : isExpiringSoon
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                                }`}
                              >
                                <span>
                                  Serviço: <span className="text-slate-300 font-medium">{warranty.formattedServiceDate}</span>
                                </span>
                                <span>
                                  {isExpired ? (
                                    <strong className="text-red-400 font-bold flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Garantia vencida
                                    </strong>
                                  ) : isExpiringSoon ? (
                                    <strong className="text-amber-400 font-bold flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Vence em {warranty.daysRemaining}d ({warranty.formattedExpiryDate})
                                    </strong>
                                  ) : (
                                    <span className="text-slate-400">
                                      Garantia até <span className="text-slate-300 font-medium">{warranty.formattedExpiryDate}</span>
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Valores: Total, Lucro Real e Margem Discreta */}
                          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                            <div>
                              <div className="text-xs font-black text-white font-mono">
                                R$ {order.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                                <span>Lucro: R$ {order.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  title={`Margem de lucro real: ${marginPercent.toFixed(1)}%`}
                                >
                                  {Math.round(marginPercent)}% mg
                                </span>
                              </div>
                            </div>

                            {/* Ações Rápidas no Card */}
                            <div className="flex items-center gap-1">
                              {/* WhatsApp rápido */}
                              {client?.phone && vehicle && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (order.status === 'pronto') {
                                      const text = WhatsAppService.generateCarReadyMessage(order, client, vehicle);
                                      WhatsAppService.openWhatsAppChat(client.phone, text);
                                    } else {
                                      const text = WhatsAppService.generateBudgetMessage(order, client, vehicle);
                                      WhatsAppService.openWhatsAppChat(client.phone, text);
                                    }
                                  }}
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 transition-colors"
                                  title="Enviar no WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Imprimir recibo */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPrintReceipt(order);
                                }}
                                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                                title="Imprimir Recibo"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Botão Finalizar / Receber em 1 Toque */}
                              {order.status === 'pronto' ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCheckoutOrder(order);
                                  }}
                                  className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded text-[11px] shadow-sm flex items-center gap-1 transition-all active:scale-95"
                                  title="Finalizar O.S. e Receber (Pix / Cartão / Dinheiro)"
                                >
                                  <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Receber</span>
                                </button>
                              ) : nextStatus ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (nextStatus === 'finalizado') {
                                      setCheckoutOrder(order);
                                    } else {
                                      onUpdateStatus(order.id, nextStatus);
                                    }
                                  }}
                                  className="p-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded transition-colors"
                                  title="Avançar etapa"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Visão em LISTA / TABELA */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nº O.S.</th>
                  <th className="py-3 px-4">Veículo / Placa</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Mecânico</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Garantia CDC</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-right">Lucro Real</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedAndFilteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Search className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="font-semibold text-slate-300">Nenhuma Ordem de Serviço encontrada</p>
                        <p className="text-[11px] text-slate-500">
                          {searchTerm.trim() ? `Nenhum resultado para "${searchTerm}" no filtro selecionado.` : 'Nenhuma O.S. com os filtros ativos.'}
                        </p>
                        {isFiltered && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchTerm('');
                              setMechanicFilter('');
                              setStatusFilter('all');
                              setSortBy('recent');
                            }}
                            className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                          >
                            Limpar filtros de busca
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredOrders.map((order) => {
                    const vehicle = getVehicle(order.vehicleId);
                    const client = getClient(order.clientId);
                    const mechanic = getMechanic(order.mechanicId);
                    const matchInfo = getMatchStatus(order);
                    const warranty = getOrderWarranty(order);
                    const marginPercent = order.netTotal > 0 ? (order.netProfit / order.netTotal) * 100 : 0;

                    const isExpired = warranty.isExpired;
                    const isExpiringSoon = !isExpired && warranty.daysRemaining <= 15;

                    return (
                      <tr
                        key={order.id}
                        onClick={() => onOpenOrder(order)}
                        className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                          matchInfo.matches && searchTerm.trim() ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono">
                          <span
                            className={
                              matchInfo.matchOS && searchTerm.trim()
                                ? 'bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black shadow-sm text-xs'
                                : 'text-amber-400 font-bold text-xs'
                            }
                          >
                            {order.orderNumber}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {warranty.hasServiceDate ? 'Serviço: ' : 'Entrada: '}
                            <span className="text-slate-300">
                              {warranty.hasServiceDate ? warranty.formattedServiceDate : warranty.formattedEntryDate}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className={`font-bold ${matchInfo.matchPlate && searchTerm.trim() ? 'text-amber-300' : 'text-white'}`}>
                            {vehicle?.brand} {vehicle?.model}
                          </div>
                          <span
                            className={`font-mono text-[11px] px-1 py-0.5 rounded ${
                              matchInfo.matchPlate && searchTerm.trim()
                                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                                : 'text-slate-400'
                            }`}
                          >
                            {vehicle?.plate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={
                              matchInfo.matchClient && searchTerm.trim()
                                ? 'text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded inline-block border border-amber-500/30'
                                : 'text-slate-200'
                            }
                          >
                            {client?.name}
                          </div>
                          <span className="text-[11px] text-slate-500 block">{client?.phone}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {mechanic?.name || 'Não atribuído'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 capitalize font-medium">
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {warranty.hasServiceDate ? (
                            isExpired ? (
                              <span className="text-red-400 font-bold text-[11px] flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Vencida ({warranty.formattedExpiryDate})
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="text-amber-400 font-bold text-[11px] flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Vence em {warranty.daysRemaining}d
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[11px]">
                                Até {warranty.formattedExpiryDate}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500 text-[11px]">90d após aprov.</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-white font-mono">
                          R$ {order.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-emerald-400 font-mono block">
                            R$ {order.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-emerald-300/80 font-mono">
                            {Math.round(marginPercent)}% mg
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {order.status !== 'finalizado' && (
                              <button
                                type="button"
                                onClick={() => setCheckoutOrder(order)}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[11px] transition-colors flex items-center gap-1 shadow-sm"
                                title="Finalizar e Receber O.S."
                              >
                                <DollarSign className="w-3 h-3 stroke-[2.5]" />
                                Receber
                              </button>
                            )}
                            {client?.phone && vehicle && (
                              <button
                                type="button"
                                onClick={() => {
                                  const text = WhatsAppService.generateBudgetMessage(order, client, vehicle);
                                  WhatsAppService.openWhatsAppChat(client.phone, text);
                                }}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onPrintReceipt(order)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                              title="Imprimir"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Rodapé com Totais da Tabela */}
              {sortedAndFilteredOrders.length > 0 && (
                <tfoot className="bg-slate-950 border-t border-slate-800 text-xs font-bold text-white">
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-slate-400">
                      Total ({sortedAndFilteredOrders.length} O.S. exibidas):
                    </td>
                    <td className="py-3 px-4 text-right font-black text-white font-mono">
                      R$ {visibleRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
                      <div>
                        R$ {visibleProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-emerald-300/80 font-normal">
                        {Math.round(visibleMargin)}% margem média
                      </div>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Modal de Finalização / Checkout Rápido da OS */}
      <QuickOrderCheckoutModal
        order={checkoutOrder}
        isOpen={!!checkoutOrder}
        onClose={() => setCheckoutOrder(null)}
        onConfirmCheckout={(ord, method, isPaid) => {
          if (onQuickCheckout) {
            onQuickCheckout(ord, method, isPaid);
          } else {
            onUpdateStatus(ord.id, 'finalizado');
          }
          setCheckoutOrder(null);
        }}
        client={checkoutOrder ? getClient(checkoutOrder.clientId) : undefined}
        vehicle={checkoutOrder ? getVehicle(checkoutOrder.vehicleId) : undefined}
        mechanic={checkoutOrder ? getMechanic(checkoutOrder.mechanicId) : undefined}
      />
    </div>
  );
};
