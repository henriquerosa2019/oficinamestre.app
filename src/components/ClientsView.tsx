import React, { useState } from 'react';
import { Client, Vehicle, ServiceOrder, VehicleUsageProfile } from '../types';
import {
  DEFAULT_MONTHLY_KM_BY_PROFILE,
  USAGE_PROFILE_LABELS,
  USAGE_PROFILE_BADGES,
} from '../services/preventiveMaintenance';
import {
  Users,
  Plus,
  Search,
  Car,
  Phone,
  MessageCircle,
  FileText,
  Calendar,
  Trash2,
  Edit,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Check,
  X,
  Gauge,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { WhatsAppService } from '../services/whatsapp';
import { getOrderWarranty } from '../utils/warranty';

// Formatação padronizada de telefone brasileiro (XX) XXXXX-XXXX
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
};

// Formatação padronizada de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
export const formatCpfCnpj = (doc: string): string => {
  if (!doc) return '';
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return doc;
};

// Extrai rótulo consistente e humanizado do veículo para tags compactas
export const formatVehicleBadge = (v: Vehicle): string => {
  const modelStr = (v.model || '').trim();
  const brandStr = (v.brand || '').trim();

  // Se o modelo é puramente cilindrada/número (ex: "1.0", "1.6", "2.0") ou muito genérico
  const isGenericEngine = /^(1\.[0-9]|2\.[0-9]|3\.[0-9])(\s|$)/i.test(modelStr) || modelStr.length <= 4;
  if (isGenericEngine) {
    if (brandStr && brandStr !== 'Genérica') {
      return `${brandStr} ${modelStr}`.trim();
    }
  }

  // Se o modelo começa com cilindrada (ex: "1.0 Sandero"), inverte para exibir o nome do modelo primeiro
  const words = modelStr.split(/\s+/);
  if (/^(1\.[0-9]|2\.[0-9]|3\.[0-9])/i.test(words[0]) && words.length > 1) {
    return `${words[1]} ${words[0]}`;
  }

  return words[0] || brandStr || 'Veículo';
};

interface ClientsViewProps {
  clients: Client[];
  vehicles: Vehicle[];
  orders: ServiceOrder[];
  onSaveClient: (client: Client, newVehicle?: Vehicle) => void;
  onSaveVehicle?: (vehicle: Vehicle) => void;
  onDeleteClient: (id: string) => void;
  onOpenOrder: (order: ServiceOrder) => void;
  onNewOrderForVehicle?: (client: Client, vehicle: Vehicle) => void;
  onSchedulePreventive?: (order: ServiceOrder, vehicle?: Vehicle, client?: Client, observation?: string) => void;
  onUpdateOrderDiagnostic?: (orderId: string, diagnostic: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  vehicles,
  orders,
  onSaveClient,
  onSaveVehicle,
  onDeleteClient,
  onOpenOrder,
  onNewOrderForVehicle,
  onSchedulePreventive,
  onUpdateOrderDiagnostic,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);

  // Estados para Edição de Cliente
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [editClientData, setEditClientData] = useState<{
    id: string;
    name: string;
    phone: string;
    document: string;
    email: string;
    address: string;
  } | null>(null);

  // Estados para Edição de Veículo
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [editVehicleData, setEditVehicleData] = useState<{
    id: string;
    clientId: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    engine: string;
    color: string;
    mileage: number;
    usageProfile: VehicleUsageProfile;
    averageMonthlyKm: number;
  } | null>(null);

  // Estado para Edição Rápida de Diagnóstico Técnico da OS no Prontuário
  const [editingDiagnosticOrderId, setEditingDiagnosticOrderId] = useState<string | null>(null);
  const [tempDiagnosticText, setTempDiagnosticText] = useState('');

  // Form novo cliente
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Veículo opcional no cadastro
  const [hasVehicle, setHasVehicle] = useState(true);
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [mileage, setMileage] = useState(50000);

  // Helper para identificar cliente por telefone ou CPF
  const findExistingClient = (phoneInput: string, docInput: string): Client | undefined => {
    const cleanPhone = phoneInput.replace(/\D/g, '');
    const cleanDoc = docInput.replace(/\D/g, '');

    if (cleanPhone.length >= 8) {
      const match = clients.find((c) => {
        const cPhone = (c.phone || '').replace(/\D/g, '');
        return cPhone.length >= 8 && (cPhone === cleanPhone || cPhone.endsWith(cleanPhone) || cleanPhone.endsWith(cPhone));
      });
      if (match) return match;
    }

    if (cleanDoc.length >= 8) {
      const match = clients.find((c) => {
        const cDoc = (c.document || '').replace(/\D/g, '');
        return cDoc.length >= 8 && (cDoc === cleanDoc || cDoc.endsWith(cleanDoc));
      });
      if (match) return match;
    }

    return undefined;
  };

  const matchedClientInModal = isModalOpen ? findExistingClient(phone, document) : undefined;

  const filteredClients = clients.filter((c) => {
    const s = searchTerm.toLowerCase().trim();
    const rawSearchDigits = s.replace(/\D/g, '');
    const clientVehicles = vehicles.filter((v) => v.clientId === c.id);
    const hasMatchingVehicle = clientVehicles.some(
      (v) =>
        v.plate.toLowerCase().includes(s) ||
        v.model.toLowerCase().includes(s) ||
        v.brand.toLowerCase().includes(s)
    );

    const clientPhoneDigits = c.phone.replace(/\D/g, '');
    const clientDocDigits = c.document.replace(/\D/g, '');

    return (
      !searchTerm ||
      c.name.toLowerCase().includes(s) ||
      c.phone.includes(s) ||
      (rawSearchDigits && clientPhoneDigits.includes(rawSearchDigits)) ||
      c.document.includes(s) ||
      (rawSearchDigits && clientDocDigits.includes(rawSearchDigits)) ||
      hasMatchingVehicle
    );
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const clientVehicles = vehicles.filter((v) => v.clientId === selectedClientId);
  const clientOrders = orders.filter((o) => o.clientId === selectedClientId);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: 'cli-' + Date.now(),
      name,
      phone,
      document,
      email,
      address,
      createdAt: new Date().toISOString(),
    };

    let newVeh: Vehicle | undefined = undefined;
    if (hasVehicle && plate && model) {
      newVeh = {
        id: 'veh-' + Date.now(),
        clientId: newClient.id,
        plate: plate.toUpperCase().trim(),
        brand: brand || 'Genérica',
        model,
        year: Number(year),
        mileage: Number(mileage),
        fuelType: 'flex',
      };
    }

    onSaveClient(newClient, newVeh);
    setIsModalOpen(false);
    setSelectedClientId(newClient.id);

    // Reset form
    setName('');
    setPhone('');
    setDocument('');
    setEmail('');
    setAddress('');
    setPlate('');
    setBrand('');
    setModel('');
  };

  // Handlers de Edição de Cliente
  const handleOpenEditClient = (c: Client) => {
    setEditClientData({
      id: c.id,
      name: c.name,
      phone: c.phone,
      document: c.document,
      email: c.email || '',
      address: c.address || '',
    });
    setIsEditClientModalOpen(true);
  };

  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClientData) return;
    const existing = clients.find((c) => c.id === editClientData.id);
    if (!existing) return;

    const updated: Client = {
      ...existing,
      name: editClientData.name,
      phone: editClientData.phone,
      document: editClientData.document,
      email: editClientData.email,
      address: editClientData.address,
    };
    onSaveClient(updated);
    setIsEditClientModalOpen(false);
  };

  // Handlers de Edição de Veículo
  const handleOpenEditVehicle = (v: Vehicle) => {
    const prof: VehicleUsageProfile = v.usageProfile || 'normal';
    setEditVehicleData({
      id: v.id,
      clientId: v.clientId,
      plate: v.plate,
      brand: v.brand,
      model: v.model,
      year: v.year,
      engine: v.engine || '',
      color: v.color || '',
      mileage: v.mileage,
      usageProfile: prof,
      averageMonthlyKm: v.averageMonthlyKm || DEFAULT_MONTHLY_KM_BY_PROFILE[prof] || 1000,
    });
    setIsEditVehicleModalOpen(true);
  };

  const handleUsageProfileChange = (newProfile: VehicleUsageProfile) => {
    if (!editVehicleData) return;
    const suggestedKm = DEFAULT_MONTHLY_KM_BY_PROFILE[newProfile] || 1000;
    setEditVehicleData({
      ...editVehicleData,
      usageProfile: newProfile,
      averageMonthlyKm: suggestedKm,
    });
  };

  const handleSaveEditVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVehicleData) return;
    const existing = vehicles.find((v) => v.id === editVehicleData.id);
    if (!existing) return;

    const updatedVehicle: Vehicle = {
      ...existing,
      plate: editVehicleData.plate.toUpperCase().trim(),
      brand: editVehicleData.brand,
      model: editVehicleData.model,
      year: Number(editVehicleData.year),
      engine: editVehicleData.engine,
      color: editVehicleData.color,
      mileage: Number(editVehicleData.mileage) || 0,
      usageProfile: editVehicleData.usageProfile,
      averageMonthlyKm: Number(editVehicleData.averageMonthlyKm) || 1000,
    };

    if (onSaveVehicle) {
      onSaveVehicle(updatedVehicle);
    } else {
      const client = clients.find((c) => c.id === updatedVehicle.clientId);
      if (client) onSaveClient(client, updatedVehicle);
    }
    setIsEditVehicleModalOpen(false);
  };

  const handleSaveQuickDiagnostic = (orderId: string) => {
    if (onUpdateOrderDiagnostic) {
      onUpdateOrderDiagnostic(orderId, tempDiagnosticText);
    }
    setEditingDiagnosticOrderId(null);
  };

  return (
    <div className="space-y-4">
      {/* Topo: Busca e Novo Cliente */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, CPF ou placa do carro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          Cadastrar Cliente & Carro
        </button>
      </div>

      {/* Grid: Lista de Clientes (Esquerda) e Prontuário do Veículo (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Clientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col max-h-[calc(100vh-210px)] overflow-hidden">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Clientes Cadastrados</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
              {filteredClients.length}
            </span>
          </h3>

          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {filteredClients.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500">Nenhum cliente localizado.</p>
            ) : (
              filteredClients.map((client) => {
                const isSelected = client.id === selectedClientId;
                const vList = vehicles.filter((v) => v.clientId === client.id);

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white truncate">{client.name}</h4>
                      {client.phone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            WhatsAppService.openWhatsAppChat(
                              client.phone,
                              `Olá ${client.name.split(' ')[0]}, tudo bem? Aqui é da oficina!`
                            );
                          }}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {formatPhone(client.phone)} • {formatCpfCnpj(client.document)}
                    </p>

                    {/* Placas dos Veículos com Rótulo Consistente */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {vList.map((v) => (
                        <span
                          key={v.id}
                          className="bg-slate-950 border border-slate-700 font-mono text-[10px] font-bold text-amber-400 px-1.5 py-0.5 rounded"
                        >
                          {v.plate} ({formatVehicleBadge(v)})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detalhes & Prontuário do Cliente Selecionado (2 colunas) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
          {selectedClient ? (
            <>
              {/* Header do Cliente */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <h3 className="text-lg font-black text-white">{selectedClient.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>
                      CPF/CNPJ: <strong className="text-slate-300 font-mono">{formatCpfCnpj(selectedClient.document)}</strong>
                    </span>
                    <span>
                      Tel: <strong className="text-slate-300 font-mono">{formatPhone(selectedClient.phone)}</strong>
                    </span>
                    {selectedClient.address && <span>End: {selectedClient.address}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botão Editar Cliente */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditClient(selectedClient)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition-colors border border-slate-700 shadow-sm"
                    title="Editar dados pessoais e endereço do cliente"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      WhatsAppService.openWhatsAppChat(
                        selectedClient.phone,
                        `Olá ${selectedClient.name.split(' ')[0]}, tudo bem? Estamos à disposição na oficina!`
                      );
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chamar no WhatsApp
                  </button>

                  {/* Confirmação Visível ao Excluir Cliente */}
                  {clientToDeleteId === selectedClient.id ? (
                    <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/50 px-2 py-1 rounded-lg text-xs animate-in fade-in">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-red-200 text-[11px] font-medium">
                        {clientOrders.length > 0
                          ? `Excluir (${clientOrders.length} O.S.)?`
                          : 'Excluir cliente?'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteClient(selectedClient.id);
                          setClientToDeleteId(null);
                        }}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[10px] transition-colors"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientToDeleteId(null)}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setClientToDeleteId(selectedClient.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Excluir Cliente com segurança"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Veículos Cadastrados */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-400" />
                  Veículos Vinculados ({clientVehicles.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clientVehicles.map((v) => {
                    const prof = v.usageProfile || 'normal';
                    const badgeInfo = USAGE_PROFILE_BADGES[prof] || USAGE_PROFILE_BADGES.normal;

                    return (
                      <div
                        key={v.id}
                        className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between gap-2.5 text-xs"
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-950 border border-slate-600 px-2 py-0.5 rounded font-mono font-bold text-amber-400 text-xs">
                                {v.plate}
                              </span>
                              <span className="font-bold text-white">
                                {v.brand} {v.model}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                            <span>Ano: <strong className="text-slate-300">{v.year}</strong></span>
                            <span>•</span>
                            <span>Motor: <strong className="text-slate-300">{v.engine || 'Padrão'}</strong></span>
                            <span>•</span>
                            <span>KM: <strong className="text-slate-200">{v.mileage.toLocaleString('pt-BR')} km</strong></span>
                          </div>

                          {/* Selo Curto de Perfil de Uso e Ritmo de KM */}
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.className}`}
                            >
                              <span>{badgeInfo.icon}</span>
                              <span>{badgeInfo.label}</span>
                            </span>
                          </div>
                        </div>

                        {/* Botões de Ação do Veículo: Editar Veículo e + Nova O.S. */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEditVehicle(v)}
                            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-950 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
                            title={`Editar dados e perfil de uso do ${v.plate}`}
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-400" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNewOrderForVehicle && onNewOrderForVehicle(selectedClient, v)}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 hover:border-amber-500 rounded-lg text-xs font-bold transition-all shadow-sm"
                            title={`Abrir nova O.S. já vinculada ao ${v.plate}`}
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>+ Nova O.S.</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prontuário Automotivo / Histórico de OS */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Prontuário Automotivo (Histórico de Ordens de Serviço)
                  </h4>
                </div>

                {/* Resumo Financeiro Essencial no Topo do Prontuário */}
                {(() => {
                  const totalGasto = clientOrders
                    .filter((o) => o.status !== 'cancelado')
                    .reduce((acc, o) => acc + o.netTotal, 0);
                  const concluidasCount = clientOrders.filter(
                    (o) => o.status === 'finalizado' || o.status === 'pronto' || o.isPaid
                  ).length;

                  return (
                    <div className="grid grid-cols-2 gap-3 mb-3.5">
                      <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Total Gasto pelo Cliente
                          </span>
                          <span className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-0.5 block">
                            R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                          <DollarSign className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            O.S. Concluídas
                          </span>
                          <span className="text-sm sm:text-base font-black text-white font-mono mt-0.5 block">
                            {concluidasCount}{' '}
                            <span className="text-xs font-normal text-slate-400">de {clientOrders.length} ordens</span>
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2.5">
                  {clientOrders.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">
                      Nenhuma ordem de serviço registrada para este cliente ainda.
                    </p>
                  ) : (
                    clientOrders.map((ord) => {
                      const diag = ord.technicalDiagnostic || '';
                      const complaint = ord.complaintDescription || '';
                      const fullNotes = `${diag} ${complaint}`.toLowerCase();
                      const hasWearAlert =
                        fullNotes.includes('desgaste') ||
                        fullNotes.includes('limite') ||
                        fullNotes.includes('abaixo da vareta') ||
                        fullNotes.includes('troca imediata') ||
                        fullNotes.includes('vazamento') ||
                        fullNotes.includes('folga');

                      return (
                        <div
                          key={ord.id}
                          onClick={() => onOpenOrder(ord)}
                          className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer space-y-2 text-xs transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              {(() => {
                                const warranty = getOrderWarranty(ord);
                                return (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono font-bold text-amber-400">{ord.orderNumber}</span>
                                    <span className="capitalize text-slate-400 text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                                      {ord.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-slate-400 text-[11px]">
                                      {warranty.hasServiceDate
                                        ? `Serviço: ${warranty.formattedServiceDate}`
                                        : `Entrada: ${warranty.formattedEntryDate}`}
                                    </span>
                                    <span className="text-slate-300 text-[11px]">
                                      • Venc. Garantia:{' '}
                                      <strong className="text-amber-400 font-bold">{warranty.formattedExpiryDate}</strong>
                                    </span>
                                  </div>
                                );
                              })()}
                              {editingDiagnosticOrderId === ord.id ? (
                                <div onClick={(e) => e.stopPropagation()} className="mt-2 p-2 bg-slate-900 border border-slate-700 rounded-lg space-y-2">
                                  <label className="text-[10px] font-bold text-amber-400 block uppercase">
                                    Corrigir Observação Técnica / Diagnóstico
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={tempDiagnosticText}
                                    onChange={(e) => setTempDiagnosticText(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingDiagnosticOrderId(null)}
                                      className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px]"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveQuickDiagnostic(ord.id)}
                                      className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px]"
                                    >
                                      Salvar Texto
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 mt-1 group/edit">
                                  <p className="text-slate-300 line-clamp-1">
                                    {ord.technicalDiagnostic || ord.complaintDescription}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingDiagnosticOrderId(ord.id);
                                      setTempDiagnosticText(ord.technicalDiagnostic || ord.complaintDescription || '');
                                    }}
                                    className="opacity-0 group-hover/edit:opacity-100 p-0.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-all"
                                    title="Corrigir anotação técnica / diagnóstico desta O.S."
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-black text-white text-sm">
                                R$ {ord.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="block text-[10px] text-emerald-400">
                                {ord.isPaid ? 'Pago' : 'Pendente'}
                              </span>
                            </div>
                          </div>

                          {/* Destaque de observações de desgaste com botão Agendar Preventiva */}
                          {hasWearAlert && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-amber-300 block text-[11px] uppercase tracking-wide">
                                    Observação Técnica de Retorno / Desgaste:
                                  </span>
                                  <p className="text-amber-100 text-xs mt-0.5">
                                    "{ord.technicalDiagnostic || ord.complaintDescription}"
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const veh = vehicles.find((v) => v.id === ord.vehicleId);
                                  if (onSchedulePreventive) {
                                    onSchedulePreventive(ord, veh, selectedClient, ord.technicalDiagnostic);
                                  }
                                }}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] shadow-sm transition-all shrink-0 hover:scale-[1.02]"
                                title="Conectar esta observação ao CRM de Manutenção Preventiva"
                              >
                                <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Agendar Preventiva</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-500 text-sm">
              Selecione um cliente para visualizar o prontuário e seus veículos.
            </div>
          )}
        </div>
      </div>

      {/* Modal Cadastro de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <form onSubmit={handleSave}>
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Cadastrar Novo Cliente & Veículo</h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                {/* Banner de Reconhecimento Automático de Cliente Existente */}
                {matchedClientInModal && (
                  <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                        <UserCheck className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-amber-400 block tracking-wider">
                          Cliente Já Cadastrado Localizado!
                        </span>
                        <span className="text-sm font-black text-white block">
                          {matchedClientInModal.name}
                        </span>
                        <span className="text-[11px] text-slate-300 font-mono">
                          Tel: {matchedClientInModal.phone} {matchedClientInModal.document ? `• Doc: ${matchedClientInModal.document}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId(matchedClientInModal.id);
                          setIsModalOpen(false);
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95"
                      >
                        Ver Prontuário
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setName(matchedClientInModal.name);
                          setPhone(formatPhone(matchedClientInModal.phone));
                          setDocument(formatCpfCnpj(matchedClientInModal.document));
                          setAddress(matchedClientInModal.address || '');
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-xs border border-slate-700"
                        title="Preencher os campos para cadastrar novo veículo para este cliente"
                      >
                        Carregar Dados
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 mb-1">Nome Completo do Cliente *</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">WhatsApp / Telefone *</label>
                    <input
                      required
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CPF ou CNPJ</label>
                    <input
                      type="text"
                      value={document}
                      onChange={(e) => setDocument(formatCpfCnpj(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Endereço (opcional)</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro e cidade"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                {/* Bloco de Veículo */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <label className="flex items-center gap-2 font-bold text-amber-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasVehicle}
                      onChange={(e) => setHasVehicle(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500"
                    />
                    Cadastrar Veículo Inicial Agora
                  </label>

                  {hasVehicle && (
                    <div className="space-y-3 pl-4 border-l-2 border-amber-500/30">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1">Placa do Veículo *</label>
                          <input
                            type="text"
                            value={plate}
                            onChange={(e) => setPlate(e.target.value)}
                            placeholder="ABC1D23"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono text-white uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Marca</label>
                          <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="Ex: Fiat, VW, GM"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-slate-400 mb-1">Modelo *</label>
                          <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder="Ex: Palio 1.0 Fire"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Ano</label>
                          <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Quilometragem Atual (KM)</label>
                        <input
                          type="number"
                          value={mileage}
                          onChange={(e) => setMileage(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                  )}
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
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edição de Cliente */}
      {isEditClientModalOpen && editClientData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in">
            <form onSubmit={handleSaveEditClient}>
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Edit className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Editar Dados do Cliente</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nome Completo *</label>
                  <input
                    required
                    type="text"
                    value={editClientData.name}
                    onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Telefone / WhatsApp *</label>
                    <input
                      required
                      type="text"
                      value={editClientData.phone}
                      onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">CPF ou CNPJ</label>
                    <input
                      type="text"
                      value={editClientData.document}
                      onChange={(e) => setEditClientData({ ...editClientData, document: e.target.value })}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">E-mail (opcional)</label>
                  <input
                    type="email"
                    value={editClientData.email}
                    onChange={(e) => setEditClientData({ ...editClientData, email: e.target.value })}
                    placeholder="cliente@exemplo.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Endereço Completo</label>
                  <input
                    type="text"
                    value={editClientData.address}
                    onChange={(e) => setEditClientData({ ...editClientData, address: e.target.value })}
                    placeholder="Rua, número, complemento, bairro e cidade"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edição de Veículo & Perfil de Uso Severo */}
      {isEditVehicleModalOpen && editVehicleData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in">
            <form onSubmit={handleSaveEditVehicle}>
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Editar Veículo & Perfil de Uso</h3>
                    <p className="text-[11px] text-slate-400">
                      Placa: <span className="font-mono text-amber-400 font-bold">{editVehicleData.plate}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditVehicleModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Marca *</label>
                    <input
                      required
                      type="text"
                      value={editVehicleData.brand}
                      onChange={(e) => setEditVehicleData({ ...editVehicleData, brand: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Modelo & Versão *</label>
                    <input
                      required
                      type="text"
                      value={editVehicleData.model}
                      onChange={(e) => setEditVehicleData({ ...editVehicleData, model: e.target.value })}
                      placeholder="Ex: Gol 1.6 MSI Flex"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Ano</label>
                    <input
                      required
                      type="number"
                      value={editVehicleData.year}
                      onChange={(e) => setEditVehicleData({ ...editVehicleData, year: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Motorização</label>
                    <input
                      type="text"
                      value={editVehicleData.engine}
                      onChange={(e) => setEditVehicleData({ ...editVehicleData, engine: e.target.value })}
                      placeholder="Ex: 1.6 EA111"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Quilometragem (KM) *</label>
                    <input
                      required
                      type="number"
                      value={editVehicleData.mileage}
                      onChange={(e) => setEditVehicleData({ ...editVehicleData, mileage: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                </div>

                {/* Bloco de Configuração de Uso Severo / Estimativa de Retorno */}
                <div className="p-3.5 bg-slate-950/80 border border-amber-500/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Estimativa de Retorno & Uso Severo
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Perfil de Uso do Veículo:
                    </label>
                    <select
                      value={editVehicleData.usageProfile}
                      onChange={(e) => handleUsageProfileChange(e.target.value as VehicleUsageProfile)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 text-xs"
                    >
                      <option value="normal">🚗 Uso Normal / Passeio (100% intervalo padrão)</option>
                      <option value="app_severo">⚠️ Motorista de Aplicativo / Táxi (Redutor de 50% no intervalo)</option>
                      <option value="frota">🚚 Frota / Carga / Entregas (Redutor de 40% no intervalo)</option>
                      <option value="severo_curto">⚠️ Trajeto Curto / Anda-e-Para Severo (Redutor de 50%)</option>
                      <option value="moderado">🚙 Uso Moderado (Redutor de 20%)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold">
                        Média Mensal Estimada de KM:
                      </label>
                      <span className="text-amber-400 font-mono font-bold text-xs">
                        {editVehicleData.averageMonthlyKm.toLocaleString('pt-BR')} km/mês
                      </span>
                    </div>
                    <input
                      required
                      type="number"
                      step={100}
                      value={editVehicleData.averageMonthlyKm}
                      onChange={(e) =>
                        setEditVehicleData({
                          ...editVehicleData,
                          averageMonthlyKm: Number(e.target.value) || 1000,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500 text-xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      💡 <strong>Como funciona o cálculo:</strong> Para motoristas de aplicativo ou uso severo, a quilometragem mensal reduz os intervalos e calcula os dias exatos até o retorno preventivo pelo critério de KM ou data (o que vencer primeiro).
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditVehicleModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
                >
                  Salvar Veículo & Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
