import React, { useState, useEffect } from 'react';
import {
  ServiceOrder,
  Client,
  Vehicle,
  Mechanic,
  Part,
  ServiceItem,
  OrderStatus,
  OrderPartItem,
  OrderServiceItem,
  PaymentMethod,
} from '../types';
import {
  X,
  Plus,
  Trash2,
  Wrench,
  Package,
  Car,
  User,
  CheckCircle2,
  MessageCircle,
  Printer,
  DollarSign,
  Fuel,
  Gauge,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { CarDamageCanvas } from './CarDamageCanvas';
import { WhatsAppService } from '../services/whatsapp';
import confetti from 'canvas-confetti';

interface OrderModalProps {
  order?: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (order: ServiceOrder) => void;
  clients: Client[];
  vehicles: Vehicle[];
  mechanics: Mechanic[];
  availableParts: Part[];
  availableServices: ServiceItem[];
  onPrintReceipt: (order: ServiceOrder) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSave,
  clients,
  vehicles,
  mechanics,
  availableParts,
  availableServices,
  onPrintReceipt,
}) => {
  if (!isOpen) return null;

  // Estados do formulário
  const isEditing = !!order;
  const [orderNumber, setOrderNumber] = useState(order?.orderNumber || `OS-${Math.floor(1000 + Math.random() * 9000)}`);
  const [clientId, setClientId] = useState(order?.clientId || clients[0]?.id || '');
  const [vehicleId, setVehicleId] = useState(order?.vehicleId || vehicles[0]?.id || '');
  const [mechanicId, setMechanicId] = useState(order?.mechanicId || mechanics[0]?.id || '');
  const [status, setStatus] = useState<OrderStatus>(order?.status || 'orcamento');
  
  const [complaintDescription, setComplaintDescription] = useState(order?.complaintDescription || '');
  const [technicalDiagnostic, setTechnicalDiagnostic] = useState(order?.technicalDiagnostic || '');

  // Checklist
  const [mileage, setMileage] = useState<number>(order?.checklist?.mileage || 50000);
  const [fuelLevel, setFuelLevel] = useState<number>(order?.checklist?.fuelLevel || 50);
  const [hasSpareWheel, setHasSpareWheel] = useState(order?.checklist?.hasSpareWheel ?? true);
  const [hasJack, setHasJack] = useState(order?.checklist?.hasJack ?? true);
  const [hasLugWrench, setHasLugWrench] = useState(order?.checklist?.hasLugWrench ?? true);
  const [hasTriangle, setHasTriangle] = useState(order?.checklist?.hasTriangle ?? true);
  const [damagePoints, setDamagePoints] = useState(order?.checklist?.damagePoints || []);

  // Itens: Peças e Serviços
  const [parts, setParts] = useState<OrderPartItem[]>(order?.parts || []);
  const [services, setServices] = useState<OrderServiceItem[]>(order?.services || []);
  const [discount, setDiscount] = useState<number>(order?.discount || 0);

  // Pagamento
  const [isPaid, setIsPaid] = useState<boolean>(order?.isPaid || false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order?.paymentMethod || 'pix');
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Seletores para adicionar peça/serviço
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  // Sincroniza veículos quando o cliente muda
  const clientVehicles = vehicles.filter((v) => v.clientId === clientId);

  useEffect(() => {
    if (!order && clientVehicles.length > 0 && !clientVehicles.find((v) => v.id === vehicleId)) {
      setVehicleId(clientVehicles[0].id);
    }
  }, [clientId]);

  // Cálculos Automáticos em Tempo Real
  const partsTotal = parts.reduce((acc, p) => acc + p.total, 0);
  const servicesTotal = services.reduce((acc, s) => acc + s.price, 0);
  const grossTotal = partsTotal + servicesTotal;
  const netTotal = Math.max(0, grossTotal - discount);

  const partsCostTotal = parts.reduce((acc, p) => acc + p.unitCost * p.quantity, 0);
  const mechanicsCommissionTotal = services.reduce((acc, s) => acc + s.commissionValue, 0);
  const netProfit = netTotal - partsCostTotal - mechanicsCommissionTotal;
  const profitMarginPercent = netTotal > 0 ? (netProfit / netTotal) * 100 : 0;

  // Handlers para adicionar/remover Peças
  const handleAddPart = () => {
    if (!selectedPartId) return;
    const partFound = availableParts.find((p) => p.id === selectedPartId);
    if (!partFound) return;

    const newItem: OrderPartItem = {
      id: 'poi-' + Date.now(),
      partId: partFound.id,
      code: partFound.code,
      description: partFound.description,
      quantity: partQty,
      unitCost: partFound.costPrice,
      unitPrice: partFound.sellPrice,
      total: partFound.sellPrice * partQty,
    };

    setParts([...parts, newItem]);
    setSelectedPartId('');
    setPartQty(1);
  };

  const handleRemovePart = (id: string) => {
    setParts(parts.filter((p) => p.id !== id));
  };

  // Handlers para adicionar/remover Serviços
  const handleAddService = () => {
    if (!selectedServiceId) return;
    const serviceFound = availableServices.find((s) => s.id === selectedServiceId);
    if (!serviceFound) return;

    const currentMechanic = mechanics.find((m) => m.id === mechanicId);
    const commRate = currentMechanic?.commissionRate || 15;
    const commVal = (serviceFound.standardPrice * commRate) / 100;

    const newService: OrderServiceItem = {
      id: 'soi-' + Date.now(),
      serviceId: serviceFound.id,
      description: serviceFound.name,
      mechanicId: mechanicId,
      price: serviceFound.standardPrice,
      commissionRate: commRate,
      commissionValue: commVal,
    };

    setServices([...services, newService]);
    setSelectedServiceId('');
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  // Salvar
  const handleSave = () => {
    const currentOrder: ServiceOrder = {
      id: order?.id || 'ord-' + Date.now(),
      orderNumber,
      clientId,
      vehicleId,
      mechanicId,
      status,
      complaintDescription,
      technicalDiagnostic,
      checklist: {
        mileage: Number(mileage),
        fuelLevel: Number(fuelLevel),
        hasSpareWheel,
        hasJack,
        hasLugWrench,
        hasTriangle,
        hasManual: true,
        hasKeyChain: true,
        lightsWorking: true,
        hornWorking: true,
        wipersWorking: true,
        damagePoints,
      },
      parts,
      services,
      partsTotal,
      servicesTotal,
      grossTotal,
      discount: Number(discount),
      netTotal,
      partsCostTotal,
      mechanicsCommissionTotal,
      netProfit,
      profitMarginPercent,
      paymentMethod,
      isPaid,
      paidAt: isPaid ? order?.paidAt || new Date().toISOString() : undefined,
      createdAt: order?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      finishedAt: status === 'finalizado' ? new Date().toISOString() : undefined,
    };

    if (isPaid && !order?.isPaid) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }

    onSave(currentOrder);
  };

  const currentClient = clients.find((c) => c.id === clientId);
  const currentVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  {isEditing ? `Editar ${orderNumber}` : 'Nova Ordem de Serviço'}
                </h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Registro de diagnóstico, checklist, serviços mecânicos e peças aplicadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Selector */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-1.5 font-bold text-amber-400 focus:outline-none focus:border-amber-500"
            >
              <option value="orcamento">1. Orçamento</option>
              <option value="aguardando_aprovacao">2. Aguardando Aprovação</option>
              <option value="aprovado">3. Aprovado / Peças</option>
              <option value="em_andamento">4. Em Execução no Pátio</option>
              <option value="pronto">5. Pronto para Retirada</option>
              <option value="finalizado">6. Finalizada / Paga</option>
              <option value="cancelado">Cancelada</option>
            </select>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Modal com Rolagem */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Seção 1: Cliente e Veículo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Cliente
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-amber-400" />
                Veículo do Cliente
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {clientVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} ({v.plate})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Mecânico Responsável
              </label>
              <select
                value={mechanicId}
                onChange={(e) => setMechanicId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Comissão: {m.commissionRate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seção 2: Diagnóstico e Relato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Relato do Cliente (Sintoma / Queixa)
              </label>
              <textarea
                rows={2}
                value={complaintDescription}
                onChange={(e) => setComplaintDescription(e.target.value)}
                placeholder="Ex: Barulho na roda direita ao frear, pedal fofo, luz de injeção acesa..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Diagnóstico Técnico da Oficina
              </label>
              <textarea
                rows={2}
                value={technicalDiagnostic}
                onChange={(e) => setTechnicalDiagnostic(e.target.value)}
                placeholder="Ex: Pastilhas no ferro, fluido contaminado, correia ressecada com 70 mil km..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Seção 3: Checklist Rápido de Recepção & Avarias com Silhueta */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Checklist de Entrada & Proteção da Oficina
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KM */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  KM no Painel
                </label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-white"
                />
              </div>

              {/* Combustível */}
              <div>
                <label className="text-xs text-slate-400 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" />
                    Combustível
                  </span>
                  <span className="font-bold text-white text-xs">{fuelLevel}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="25"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Reserva</span>
                  <span>1/2</span>
                  <span>Cheio</span>
                </div>
              </div>

              {/* Acessórios Presentes */}
              <div className="sm:col-span-2 flex flex-wrap gap-3 items-center pt-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSpareWheel}
                    onChange={(e) => setHasSpareWheel(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  Estepe
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasJack}
                    onChange={(e) => setHasJack(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  Macaco
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasLugWrench}
                    onChange={(e) => setHasLugWrench(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  Chave de Roda
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTriangle}
                    onChange={(e) => setHasTriangle(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  Triângulo
                </label>
              </div>
            </div>

            {/* Canvas Interativo de Lataria */}
            <CarDamageCanvas damagePoints={damagePoints} onChange={setDamagePoints} />
          </div>

          {/* Seção 4: Serviços (Mão de Obra) */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Mão de Obra & Serviços Mecânicos
              </h4>
              <span className="text-xs font-bold text-amber-400">
                Subtotal: R$ {servicesTotal.toFixed(2)}
              </span>
            </div>

            {/* Inserir Serviço */}
            <div className="flex gap-2">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">Selecione um serviço do catálogo...</option>
                {availableServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - R$ {s.standardPrice.toFixed(2)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddService}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>

            {/* Lista de Serviços Adicionados */}
            <div className="divide-y divide-slate-800 max-h-40 overflow-y-auto">
              {services.map((item) => (
                <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-200">{item.description}</span>
                    <span className="text-slate-400 ml-2">
                      (Comissão mecânico: R$ {item.commissionValue.toFixed(2)})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white">R$ {item.price.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveService(item.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 5: Peças & Insumos */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                Peças & Insumos Utilizados
              </h4>
              <span className="text-xs font-bold text-amber-400">
                Subtotal: R$ {partsTotal.toFixed(2)}
              </span>
            </div>

            {/* Inserir Peça */}
            <div className="flex gap-2">
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">Selecione uma peça do estoque...</option>
                {availableParts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.description} (Cód: {p.code}) - Estoque: {p.currentStock} - Venda: R$ {p.sellPrice.toFixed(2)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={partQty}
                onChange={(e) => setPartQty(Math.max(1, Number(e.target.value)))}
                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center"
                title="Quantidade"
              />
              <button
                type="button"
                onClick={handleAddPart}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>

            {/* Lista de Peças */}
            <div className="divide-y divide-slate-800 max-h-40 overflow-y-auto">
              {parts.map((item) => (
                <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-slate-200">
                      {item.quantity}x {item.description}
                    </span>
                    <span className="text-slate-500 ml-2">Cód: {item.code}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white">R$ {item.total.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePart(item.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 6: Totais & DRE da OS (Lucro Real da Oficina) */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 p-5 rounded-2xl border border-amber-500/30 shadow-lg">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
              Fechamento & Rentabilidade Real da OS
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">Peças:</span>
                <span className="font-mono text-sm text-slate-200 font-bold">R$ {partsTotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mão de Obra:</span>
                <span className="font-mono text-sm text-slate-200 font-bold">R$ {servicesTotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Desconto (R$):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-24 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Total a Cobrar:</span>
                <span className="font-mono text-base font-black text-amber-400">
                  R$ {netTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* DRE da OS */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 block">Custo Real das Peças:</span>
                <span className="font-mono text-red-400 font-bold">
                  - R$ {partsCostTotal.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Comissão Mecânico:</span>
                <span className="font-mono text-red-400 font-bold">
                  - R$ {mechanicsCommissionTotal.toFixed(2)}
                </span>
              </div>
              <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
                <span className="text-amber-400 font-bold block">LUCRO REAL DA OFICINA:</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-white">
                    R$ {netProfit.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {profitMarginPercent.toFixed(1)}% margem
                  </span>
                </div>
              </div>
            </div>

            {/* Pagamento */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-emerald-400">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  OS Paga / Quitado
                </label>

                {isPaid && (
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-white"
                  >
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="a_prazo">A Prazo / Fiado</option>
                  </select>
                )}
              </div>

              {/* Botões rápidos: WhatsApp e Impressão */}
              <div className="flex items-center gap-2">
                {currentClient?.phone && currentVehicle && (
                  <div className="flex items-center gap-1.5">
                    {/* Botão Copiar Texto */}
                    <button
                      type="button"
                      onClick={async () => {
                        const orderData = { ...order!, orderNumber, parts, services, partsTotal, servicesTotal, grossTotal, discount, netTotal, netProfit, isPaid, technicalDiagnostic, complaintDescription };
                        const msg = status === 'pronto'
                          ? WhatsAppService.generateCarReadyMessage(orderData, currentClient, currentVehicle)
                          : WhatsAppService.generateBudgetMessage(orderData, currentClient, currentVehicle);
                        const success = await WhatsAppService.copyToClipboard(msg);
                        if (success) {
                          setCopiedMsg(true);
                          setTimeout(() => setCopiedMsg(false), 2000);
                        }
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition-colors flex items-center gap-1"
                      title="Copiar texto da mensagem para a área de transferência"
                    >
                      {copiedMsg ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                          <span className="text-[11px] text-emerald-400 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-400" />
                          <span className="text-[11px] text-slate-300 hidden sm:inline">Copiar</span>
                        </>
                      )}
                    </button>

                    {/* Botão Abrir WhatsApp */}
                    <button
                      type="button"
                      onClick={() => {
                        const orderData = { ...order!, orderNumber, parts, services, partsTotal, servicesTotal, grossTotal, discount, netTotal, netProfit, isPaid, technicalDiagnostic, complaintDescription };
                        if (status === 'pronto') {
                          const msg = WhatsAppService.generateCarReadyMessage(orderData, currentClient, currentVehicle);
                          WhatsAppService.openWhatsAppChat(currentClient.phone, msg);
                        } else {
                          const msg = WhatsAppService.generateBudgetMessage(orderData, currentClient, currentVehicle);
                          WhatsAppService.openWhatsAppChat(currentClient.phone, msg);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {status === 'pronto' ? 'Avisar Carro Pronto no WhatsApp' : 'Enviar Orçamento no WhatsApp'}
                    </button>
                  </div>
                )}

                {isEditing && (
                  <button
                    type="button"
                    onClick={() => onPrintReceipt(order)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Recibo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-lg shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Salvar Ordem de Serviço
          </button>
        </div>
      </div>
    </div>
  );
};
