import React from 'react';
import {
  ServiceOrder,
  Part,
  Client,
  Vehicle,
  OrderStatus,
} from '../types';
import {
  DollarSign,
  TrendingUp,
  Car,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  Wrench,
  ArrowRight,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { WhatsAppService } from '../services/whatsapp';

interface DashboardViewProps {
  orders: ServiceOrder[];
  parts: Part[];
  clients: Client[];
  vehicles: Vehicle[];
  onOpenOrder: (order: ServiceOrder) => void;
  onNavigateTab: (tab: 'orders' | 'parts' | 'clients' | 'financial') => void;
  onNewOrder: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  parts,
  clients,
  vehicles,
  onOpenOrder,
  onNavigateTab,
  onNewOrder,
}) => {
  // Cálculos Gerenciais
  const totalFaturamento = orders
    .filter((o) => o.status === 'finalizado' || o.isPaid)
    .reduce((acc, o) => acc + o.netTotal, 0);

  const totalLucroReal = orders
    .filter((o) => o.status === 'finalizado' || o.isPaid)
    .reduce((acc, o) => acc + o.netProfit, 0);

  const totalOSFinalizadas = orders.filter((o) => o.status === 'finalizado' || o.isPaid).length;
  const ticketMedio = totalOSFinalizadas > 0 ? totalFaturamento / totalOSFinalizadas : 0;

  // Carros no Pátio (Em andamento, aguardando aprovação, prontos)
  const activeOrders = orders.filter(
    (o) => o.status !== 'finalizado' && o.status !== 'cancelado'
  );

  // Peças com estoque baixo
  const lowStockParts = parts.filter((p) => p.currentStock <= p.minStock);

  // Mapeadores auxiliares
  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
  const getVehicle = (vehicleId: string) => vehicles.find((v) => v.id === vehicleId);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'orcamento':
        return <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded font-medium">Orçamento</span>;
      case 'aguardando_aprovacao':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2 py-0.5 rounded font-medium">Aguardando Aprovação</span>;
      case 'aprovado':
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2 py-0.5 rounded font-medium">Aprovado</span>;
      case 'em_andamento':
        return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs px-2 py-0.5 rounded font-medium animate-pulse">Em Execução</span>;
      case 'pronto':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2 py-0.5 rounded font-bold">Pronto para Entrega</span>;
      case 'finalizado':
        return <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded font-medium">Finalizada / Paga</span>;
      default:
        return <span className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded">Cancelada</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Faturamento Concluído
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              R$ {totalFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {totalOSFinalizadas} OS faturadas
            </p>
          </div>
        </div>

        {/* Lucro Real Líquido */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 shadow-sm relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Lucro Real da Oficina</span>
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              ★
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400">
              R$ {totalLucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Após deduzir peças e comissões dos mecânicos
            </p>
          </div>
        </div>

        {/* Carros no Pátio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Veículos no Pátio
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{activeOrders.length}</div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Em diagnóstico e execução
            </p>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ticket Médio / O.S.
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">Peças + Mão de obra</p>
          </div>
        </div>
      </div>

      {/* Grid Principal: Pátio em Tempo Real & Alertas de Estoque */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pátio & Ordens Ativas (2 colunas) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-amber-400" />
                Pátio da Oficina (Veículos em Andamento)
              </h3>
              <p className="text-xs text-slate-400">
                Ordens abertas que necessitam de atenção ou liberação
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
            >
              Ver Kanban Completo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum veículo em andamento no pátio no momento.
                <button
                  onClick={onNewOrder}
                  className="block mx-auto mt-2 text-xs font-bold text-amber-400 hover:underline"
                >
                  + Abrir Nova Ordem de Serviço
                </button>
              </div>
            ) : (
              activeOrders.slice(0, 5).map((order) => {
                const vehicle = getVehicle(order.vehicleId);
                const client = getClient(order.clientId);

                return (
                  <div
                    key={order.id}
                    onClick={() => onOpenOrder(order)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl cursor-pointer transition-all hover:border-slate-600 gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded-lg bg-slate-950 border border-slate-700 flex flex-col items-center justify-center font-mono">
                        <span className="text-[9px] text-slate-400 leading-none">BR</span>
                        <span className="text-xs font-bold text-white tracking-wider">
                          {vehicle?.plate || 'S/PLACA'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {vehicle?.brand} {vehicle?.model}
                          </span>
                          <span className="text-xs text-slate-400">({order.orderNumber})</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Cliente: <span className="text-slate-300">{client?.name || 'Cliente'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/50">
                      <div>{getStatusBadge(order.status)}</div>
                      <div className="text-right">
                        <div className="text-sm font-black text-amber-400">
                          R$ {order.netTotal.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Lucro: R$ {order.netProfit.toFixed(2)}
                        </div>
                      </div>

                      {/* Botão rápido WhatsApp */}
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
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors"
                          title="Enviar Mensagem WhatsApp ao Cliente"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Alertas de Peças & Estoque */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Peças com Estoque Baixo
                </h3>
                <p className="text-xs text-slate-400">Itens no limite ou abaixo do mínimo</p>
              </div>
              <span className="bg-amber-500/20 text-amber-400 font-bold text-xs px-2 py-0.5 rounded-full">
                {lowStockParts.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {lowStockParts.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  Estoque de peças 100% regularizado!
                </div>
              ) : (
                lowStockParts.map((part) => (
                  <div
                    key={part.id}
                    className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-slate-200 truncate">{part.description}</div>
                      <div className="text-[11px] text-slate-400">
                        Cód: {part.code} | {part.brand}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`font-black ${
                          part.currentStock === 0 ? 'text-red-400' : 'text-amber-400'
                        }`}
                      >
                        {part.currentStock} {part.unit}
                      </div>
                      <div className="text-[10px] text-slate-500">Mín: {part.minStock}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={() => onNavigateTab('parts')}
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Package className="w-4 h-4" />
              Importar XML de Autopeças (NF-e)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
