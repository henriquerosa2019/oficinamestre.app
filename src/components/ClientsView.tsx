import React, { useState } from 'react';
import { Client, Vehicle, ServiceOrder } from '../types';
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
} from 'lucide-react';
import { WhatsAppService } from '../services/whatsapp';

interface ClientsViewProps {
  clients: Client[];
  vehicles: Vehicle[];
  orders: ServiceOrder[];
  onSaveClient: (client: Client, newVehicle?: Vehicle) => void;
  onDeleteClient: (id: string) => void;
  onOpenOrder: (order: ServiceOrder) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  vehicles,
  orders,
  onSaveClient,
  onDeleteClient,
  onOpenOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const filteredClients = clients.filter((c) => {
    const s = searchTerm.toLowerCase();
    const clientVehicles = vehicles.filter((v) => v.clientId === c.id);
    const hasMatchingVehicle = clientVehicles.some(
      (v) => v.plate.toLowerCase().includes(s) || v.model.toLowerCase().includes(s)
    );

    return (
      !searchTerm ||
      c.name.toLowerCase().includes(s) ||
      c.phone.includes(s) ||
      c.document.includes(s) ||
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
                    <p className="text-[11px] text-slate-400">{client.phone} • {client.document}</p>

                    {/* Placas dos Veículos */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {vList.map((v) => (
                        <span
                          key={v.id}
                          className="bg-slate-950 border border-slate-700 font-mono text-[10px] font-bold text-amber-400 px-1.5 py-0.5 rounded"
                        >
                          {v.plate} ({v.model.split(' ')[0]})
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
                    <span>CPF/CNPJ: <strong className="text-slate-300">{selectedClient.document}</strong></span>
                    <span>Tel: <strong className="text-slate-300">{selectedClient.phone}</strong></span>
                    {selectedClient.address && <span>End: {selectedClient.address}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      WhatsAppService.openWhatsAppChat(
                        selectedClient.phone,
                        `Olá ${selectedClient.name.split(' ')[0]}, tudo bem? Estamos à disposição na oficina!`
                      );
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chamar no WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClient(selectedClient.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Excluir Cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Veículos Cadastrados */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-400" />
                  Veículos Vinculados ({clientVehicles.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clientVehicles.map((v) => (
                    <div
                      key={v.id}
                      className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-950 border border-slate-600 px-2 py-0.5 rounded font-mono font-bold text-amber-400 text-xs">
                            {v.plate}
                          </span>
                          <span className="font-bold text-white">
                            {v.brand} {v.model}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Ano: {v.year} • Motor: {v.engine || 'Padrão'} • KM: {v.mileage.toLocaleString('pt-BR')} km
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prontuário Automotivo / Histórico de OS */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Prontuário Automotivo (Histórico de Ordens de Serviço)
                </h4>

                <div className="space-y-2.5">
                  {clientOrders.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">
                      Nenhuma ordem de serviço registrada para este cliente ainda.
                    </p>
                  ) : (
                    clientOrders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => onOpenOrder(ord)}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">{ord.orderNumber}</span>
                            <span className="capitalize text-slate-400 text-[11px] bg-slate-800 px-1.5 py-0.5 rounded">
                              {ord.status.replace('_', ' ')}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              {new Date(ord.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-slate-300 mt-1 line-clamp-1">
                            {ord.technicalDiagnostic || ord.complaintDescription}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-white text-sm">
                            R$ {ord.netTotal.toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-emerald-400">
                            {ord.isPaid ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))
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
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CPF ou CNPJ</label>
                    <input
                      type="text"
                      value={document}
                      onChange={(e) => setDocument(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
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
    </div>
  );
};
