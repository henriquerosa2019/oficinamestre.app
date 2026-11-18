import React, { useState } from 'react';
import {
  MaintenanceRecord,
  MaintenanceAlert,
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
  MessageCircle,
  Plus,
  Car,
  User,
  Gauge,
  Filter,
  Flame,
  Briefcase,
  Trash2,
} from 'lucide-react';

interface PreventiveMaintenanceViewProps {
  records: MaintenanceRecord[];
  vehicles: Vehicle[];
  clients: Client[];
  onSaveRecord: (record: MaintenanceRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export const PreventiveMaintenanceView: React.FC<PreventiveMaintenanceViewProps> = ({
  records,
  vehicles,
  clients,
  onSaveRecord,
  onDeleteRecord,
}) => {
  const [profileFilter, setProfileFilter] = useState<'todos' | VehicleUsageProfile>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | MaintenanceAlert['status']>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form de novo registro preventivo manual
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '');
  const [serviceName, setServiceName] = useState('Troca de Óleo e Filtros');
  const [serviceType, setServiceType] = useState<PreventiveServiceType>('troca_oleo');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileageAtService, setMileageAtService] = useState(50000);
  const [usageProfile, setUsageProfile] = useState<VehicleUsageProfile>('normal');

  // Calcula todos os alertas atuais
  const allAlerts = PreventiveMaintenanceService.calculateAlerts(records, vehicles, clients);

  // Filtros
  const filteredAlerts = allAlerts.filter((alert) => {
    const matchesProfile = profileFilter === 'todos' || alert.record.usageProfile === profileFilter;
    const matchesStatus = statusFilter === 'todos' || alert.status === statusFilter;
    return matchesProfile && matchesStatus;
  });

  // Métricas
  const urgentCount = allAlerts.filter((a) => a.status === 'urgente_1dia').length;
  const weekAlertCount = allAlerts.filter((a) => a.status === 'alerta_7dias').length;
  const expiredCount = allAlerts.filter((a) => a.status === 'vencido').length;
  const inOrderCount = allAlerts.filter((a) => a.status === 'em_dia').length;

  const handleSendWhatsApp = (alert: MaintenanceAlert) => {
    const message = PreventiveMaintenanceService.generateWhatsAppReminder(alert);
    WhatsAppService.openWhatsAppChat(alert.client.phone, message);
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
                O sistema memoriza os serviços feitos e calcula quando cada cliente deve retornar.
                Para <strong>motoristas de aplicativo (uso severo)</strong> que rodam muito, o prazo é encurtado
                automaticamente para garantir aviso antecipado e manter sua rampa sempre cheia!
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

      {/* Cards de Alertas por Janela de Tempo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vence em 1 Dia / Urgente */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'urgente_1dia' ? 'todos' : 'urgente_1dia')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
            statusFilter === 'urgente_1dia'
              ? 'border-red-500 ring-2 ring-red-500/20 bg-red-950/20'
              : 'border-red-500/40 hover:border-red-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-400 animate-pulse" />
              Vence em 1 Dia / Amanhã!
            </span>
            <span className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 font-black text-xs flex items-center justify-center">
              {urgentCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Avisar hoje via WhatsApp para fechar a agenda imediata.
          </div>
        </div>

        {/* Vence na Próxima Semana (7 Dias) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'alerta_7dias' ? 'todos' : 'alerta_7dias')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
            statusFilter === 'alerta_7dias'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-950/20'
              : 'border-amber-500/40 hover:border-amber-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Vence em 1 Semana (7 Dias)
            </span>
            <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
              {weekAlertCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Tempo ideal para o cliente se programar e reservar horário.
          </div>
        </div>

        {/* Vencidos */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'vencido' ? 'todos' : 'vencido')}
          className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
            statusFilter === 'vencido'
              ? 'border-rose-600 ring-2 ring-rose-500/20 bg-rose-950/20'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Revisões Vencidas
            </span>
            <span className="w-7 h-7 rounded-full bg-slate-800 text-rose-400 font-black text-xs flex items-center justify-center">
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
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-950/20'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Em Dia (+7 Dias)
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

      {/* Filtros de Perfil de Rodagem */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center gap-2">
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
            className="text-xs text-amber-400 hover:underline"
          >
            Limpar filtro de status ({statusFilter.replace('_', ' ')})
          </button>
        )}
      </div>

      {/* Lista de Alertas e Clientes para Notificar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAlerts.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-sm">
            Nenhum alerta de manutenção encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const { record, vehicle, client, daysRemaining, status } = alert;
            const isApp = record.usageProfile === 'app_severo';

            return (
              <div
                key={record.id}
                className={`p-4 rounded-2xl border transition-all shadow-sm flex flex-col justify-between gap-4 ${
                  status === 'urgente_1dia'
                    ? 'bg-red-950/20 border-red-500/50 hover:border-red-400'
                    : status === 'alerta_7dias'
                    ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400'
                    : status === 'vencido'
                    ? 'bg-slate-900/90 border-rose-800/60 hover:border-rose-700'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Cabeçalho do Card: Placa, Modelo e Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                        <span className="text-[9px] text-blue-400">BR</span>
                        {vehicle.plate}
                      </div>
                      <span className="text-sm font-bold text-white">
                        {vehicle.brand} {vehicle.model}
                      </span>
                    </div>

                    {/* Badge de Urgência */}
                    {status === 'urgente_1dia' && (
                      <span className="bg-red-500 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded-full animate-bounce">
                        {daysRemaining === 0 ? 'Vence Hoje!' : 'Vence Amanhã!'}
                      </span>
                    )}
                    {status === 'alerta_7dias' && (
                      <span className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                        Em {daysRemaining} dias
                      </span>
                    )}
                    {status === 'vencido' && (
                      <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Vencido há {Math.abs(daysRemaining)} dias
                      </span>
                    )}
                    {status === 'em_dia' && (
                      <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Em {daysRemaining} dias
                      </span>
                    )}
                  </div>

                  {/* Cliente e Perfil de Rodagem */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 mb-3 border-b border-slate-800">
                    <span className="flex items-center gap-1 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {client.name} ({client.phone})
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isApp
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isApp ? '🚕 Motorista de App' : '🚗 Passeio'}
                    </span>
                  </div>

                  {/* Detalhes do Serviço Memorizado */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{record.serviceName}</span>
                      <span className="text-[11px] text-slate-400">
                        Feito em: {new Date(record.completedDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-400">
                      <div>
                        KM da Última Troca: <strong className="text-slate-200">{record.mileageAtService.toLocaleString('pt-BR')} km</strong>
                      </div>
                      <div>
                        Retorno Previsto: <strong className="text-amber-400">{record.estimatedReturnMileage.toLocaleString('pt-BR')} km</strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Prazo Calculado: <strong className="text-slate-200">{new Date(record.estimatedReturnDate).toLocaleDateString('pt-BR')}</strong>{' '}
                      ({record.intervalMonths} meses / {record.intervalKm.toLocaleString('pt-BR')} km)
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card: Ação de Disparo WhatsApp */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => onDeleteRecord(record.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
                    title="Excluir Registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(alert)}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.01]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {status === 'urgente_1dia'
                        ? 'Avisar Urgente no WhatsApp (Vence Amanhã)'
                        : status === 'alerta_7dias'
                        ? 'Avisar no WhatsApp (Vence em 1 Semana)'
                        : 'Enviar Lembrete no WhatsApp'}
                    </span>
                  </button>
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
