import React, { useState, useEffect, useRef } from 'react';
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
  Minus,
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
  Calendar,
  Eye,
  EyeOff,
  Search,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Lock,
} from 'lucide-react';
import { CarDamageCanvas } from './CarDamageCanvas';
import { WhatsAppService } from '../services/whatsapp';
import { QuickOrderCheckoutModal } from './QuickOrderCheckoutModal';
import { getOrderWarranty, toIsoDate } from '../utils/warranty';
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
  onQuickCheckout?: (order: ServiceOrder, paymentMethod: PaymentMethod, isPaid: boolean) => void;
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
  onQuickCheckout,
}) => {
  if (!isOpen) return null;

  const isEditing = !!order;

  // Controle de Abas
  const [activeTab, setActiveTab] = useState<'diagnostico' | 'itens' | 'fechamento'>(
    isEditing ? 'itens' : 'diagnostico'
  );

  // Modo Mecânico vs. Modo Dono (Ocultar Custo Real e Margem da Oficina)
  const [showProfitDetails, setShowProfitDetails] = useState<boolean>(false);

  // Modal de Checkout Rápido
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Estados principais da OS
  const [orderNumber, setOrderNumber] = useState(
    order?.orderNumber || `OS-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [clientId, setClientId] = useState(order?.clientId || clients[0]?.id || '');
  const [vehicleId, setVehicleId] = useState(order?.vehicleId || vehicles[0]?.id || '');
  const [mechanicId, setMechanicId] = useState(order?.mechanicId || mechanics[0]?.id || '');
  const [status, setStatus] = useState<OrderStatus>(order?.status || 'orcamento');

  const [complaintDescription, setComplaintDescription] = useState(order?.complaintDescription || '');
  const [technicalDiagnostic, setTechnicalDiagnostic] = useState(order?.technicalDiagnostic || '');

  // Checklist de Entrada
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

  // Datas e Garantia
  const [serviceDate, setServiceDate] = useState<string>(
    order?.serviceDate || (order?.createdAt ? toIsoDate(order.createdAt) : toIsoDate(new Date()))
  );
  const [warrantyDays, setWarrantyDays] = useState<number>(order?.warrantyDays ?? 90);

  // Seletores com Busca Digitável - Peças
  const [partSearch, setPartSearch] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [isPartDropdownOpen, setIsPartDropdownOpen] = useState(false);

  // Seletores com Busca Digitável - Serviços
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);

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

  // Informações de Garantia Calculadas (90 dias padrão CDC)
  const warrantyInfo = getOrderWarranty({
    serviceDate,
    warrantyDays,
    createdAt: order?.createdAt || new Date().toISOString(),
    finishedAt: status === 'finalizado' ? order?.finishedAt || new Date().toISOString() : undefined,
  });

  // Filtros em Tempo Real para Busca Digitável
  const filteredParts = availableParts.filter((p) => {
    if (!partSearch.trim()) return true;
    const term = partSearch.toLowerCase();
    return (
      p.description.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      (p.brand && p.brand.toLowerCase().includes(term))
    );
  });

  const filteredServices = availableServices.filter((s) => {
    if (!serviceSearch.trim()) return true;
    const term = serviceSearch.toLowerCase();
    return s.name.toLowerCase().includes(term);
  });

  // Handlers para Peças
  const handleAddPart = (targetPartId?: string) => {
    const pId = targetPartId || selectedPartId;
    if (!pId) {
      if (filteredParts.length === 1) {
        return handleAddPart(filteredParts[0].id);
      }
      return;
    }
    const partFound = availableParts.find((p) => p.id === pId);
    if (!partFound) return;

    // Se a peça já está na lista, apenas incrementa a quantidade
    const existingIndex = parts.findIndex((p) => p.partId === partFound.id);
    if (existingIndex >= 0) {
      const updated = [...parts];
      const newQty = updated[existingIndex].quantity + partQty;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        total: updated[existingIndex].unitPrice * newQty,
      };
      setParts(updated);
    } else {
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
    }

    setSelectedPartId('');
    setPartSearch('');
    setPartQty(1);
    setIsPartDropdownOpen(false);
  };

  const handleUpdatePartQty = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setParts(
      parts.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            quantity: newQty,
            total: p.unitPrice * newQty,
          };
        }
        return p;
      })
    );
  };

  const handleRemovePart = (id: string) => {
    setParts(parts.filter((p) => p.id !== id));
  };

  // Handlers para Serviços
  const handleAddService = (targetServiceId?: string) => {
    const sId = targetServiceId || selectedServiceId;
    if (!sId) {
      if (filteredServices.length === 1) {
        return handleAddService(filteredServices[0].id);
      }
      return;
    }
    const serviceFound = availableServices.find((s) => s.id === sId);
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
    setServiceSearch('');
    setIsServiceDropdownOpen(false);
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  // Marcar/Desmarcar Tudo no Checklist de Entrada em 1 Toque
  const handleToggleChecklistAll = () => {
    const allChecked = hasSpareWheel && hasJack && hasLugWrench && hasTriangle;
    setHasSpareWheel(!allChecked);
    setHasJack(!allChecked);
    setHasLugWrench(!allChecked);
    setHasTriangle(!allChecked);
  };

  // Salvar Ordem de Serviço
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
      serviceDate,
      warrantyDays,
      warrantyExpiresAt: warrantyInfo.expiryDateStr,
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {isEditing ? `Editar ${orderNumber}` : 'Nova Ordem de Serviço'}
                </h3>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                  {orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate hidden sm:block">
                {currentVehicle ? `${currentVehicle.brand} ${currentVehicle.model} • Placa ${currentVehicle.plate}` : 'Gestão ágil de pátio'}
                {currentClient ? ` • ${currentClient.name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bloco de Data do Serviço e Vencimento da Garantia */}
            <div className="hidden md:flex flex-col text-right px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400">
                Data: <span className="text-slate-200">{warrantyInfo.formattedServiceDate}</span>
              </span>
              <span className="text-xs text-white">
                Venc. Garantia: <strong className="text-amber-400 font-bold">{warrantyInfo.formattedExpiryDate}</strong>
              </span>
            </div>

            {/* Seletor de Status da OS */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-bold text-amber-400 focus:outline-none focus:border-amber-500"
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
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de 3 Abas Rápidas no Topo */}
        <div className="bg-slate-950 px-4 sm:px-6 pt-2 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('diagnostico')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-xl transition-all border-b-2 ${
                activeTab === 'diagnostico'
                  ? 'bg-slate-900 text-amber-400 border-amber-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <span>1. Diagnóstico & Entrada</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('itens')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-xl transition-all border-b-2 ${
                activeTab === 'itens'
                  ? 'bg-slate-900 text-amber-400 border-amber-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
              }`}
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>2. Serviços & Peças</span>
              {services.length + parts.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    activeTab === 'itens' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'
                  }`}
                >
                  {services.length + parts.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fechamento')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-xl transition-all border-b-2 ${
                activeTab === 'fechamento'
                  ? 'bg-slate-900 text-amber-400 border-amber-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>3. Fechamento & Pagamento</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                  activeTab === 'fechamento'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-800/80 text-slate-300'
                }`}
              >
                R$ {netTotal.toFixed(2)}
              </span>
            </button>
          </div>

          {/* Atalho de Modo Dono quando estiver na aba de fechamento */}
          {activeTab === 'fechamento' && (
            <button
              type="button"
              onClick={() => setShowProfitDetails(!showProfitDetails)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors font-medium shrink-0"
              title="Alternar visibilidade do lucro real e custo de peças (Modo Dono)"
            >
              {showProfitDetails ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Ocultar DRE</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">DRE Oficina</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Corpo do Modal - Conteúdo Dinâmico por Aba */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-200">
          {/* ========================================================================= */}
          {/* ABA 1: DIAGNÓSTICO & ENTRADA */}
          {/* ========================================================================= */}
          {activeTab === 'diagnostico' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Seção 1: Cliente, Veículo, Mecânico e Data/Garantia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
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

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Data do Serviço
                  </label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 font-mono font-medium"
                  />
                  <div className="mt-1.5 text-xs text-slate-300">
                    <span className="text-[11px] text-slate-400">Venc. Garantia: </span>
                    <strong className="text-amber-400 font-bold">{warrantyInfo.formattedExpiryDate}</strong>
                    <span className="text-[10px] text-slate-500 ml-1">({warrantyDays}d)</span>
                  </div>
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

              {/* Seção 3: Checklist Rápido de Recepção & Avarias */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Checklist de Entrada & Proteção da Oficina
                  </h4>

                  {/* Botão de 1 Toque: Marcar Tudo OK */}
                  <button
                    type="button"
                    onClick={handleToggleChecklistAll}
                    className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    {hasSpareWheel && hasJack && hasLugWrench && hasTriangle
                      ? 'Desmarcar Todos'
                      : 'Marcar Tudo OK'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* KM */}
                  <div>
                    <label className="text-xs text-slate-400 flex items-center gap-1.5 mb-1 font-semibold">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      KM no Painel
                    </label>
                    <input
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-white font-mono"
                    />
                  </div>

                  {/* Combustível */}
                  <div>
                    <label className="text-xs text-slate-400 flex items-center justify-between mb-1 font-semibold">
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
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Reserva</span>
                      <span>1/2</span>
                      <span>Cheio</span>
                    </div>
                  </div>

                  {/* Acessórios Obrigatórios */}
                  <div className="sm:col-span-2 flex flex-wrap gap-3 items-center pt-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={hasSpareWheel}
                        onChange={(e) => setHasSpareWheel(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4"
                      />
                      Estepe
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={hasJack}
                        onChange={(e) => setHasJack(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4"
                      />
                      Macaco
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={hasLugWrench}
                        onChange={(e) => setHasLugWrench(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4"
                      />
                      Chave de Roda
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={hasTriangle}
                        onChange={(e) => setHasTriangle(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4"
                      />
                      Triângulo
                    </label>
                  </div>
                </div>

                {/* Canvas Interativo de Lataria */}
                <CarDamageCanvas damagePoints={damagePoints} onChange={setDamagePoints} />
              </div>

              {/* Botão de Avanço Rápido para a Aba 2 */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('itens')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs sm:text-sm rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <span>Próximo: Serviços & Peças</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: SERVIÇOS & PEÇAS (Onde o Mecânico passa 80% do tempo) */}
          {/* ========================================================================= */}
          {activeTab === 'itens' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Barra de Resumo Parcial Rápido */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-center">
                <div>
                  <span className="text-[11px] text-slate-400 block">Mão de Obra ({services.length})</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white">
                    R$ {servicesTotal.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Peças ({parts.length})</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white">
                    R$ {partsTotal.toFixed(2)}
                  </span>
                </div>
                <div className="border-l border-slate-800 pl-2">
                  <span className="text-[11px] text-amber-400/90 font-bold block">Subtotal Parcial</span>
                  <span className="font-mono text-sm sm:text-base font-black text-amber-400">
                    R$ {(servicesTotal + partsTotal).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Bloco 1: Serviços Mecânicos (Mão de Obra) */}
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

                {/* Campo de Busca Digitável para Serviços */}
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Digite o serviço (ex: alinhamento, troca de óleo, freios)..."
                        value={serviceSearch}
                        onChange={(e) => {
                          setServiceSearch(e.target.value);
                          setIsServiceDropdownOpen(true);
                          setSelectedServiceId('');
                        }}
                        onFocus={() => setIsServiceDropdownOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (selectedServiceId) {
                              handleAddService(selectedServiceId);
                            } else if (filteredServices.length > 0) {
                              handleAddService(filteredServices[0].id);
                            }
                          }
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                      />
                      {serviceSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setServiceSearch('');
                            setSelectedServiceId('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddService()}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      Adicionar
                    </button>
                  </div>

                  {/* Dropdown de Sugestões de Serviços */}
                  {isServiceDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto z-40 divide-y divide-slate-800">
                      {filteredServices.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">
                          Nenhum serviço encontrado com "{serviceSearch}".
                        </div>
                      ) : (
                        filteredServices.map((s) => (
                          <div
                            key={s.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedServiceId(s.id);
                              setServiceSearch(s.name);
                              setIsServiceDropdownOpen(false);
                            }}
                            className={`p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              selectedServiceId === s.id ? 'bg-amber-500/20 border-l-4 border-amber-500' : ''
                            }`}
                          >
                            <span className="font-semibold text-white">{s.name}</span>
                            <span className="font-mono font-bold text-amber-400">
                              R$ {s.standardPrice.toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de Serviços Adicionados */}
                <div className="divide-y divide-slate-800/80 max-h-48 overflow-y-auto bg-slate-900/40 rounded-lg p-2 border border-slate-800/60">
                  {services.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500 italic">
                      Nenhum serviço mecânico adicionado ainda.
                    </div>
                  ) : (
                    services.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-100">{item.description}</span>
                          <span className="text-slate-400 ml-2 text-[11px]">
                            (Comissão: R$ {item.commissionValue.toFixed(2)})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-bold text-white text-xs sm:text-sm">
                            R$ {item.price.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveService(item.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="Remover serviço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bloco 2: Peças & Insumos do Estoque */}
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

                {/* Campo de Busca Digitável para Peças com Estoque e Quantidade */}
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Digite o nome, código ou marca da peça (ex: óleo, filtro, pastilha)..."
                        value={partSearch}
                        onChange={(e) => {
                          setPartSearch(e.target.value);
                          setIsPartDropdownOpen(true);
                          setSelectedPartId('');
                        }}
                        onFocus={() => setIsPartDropdownOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (selectedPartId) {
                              handleAddPart(selectedPartId);
                            } else if (filteredParts.length > 0) {
                              handleAddPart(filteredParts[0].id);
                            }
                          }
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                      />
                      {partSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setPartSearch('');
                            setSelectedPartId('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quantidade Inicial */}
                    <div className="w-20 shrink-0">
                      <input
                        type="number"
                        min="1"
                        value={partQty}
                        onChange={(e) => setPartQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-xs sm:text-sm text-white text-center font-bold font-mono focus:outline-none focus:border-amber-500"
                        title="Quantidade a adicionar"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddPart()}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      Adicionar
                    </button>
                  </div>

                  {/* Dropdown de Sugestões de Peças com Estoque e Venda */}
                  {isPartDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-40 divide-y divide-slate-800">
                      {filteredParts.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">
                          Nenhuma peça encontrada com "{partSearch}".
                        </div>
                      ) : (
                        filteredParts.slice(0, 15).map((p) => (
                          <div
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedPartId(p.id);
                              setPartSearch(`${p.description} (Cód: ${p.code})`);
                              setIsPartDropdownOpen(false);
                            }}
                            className={`p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              selectedPartId === p.id ? 'bg-amber-500/20 border-l-4 border-amber-500' : ''
                            }`}
                          >
                            <div>
                              <span className="font-semibold text-white">{p.description}</span>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-amber-400/90 font-bold">Cód: {p.code}</span>
                                {p.brand && <span>• {p.brand}</span>}
                                <span
                                  className={
                                    p.currentStock <= p.minStock
                                      ? 'text-red-400 font-bold'
                                      : 'text-slate-400'
                                  }
                                >
                                  • Estoque: {p.currentStock} {p.unit || 'un'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-2 shrink-0">
                              <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm">
                                R$ {p.sellPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de Peças Adicionadas com Controles Táteis [-] e [+] */}
                <div className="divide-y divide-slate-800/80 max-h-56 overflow-y-auto bg-slate-900/40 rounded-lg p-2 border border-slate-800/60">
                  {parts.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500 italic">
                      Nenhuma peça ou insumo adicionado ainda.
                    </div>
                  ) : (
                    parts.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-100">{item.description}</span>
                          <span className="text-slate-500 ml-2 font-mono text-[11px]">Cód: {item.code}</span>
                          <span className="text-slate-400 ml-2 text-[11px]">
                            (R$ {item.unitPrice.toFixed(2)}/un)
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Controles de Quantidade Rápida [-] [Qtd] [+] */}
                          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdatePartQty(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
                              title="Diminuir quantidade"
                            >
                              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <span className="font-mono font-bold text-white text-xs px-2 min-w-[28px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdatePartQty(item.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors"
                              title="Aumentar quantidade"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>

                          {/* Subtotal da Peça */}
                          <span className="font-mono font-bold text-white text-xs sm:text-sm min-w-[70px] text-right">
                            R$ {item.total.toFixed(2)}
                          </span>

                          {/* Botão de Exclusão */}
                          <button
                            type="button"
                            onClick={() => handleRemovePart(item.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="Remover peça"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botões de Navegação Entre Abas */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('diagnostico')}
                  className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar para Diagnóstico</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('fechamento')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Avançar para Fechamento & Pagamento</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: FECHAMENTO & PAGAMENTO */}
          {/* ========================================================================= */}
          {activeTab === 'fechamento' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Card de Resumo Financeiro da OS */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 p-5 rounded-2xl border border-amber-500/30 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    Resumo do Valor a Cobrar
                  </h4>

                  {/* Botão Discreto de Alternância: Modo Dono */}
                  <button
                    type="button"
                    onClick={() => setShowProfitDetails(!showProfitDetails)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors font-medium"
                    title="Alternar proteção de margem de lucro e custo de peças"
                  >
                    {showProfitDetails ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ocultar Rentabilidade da Oficina</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ver Rentabilidade & DRE (Modo Dono)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 4 Blocos Principais de Cobrança */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-800 text-xs">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px] mb-1">Total Peças:</span>
                    <span className="font-mono text-sm sm:text-base text-slate-200 font-bold">
                      R$ {partsTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px] mb-1">Mão de Obra:</span>
                    <span className="font-mono text-sm sm:text-base text-slate-200 font-bold">
                      R$ {servicesTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px] mb-1">Desconto (R$):</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/40">
                    <span className="text-amber-400 block text-[11px] font-bold mb-0.5 uppercase tracking-wide">
                      Total a Cobrar:
                    </span>
                    <span className="font-mono text-lg sm:text-xl font-black text-amber-400">
                      R$ {netTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* DRE e Rentabilidade da Oficina (Protegido por Padrão) */}
                {showProfitDetails ? (
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        DRE Operacional da Ordem de Serviço (Modo Dono)
                      </span>
                      <span className="text-[11px] text-slate-400">Visível apenas com autorização</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[11px]">Custo Real das Peças:</span>
                        <span className="font-mono text-sm text-red-400 font-bold">
                          - R$ {partsCostTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[11px]">Comissão do Mecânico:</span>
                        <span className="font-mono text-sm text-red-400 font-bold">
                          - R$ {mechanicsCommissionTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                        <span className="text-emerald-400 font-bold block text-[11px]">
                          LUCRO REAL DA OFICINA:
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-mono text-base font-black text-white">
                            R$ {netProfit.toFixed(2)}
                          </span>
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                            {profitMarginPercent.toFixed(1)}% margem
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Dados de custo de peças e lucro da oficina protegidos nesta tela.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProfitDetails(true)}
                      className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 ml-2"
                    >
                      Exibir DRE
                    </button>
                  </div>
                )}

                {/* Status de Pagamento / Ações Rápidas */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div>
                    {isPaid ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>O.S. Quitada ({paymentMethod.toUpperCase()})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                        <AlertCircle className="w-4 h-4" />
                        <span>Aguardando recebimento ou finalização</span>
                      </div>
                    )}
                  </div>

                  {/* Ações de WhatsApp e Impressão de Recibo */}
                  <div className="flex items-center gap-2">
                    {currentClient?.phone && currentVehicle && (
                      <div className="flex items-center gap-1.5">
                        {/* Botão Copiar Texto */}
                        <button
                          type="button"
                          onClick={async () => {
                            const orderData = {
                              ...order!,
                              orderNumber,
                              parts,
                              services,
                              partsTotal,
                              servicesTotal,
                              grossTotal,
                              discount,
                              netTotal,
                              netProfit,
                              isPaid,
                              technicalDiagnostic,
                              complaintDescription,
                              serviceDate,
                              warrantyDays,
                              warrantyExpiresAt: warrantyInfo.expiryDateStr,
                            };
                            const msg =
                              status === 'pronto'
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
                            const orderData = {
                              ...order!,
                              orderNumber,
                              parts,
                              services,
                              partsTotal,
                              servicesTotal,
                              grossTotal,
                              discount,
                              netTotal,
                              netProfit,
                              isPaid,
                              technicalDiagnostic,
                              complaintDescription,
                              serviceDate,
                              warrantyDays,
                              warrantyExpiresAt: warrantyInfo.expiryDateStr,
                            };
                            if (status === 'pronto') {
                              const msg = WhatsAppService.generateCarReadyMessage(
                                orderData,
                                currentClient,
                                currentVehicle
                              );
                              WhatsAppService.openWhatsAppChat(currentClient.phone, msg);
                            } else {
                              const msg = WhatsAppService.generateBudgetMessage(
                                orderData,
                                currentClient,
                                currentVehicle
                              );
                              WhatsAppService.openWhatsAppChat(currentClient.phone, msg);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {status === 'pronto' ? 'Avisar Carro Pronto no WhatsApp' : 'Enviar no WhatsApp'}
                        </button>
                      </div>
                    )}

                    {isEditing && (
                      <button
                        type="button"
                        onClick={() =>
                          onPrintReceipt({
                            ...order!,
                            orderNumber,
                            parts,
                            services,
                            partsTotal,
                            servicesTotal,
                            grossTotal,
                            discount,
                            netTotal,
                            serviceDate,
                            warrantyDays,
                            warrantyExpiresAt: warrantyInfo.expiryDateStr,
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir Recibo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão de Finalização em Destaque na Aba 3 */}
              {status !== 'finalizado' && (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-white text-sm block">Pronto para entregar o veículo?</span>
                    <span className="text-xs text-slate-400">
                      Finalize a O.S. e receba em 1 toque (Pix, Cartão, Dinheiro ou Fiado).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <DollarSign className="w-4 h-4 stroke-[3]" />
                    Finalizar e Receber Agora
                  </button>
                </div>
              )}

              {/* Botão Voltar */}
              <div className="flex justify-start pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('itens')}
                  className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar para Serviços & Peças</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Global Fixo do Modal */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div>
            {status !== 'finalizado' && (
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-lg shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <DollarSign className="w-4 h-4 stroke-[2.5]" />
                Finalizar e Receber
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
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

      {/* Modal de Finalização / Checkout Rápido */}
      <QuickOrderCheckoutModal
        order={{
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
          serviceDate,
          warrantyDays,
          warrantyExpiresAt: warrantyInfo.expiryDateStr,
          createdAt: order?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          finishedAt: status === 'finalizado' ? new Date().toISOString() : undefined,
        }}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onConfirmCheckout={(curOrd, method, isP) => {
          setIsCheckoutOpen(false);
          if (onQuickCheckout) {
            onQuickCheckout(curOrd, method, isP);
            onClose();
          } else {
            setStatus('finalizado');
            setIsPaid(isP);
            setPaymentMethod(method);
            handleSave();
          }
        }}
        client={currentClient}
        vehicle={currentVehicle}
        mechanic={mechanics.find((m) => m.id === mechanicId)}
      />
    </div>
  );
};
