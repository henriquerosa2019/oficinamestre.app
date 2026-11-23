import React, { useState } from 'react';
import {
  MaintenanceRecord,
  MaintenanceAlert,
  GroupedVehicleAlert,
  Vehicle,
  Client,
  PreventiveServiceType,
  VehicleUsageProfile,
} from '../types';
import { PreventiveMaintenanceService } from '../services/preventiveMaintenance';
import { WhatsAppService } from '../services/whatsapp';
import {
  BellRing,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Plus,
  Car,
  User,
  Gauge,
  Filter,
  Flame,
  Briefcase,
  Trash2,
  Check,
  RotateCcw,
  Zap,
  Layers,
  Copy,
} from 'lucide-react';

// Ícone oficial vetorial do WhatsApp com cores oficiais
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

interface PreventiveMaintenanceViewProps {
  records: MaintenanceRecord[];
  vehicles: Vehicle[];
  clients: Client[];
  onSaveRecord: (record: MaintenanceRecord) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateContactStatus: (recordIds: string[], status: 'pendente' | 'avisado' | 'agendado') => void;
  onOpenNewOrderFromAlert: (vehicle: Vehicle, client: Client, recommendedServices: string[]) => void;
}

export const PreventiveMaintenanceView: React.FC<PreventiveMaintenanceViewProps> = ({
  records,
  vehicles,
  clients,
  onSaveRecord,
  onDeleteRecord,
  onUpdateContactStatus,
  onOpenNewOrderFromAlert,
}) => {
  const [profileFilter, setProfileFilter] = useState<'todos' | VehicleUsageProfile>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | MaintenanceAlert['status']>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedVehicleId, setCopiedVehicleId] = useState<string | null>(null);

  // Form de novo registro preventivo manual
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '');
  const [serviceName, setServiceName] = useState('Troca de Óleo e Filtros');
  const [serviceType, setServiceType] = useState<PreventiveServiceType>('troca_oleo');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileageAtService, setMileageAtService] = useState(50000);
  const [usageProfile, setUsageProfile] = useState<VehicleUsageProfile>('normal');

  // Calcula todos os alertas individuais e depois consolida por veículo
  const allAlerts = PreventiveMaintenanceService.calculateAlerts(records, vehicles, clients);
  const groupedAlerts = PreventiveMaintenanceService.groupAlertsByVehicle(allAlerts);

  // Filtros aplicados sobre os veículos agrupados
  const filteredGroups = groupedAlerts.filter((group) => {
    const matchesProfile =
      profileFilter === 'todos' || group.vehicle.usageProfile === profileFilter;
    const matchesStatus =
      statusFilter === 'todos' || group.worstStatus === statusFilter;
    return matchesProfile && matchesStatus;
  });

  // Métricas de Veículos por Prioridade de Urgência
  const urgentCount = groupedAlerts.filter((g) => g.worstStatus === 'urgente_1dia').length;
  const weekAlertCount = groupedAlerts.filter((g) => g.worstStatus === 'alerta_7dias').length;
  const expiredCount = groupedAlerts.filter((g) => g.worstStatus === 'vencido').length;
  const inOrderCount = groupedAlerts.filter((g) => g.worstStatus === 'em_dia').length;

  // Disparo de WhatsApp consolidado para o veículo (Combo ou Individual)
  const handleSendWhatsApp = (group: GroupedVehicleAlert) => {
    const message = PreventiveMaintenanceService.generateGroupedWhatsAppReminder(group);
    WhatsAppService.openWhatsAppChat(group.client.phone, message);
    // Automaticamente marca os registros do veículo como "avisado"
    const recordIds = group.records.map((r) => r.id);
    onUpdateContactStatus(recordIds, 'avisado');
  };

  // Copia o texto do lembrete preventivo para colar no WhatsApp Web ou editar
  const handleCopyMessage = async (group: GroupedVehicleAlert) => {
    const message = PreventiveMaintenanceService.generateGroupedWhatsAppReminder(group);
    const success = await WhatsAppService.copyToClipboard(message);
    if (success) {
      setCopiedVehicleId(group.vehicle.id);
      setTimeout(() => {
        setCopiedVehicleId(null);
      }, 2500);
    }
  };

  // Alterna status de contato do veículo
  const handleToggleContactStatus = (group: GroupedVehicleAlert) => {
    const recordIds = group.records.map((r) => r.id);
    const newStatus = group.isContacted ? 'pendente' : 'avisado';
    onUpdateContactStatus(recordIds, newStatus);
  };

  // Atalho direto para abrir nova Ordem de Serviço com os serviços recomendados
  const handleOpenOrder = (group: GroupedVehicleAlert) => {
    const serviceNames = group.records.map((r) => r.serviceName);
    onOpenNewOrderFromAlert(group.vehicle, group.client, serviceNames);
  };

  const handleCreateManualRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!vehicle) return;

    const { intervalDays, intervalMonths, intervalKm } =
      PreventiveMaintenanceService.getIntervalParams(serviceType, usageProfile);

    const baseDate = new Date(completedDate);
    const returnDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    const newRecord: MaintenanceRecord = {
      id: 'mrec-' + Date.now(),
      vehicleId: vehicle.id,
      clientId: vehicle.clientId,
      serviceType,
      serviceName,
      completedDate,
      mileageAtService: Number(mileageAtService),
      usageProfile,
      estimatedReturnDate: returnDate.toISOString().split('T')[0],
      estimatedReturnMileage: Number(mileageAtService) + intervalKm,
      intervalMonths,
      intervalKm,
      contactStatus: 'pendente',
    };

    onSaveRecord(newRecord);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner Explicativo de Inteligência de Pós-Venda */}
      <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 mt-0.5">
              <BellRing className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  CRM Preventivo & Estimativa Inteligente de Retorno
                </h2>
                <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Fidelização Ativa
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                O sistema memoriza os serviços realizados, agrupa pendências por veículo e calcula quando cada cliente deve retornar.
                Para <strong>motoristas de aplicativo (uso severo)</strong> que rodam intensamente, o prazo é encurtado
                automaticamente para garantir aviso antecipado e manter sua oficina sempre cheia!
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Lançar Histórico Manual
          </button>
        </div>
      </div>

      {/* Cards de Alertas por Janela de Tempo (Filtros Clicáveis) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vence em 1 Dia / Urgente */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'urgente_1dia' ? 'todos' : 'urgente_1dia')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
            statusFilter === 'urgente_1dia'
              ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/25 shadow-lg shadow-red-950/40'
              : 'border-red-500/40 hover:border-red-500 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-400 animate-pulse" />
              1º Urgente (Hoje / Amanhã)
            </span>
            <span className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 font-black text-xs flex items-center justify-center">
              {urgentCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Ação imediata: avisar hoje para fechar a agenda prioritária.
          </div>
        </div>

        {/* Vence na Próxima Semana (7 Dias) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'alerta_7dias' ? 'todos' : 'alerta_7dias')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
            statusFilter === 'alerta_7dias'
              ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-950/25 shadow-lg shadow-amber-950/40'
              : 'border-amber-500/40 hover:border-amber-500 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              2º Vence em 7 Dias
            </span>
            <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
              {weekAlertCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Tempo ideal para o cliente se programar e agendar horário.
          </div>
        </div>

        {/* Vencidos */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'vencido' ? 'todos' : 'vencido')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
            statusFilter === 'vencido'
              ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/25 shadow-lg shadow-rose-950/40'
              : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              3º Revisões Vencidas
            </span>
            <span className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 font-black text-xs flex items-center justify-center">
              {expiredCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Clientes que ultrapassaram o tempo seguro de rodagem.
          </div>
        </div>

        {/* Em Dia */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'em_dia' ? 'todos' : 'em_dia')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
            statusFilter === 'em_dia'
              ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/25 shadow-lg shadow-emerald-950/40'
              : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              4º Em Dia (+7 Dias)
            </span>
            <span className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">
              {inOrderCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Próximas manutenções com prazo confortável.
          </div>
        </div>
      </div>

      {/* Filtros de Perfil de Rodagem e Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-300">Perfil de Rodagem:</span>
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setProfileFilter('todos')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                profileFilter === 'todos' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setProfileFilter('app_severo')}
              className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                profileFilter === 'app_severo'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400'
              }`}
            >
              <Briefcase className="w-3 h-3" />
              Motoristas de App (Uso Severo)
            </button>
            <button
              onClick={() => setProfileFilter('normal')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                profileFilter === 'normal' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Passeio / Normal
            </button>
          </div>
        </div>

        {statusFilter !== 'todos' && (
          <button
            onClick={() => setStatusFilter('todos')}
            className="text-xs text-amber-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Limpar filtro ({statusFilter.replace('_', ' ')})
          </button>
        )}
      </div>

      {/* Lista de Alertas Agrupados por Veículo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGroups.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-sm">
            Nenhum alerta de manutenção encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const { vehicle, client, alerts, worstStatus, minDaysRemaining, isContacted } = group;
            const isApp = vehicle.usageProfile === 'app_severo';
            const isCombo = alerts.length > 1;

            return (
              <div
                key={vehicle.id}
                className={`p-4 rounded-2xl border transition-all shadow-md flex flex-col justify-between gap-4 ${
                  worstStatus === 'urgente_1dia'
                    ? 'bg-red-950/20 border-red-500/60 hover:border-red-400'
                    : worstStatus === 'alerta_7dias'
                    ? 'bg-amber-950/20 border-amber-500/60 hover:border-amber-400'
                    : worstStatus === 'vencido'
                    ? 'bg-slate-900/90 border-rose-800/70 hover:border-rose-700'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Cabeçalho do Card: Placa, Modelo, Badges de Urgência & Combo */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                        <span className="text-[9px] text-blue-400 font-sans">BR</span>
                        {vehicle.plate}
                      </div>
                      <span className="text-sm font-bold text-white">
                        {vehicle.brand} {vehicle.model}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Selo Combo quando há múltiplos serviços */}
                      {isCombo && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Layers className="w-3 h-3 text-amber-400" />
                          Combo ({alerts.length} itens)
                        </span>
                      )}

                      {/* Badge de Urgência do Veículo */}
                      {worstStatus === 'urgente_1dia' && (
                        <span className="bg-red-500 text-white font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full animate-bounce shadow-sm shadow-red-500/50">
                          {minDaysRemaining === 0 ? 'Vence Hoje!' : 'Vence Amanhã!'}
                        </span>
                      )}
                      {worstStatus === 'alerta_7dias' && (
                        <span className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                          Em {minDaysRemaining} dias
                        </span>
                      )}
                      {worstStatus === 'vencido' && (
                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Vencido há {Math.abs(minDaysRemaining)} dias
                        </span>
                      )}
                      {worstStatus === 'em_dia' && (
                        <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Em {minDaysRemaining} dias
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cliente, Telefone, Perfil de Rodagem e Status de Contato */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pb-2.5 mb-3 border-b border-slate-800 gap-2">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-white">{client.name}</strong>
                      <span className="text-slate-400">({client.phone})</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Status de Fechamento de Ciclo (Avisado / Pendente) */}
                      {isContacted ? (
                        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Avisado - Aguardando Resposta
                        </span>
                      ) : (
                        <span className="bg-slate-800/80 text-amber-400 border border-amber-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          Pendente de Contato
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isApp
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isApp ? '🚕 App (Severo)' : '🚗 Passeio'}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Serviços Agrupados do Veículo */}
                  <div className="space-y-2">
                    {alerts.map((item: MaintenanceAlert) => {
                      const { record, daysRemaining, status } = item;
                      return (
                        <div
                          key={record.id}
                          className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              {record.serviceName}
                            </span>
                            <div className="flex items-center gap-2">
                              {status === 'vencido' ? (
                                <span className="text-[10px] font-bold text-rose-400">
                                  Vencido há {Math.abs(daysRemaining)} d
                                </span>
                              ) : status === 'urgente_1dia' ? (
                                <span className="text-[10px] font-bold text-red-400">
                                  {daysRemaining === 0 ? 'Vence Hoje' : 'Vence Amanhã'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  Em {daysRemaining} dias
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => onDeleteRecord(record.id)}
                                className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                                title="Excluir este serviço"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                            <div>
                              Última Troca: <strong className="text-slate-200">{record.mileageAtService.toLocaleString('pt-BR')} km</strong> ({new Date(record.completedDate).toLocaleDateString('pt-BR')})
                            </div>
                            <div>
                              Retorno Previsto: <strong className="text-amber-400">{record.estimatedReturnMileage.toLocaleString('pt-BR')} km</strong> ({new Date(record.estimatedReturnDate).toLocaleDateString('pt-BR')})
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rodapé do Card: Ações (Marcar como Avisado + Abrir O.S. + WhatsApp Combo/Individual) */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Botão de Fechamento de Ciclo: Marcar como Avisado / Desmarcar */}
                    <button
                      type="button"
                      onClick={() => handleToggleContactStatus(group)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        isContacted
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-emerald-500/30'
                      }`}
                      title={isContacted ? 'Voltar para pendente de contato' : 'Marcar que já fez contato com o cliente'}
                    >
                      {isContacted ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Desmarcar Aviso</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Marcar Avisado</span>
                        </>
                      )}
                    </button>

                    {/* Botão Atalho: Abrir Nova O.S. Já Preenchida com Serviços Recomendados */}
                    <button
                      type="button"
                      onClick={() => handleOpenOrder(group)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 transition-all hover:scale-[1.02]"
                      title="Abre uma nova Ordem de Serviço puxando este cliente, placa e os serviços pendentes"
                    >
                      <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>⚡ Abrir O.S.</span>
                    </button>

                    {/* Botão Copiar Mensagem para a Área de Transferência */}
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(group)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        copiedVehicleId === group.vehicle.id
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-950/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                      }`}
                      title="Copiar texto da mensagem para a memória (para colar no WhatsApp Web ou editar antes de enviar)"
                    >
                      {copiedVehicleId === group.vehicle.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          <span className="text-[11px] font-bold text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] text-slate-300 hidden sm:inline">Copiar</span>
                        </>
                      )}
                    </button>

                    {/* Botão WhatsApp com Ícone Oficial SVG e Mensagem Consolidada */}
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(group)}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-2 px-3 rounded-xl text-xs shadow-md shadow-emerald-950/50 transition-all hover:scale-[1.01]"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      <span>
                        {isCombo
                          ? `Avisar no WhatsApp (Combo ${alerts.length} itens)`
                          : worstStatus === 'urgente_1dia'
                          ? 'Avisar Urgente (Vence Amanhã)'
                          : worstStatus === 'alerta_7dias'
                          ? 'Avisar (Vence em 7 Dias)'
                          : worstStatus === 'vencido'
                          ? 'Avisar Revisão Vencida'
                          : 'Enviar Lembrete'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Lançar Histórico Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <form onSubmit={handleCreateManualRecord}>
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Lançar Manutenção Preventiva</h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Veículo do Cliente *</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    {vehicles.map((v) => {
                      const c = clients.find((cli) => cli.id === v.clientId);
                      return (
                        <option key={v.id} value={v.id}>
                          {v.plate} - {v.brand} {v.model} ({c?.name})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Tipo de Serviço Preventivo</label>
                  <select
                    value={serviceType}
                    onChange={(e) => {
                      const st = e.target.value as PreventiveServiceType;
                      setServiceType(st);
                      if (st === 'troca_oleo') setServiceName('Troca de Óleo e Filtros');
                      else if (st === 'correia_dentada') setServiceName('Troca de Correia Dentada e Tensor');
                      else if (st === 'freios') setServiceName('Revisão e Troca de Pastilhas de Freio');
                      else if (st === 'alinhamento') setServiceName('Alinhamento e Balanceamento 3D');
                      else setServiceName('Revisão Geral Preventiva');
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="troca_oleo">Troca de Óleo e Filtros (10.000 km / 1 ano)</option>
                    <option value="freios">Freios e Pastilhas (20.000 - 25.000 km)</option>
                    <option value="correia_dentada">Correia Dentada (40.000 - 50.000 km / 3-4 anos)</option>
                    <option value="alinhamento">Alinhamento e Balanceamento (10.000 km / 6 meses)</option>
                    <option value="revisao_geral">Revisão Geral Preventiva</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Descrição / Nome do Serviço</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Perfil de Rodagem do Carro</label>
                  <select
                    value={usageProfile}
                    onChange={(e) => setUsageProfile(e.target.value as VehicleUsageProfile)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-semibold text-amber-400"
                  >
                    <option value="normal">🚗 Uso Normal / Passeio (~10.000 km/ano - Troca anual)</option>
                    <option value="app_severo">🚕 Motorista de Aplicativo / Severo (~45.000 km/ano - Troca a cada ~80 dias!)</option>
                    <option value="moderado">🚙 Uso Misto / Moderado (~18.000 km/ano - Troca semestral)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Data em que Foi Feito</label>
                    <input
                      type="date"
                      value={completedDate}
                      onChange={(e) => setCompletedDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">KM no Momento da Troca</label>
                    <input
                      type="number"
                      value={mileageAtService}
                      onChange={(e) => setMileageAtService(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg"
                >
                  Salvar e Calcular Retorno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
