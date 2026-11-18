import React, { useState } from 'react';
import {
  ServiceOrder,
  Client,
  Vehicle,
  Mechanic,
  OrderStatus,
} from '../types';
import {
  Search,
  Filter,
  Plus,
  MessageCircle,
  Clock,
  Printer,
  ChevronRight,
  Car,
  User,
  Wrench,
  CheckCircle,
} from 'lucide-react';
import { WhatsAppService } from '../services/whatsapp';

interface KanbanBoardProps {
  orders: ServiceOrder[];
  clients: Client[];
  vehicles: Vehicle[];
  mechanics: Mechanic[];
  onOpenOrder: (order: ServiceOrder) => void;
  onNewOrder: () => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
  onPrintReceipt: (order: ServiceOrder) => void;
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
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mechanicFilter, setMechanicFilter] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
  const getVehicle = (vehicleId: string) => vehicles.find((v) => v.id === vehicleId);
  const getMechanic = (mechanicId: string) => mechanics.find((m) => m.id === mechanicId);

  // Filtragem
  const filteredOrders = orders.filter((order) => {
    const vehicle = getVehicle(order.vehicleId);
    const client = getClient(order.clientId);
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      !searchTerm ||
      order.orderNumber.toLowerCase().includes(searchLower) ||
      vehicle?.plate.toLowerCase().includes(searchLower) ||
      vehicle?.model.toLowerCase().includes(searchLower) ||
      client?.name.toLowerCase().includes(searchLower);

    const matchesMechanic = !mechanicFilter || order.mechanicId === mechanicFilter;

    return matchesSearch && matchesMechanic;
  });

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

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por placa, cliente ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={mechanicFilter}
            onChange={(e) => setMechanicFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">Todos Mecânicos</option>
            {mechanics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternar modo de visão */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Kanban Pátio
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                viewMode === 'list' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Lista
            </button>
          </div>

          <button
            onClick={onNewOrder}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            Nova OS
          </button>
        </div>
      </div>

      {/* Visão KANBAN */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((column) => {
            const columnOrders = filteredOrders.filter((o) => o.status === column.status);
            const columnTotalValue = columnOrders.reduce((acc, o) => acc + o.netTotal, 0);

            return (
              <div
                key={column.status}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col min-w-[270px] max-h-[calc(100vh-210px)]"
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-200 truncate">{column.label}</span>
                  <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${column.badgeClass}`}>
                    {columnOrders.length}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 mb-2 font-mono flex items-center justify-between">
                  <span>Subtotal da etapa:</span>
                  <span className="font-bold text-slate-300">R$ {columnTotalValue.toFixed(2)}</span>
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

                      return (
                        <div
                          key={order.id}
                          onClick={() => onOpenOrder(order)}
                          className={`bg-slate-800/80 hover:bg-slate-800 border ${column.color} rounded-xl p-3 cursor-pointer shadow-sm transition-all hover:scale-[1.01] hover:shadow-md group`}
                        >
                          {/* Topo do Card: Número OS & Placa */}
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-xs font-black text-amber-400 font-mono">
                              {order.orderNumber}
                            </span>
                            {vehicle?.plate && (
                              <div className="bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-white tracking-wider flex items-center gap-1">
                                <span className="text-[8px] text-blue-400">BR</span>
                                {vehicle.plate}
                              </div>
                            )}
                          </div>

                          {/* Modelo e Cliente */}
                          <div className="mb-2">
                            <h4 className="text-xs font-bold text-white truncate">
                              {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Veículo não informado'}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-slate-500 shrink-0" />
                              {client?.name || 'Cliente'}
                            </p>
                          </div>

                          {/* Mecânico Atribuído */}
                          {mechanic && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-2">
                              <Wrench className="w-3 h-3 text-amber-500/70 shrink-0" />
                              <span>Mecânico: <strong className="text-slate-300">{mechanic.name}</strong></span>
                            </div>
                          )}

                          {/* Valores: Total e Lucro Real */}
                          <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                            <div>
                              <div className="text-xs font-black text-white">
                                R$ {order.netTotal.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-emerald-400 font-medium">
                                Lucro: R$ {order.netProfit.toFixed(2)}
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

                              {/* Avançar status */}
                              {nextStatus && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(order.id, nextStatus);
                                  }}
                                  className="p-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded transition-colors"
                                  title="Avançar etapa"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
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
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-right">Lucro Real</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      Nenhuma Ordem de Serviço encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const vehicle = getVehicle(order.vehicleId);
                    const client = getClient(order.clientId);
                    const mechanic = getMechanic(order.mechanicId);

                    return (
                      <tr
                        key={order.id}
                        onClick={() => onOpenOrder(order)}
                        className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">
                            {vehicle?.brand} {vehicle?.model}
                          </div>
                          <span className="font-mono text-[11px] text-slate-400">
                            {vehicle?.plate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200">{client?.name}</div>
                          <span className="text-[11px] text-slate-500">{client?.phone}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {mechanic?.name || 'Não atribuído'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 capitalize font-medium">
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-white">
                          R$ {order.netTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          R$ {order.netProfit.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
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
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
