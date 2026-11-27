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
  PartsSupplyMode,
} from '../types';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Wrench,
  Package,
  Store,
  Split,
  Boxes,
  Car,
  User,
  CheckCircle2,
  MessageCircle,
  FileText,
  ThumbsUp,
  Printer,
  DollarSign,
  Fuel,
  Gauge,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Search,
  ClipboardList,
  Send,
  ChevronRight,
  ChevronLeft,
  Lock,
  Download,
  UserCheck,
  Edit,
  ChevronDown,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { formatPhone, formatCpfCnpj } from './ClientsView';
import { CarDamageCanvas } from './CarDamageCanvas';
import { WhatsAppService } from '../services/whatsapp';
import { QuickOrderCheckoutModal } from './QuickOrderCheckoutModal';
import { getOrderWarranty, toIsoDate, formatBrDate, parseLocalDate } from '../utils/warranty';
import { PreventiveMaintenanceService } from '../services/preventiveMaintenance';
import { StorageService } from '../services/storage';
import { ReceiptDocument } from './ReceiptDocument';
import { QuotationImageService } from '../services/quotationImageService';
import { getClientLatestVehicle, findClientByPhoneOrDoc } from '../utils/clientVehicleHelper';
import confetti from 'canvas-confetti';
import { MercosulPlateInput, formatPlate, isValidPlateFormat } from './MercosulPlateInput';

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
  orders?: ServiceOrder[];
  onPrintReceipt: (order: ServiceOrder) => void;
  onQuickCheckout?: (order: ServiceOrder, paymentMethod: PaymentMethod, isPaid: boolean) => void;
  onSaveClient?: (client: Client, newVehicle?: Vehicle) => void;
  onSaveVehicle?: (vehicle: Vehicle) => void;
}

// Helper para formatação de moeda no padrão brasileiro (R$ 300,00)
export const formatCurrency = (val: number): string => {
  return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const DEFAULT_QUICK_SERVICES = [
  { name: 'Troca de Óleo e Filtros', value: 70 },
  { name: 'Alinhamento e Balanceamento 3D', value: 120 },
  { name: 'Troca de Pastilhas de Freio Dianteiro', value: 90 },
  { name: 'Troca de Correia Dentada e Tensor', value: 280 },
  { name: 'Limpeza de Bicos e TBI', value: 130 },
  { name: 'Revisão Preventiva Geral (Check 40 itens)', value: 250 },
  { name: 'Troca de Discos e Pastilhas Dianteiras', value: 140 },
  { name: 'Sangria e Troca de Fluido de Freio DOT 4', value: 90 },
];

export const MILEAGE_QUICK_ROWS = [
  {
    label: 'Até 50k',
    values: [5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000],
  },
  {
    label: 'Até 100k',
    values: [55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000],
  },
  {
    label: 'Até 150k',
    values: [105000, 110000, 115000, 120000, 125000, 130000, 135000, 140000, 145000, 150000],
  },
];

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
  orders,
  onPrintReceipt,
  onQuickCheckout,
  onSaveClient,
  onSaveVehicle,
}) => {
  const isEditing = !!order;

  // Modo Somente Leitura: ativo se a OS estiver finalizada
  const isReadOnly = order?.status === 'finalizado';

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

  // Datas: Data de Entrada e Data do Serviço (apenas com aprovação da OS)
  const [entryDate, setEntryDate] = useState<string>(
    order?.entryDate || (order?.createdAt ? toIsoDate(order.createdAt) : toIsoDate(new Date()))
  );
  const [serviceDate, setServiceDate] = useState<string>(
    order?.serviceDate ||
      (order?.status === 'aprovado' ||
      order?.status === 'em_andamento' ||
      order?.status === 'pronto' ||
      order?.status === 'finalizado'
        ? toIsoDate(order?.finishedAt || new Date())
        : '')
  );
  const [warrantyDays, setWarrantyDays] = useState<number>(order?.warrantyDays ?? 90);

  // Validade da Proposta & Observações para o Cliente (do projeto OFICINA RICO)
  const [proposalValidity, setProposalValidity] = useState<'3 dias' | '7 dias' | '15 dias' | '30 dias'>(
    (order?.proposalValidity as any) || '7 dias'
  );
  const [customerNotes, setCustomerNotes] = useState<string>(order?.notes || '');

  // Modais de Cadastro Rápido de Cliente e Veículo
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDocument, setNewClientDocument] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientHasVehicle, setNewClientHasVehicle] = useState(true);
  const [newClientPlate, setNewClientPlate] = useState('');
  const [newClientBrand, setNewClientBrand] = useState('');
  const [newClientModel, setNewClientModel] = useState('');
  const [newClientYear, setNewClientYear] = useState<number>(new Date().getFullYear());
  const [newClientMileage, setNewClientMileage] = useState<number>(50000);

  const allOrders = orders || StorageService.getOrders();

  const initialClient = clients.find((c) => c.id === (order?.clientId || clients[0]?.id));
  const [clientInputValue, setClientInputValue] = useState(initialClient?.name || '');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // Sincroniza o texto do campo quando o clientId muda ou a OS carrega
  useEffect(() => {
    const c = clients.find((cl) => cl.id === clientId);
    if (c && !isClientDropdownOpen) {
      setClientInputValue(c.name);
    }
  }, [clientId, clients]);

  // Função central: se identificado pelo telefone/CPF/nome, o nome completo continua dentro do campo onde o telefone foi digitado
  // e seu último veículo que deu entrada é trazido diretamente para o campo de veículo da OS
  const handleIdentifyAndPullClient = (targetClient: Client, customVehicle?: Vehicle) => {
    setClientId(targetClient.id);
    setClientInputValue(targetClient.name);
    setIsClientDropdownOpen(false);

    const lastVeh = customVehicle || getClientLatestVehicle(targetClient.id, vehicles, allOrders);
    if (lastVeh) {
      setVehicleId(lastVeh.id);
      if (lastVeh.mileage) {
        setMileage(lastVeh.mileage);
      }
    }
  };

  const matchedClientInQuickModal = isNewClientModalOpen
    ? findClientByPhoneOrDoc(newClientPhone, clients) || findClientByPhoneOrDoc(newClientDocument, clients)
    : undefined;

  // Cliente atualmente selecionado
  const selectedClient = clients.find((c) => c.id === clientId);

  // Se o campo estiver vazio ou se o texto exibido for exatamente o nome do cliente selecionado,
  // exibe a lista completa de todos os clientes cadastrados ao abrir a lista suspensa!
  const isInputMatchingSelectedClient = Boolean(
    selectedClient && clientInputValue.trim().toLowerCase() === selectedClient.name.trim().toLowerCase()
  );

  const filteredClientsList = clients.filter((c) => {
    if (!clientInputValue.trim() || isInputMatchingSelectedClient) return true;
    const term = clientInputValue.toLowerCase().trim();
    const rawDigits = term.replace(/\D/g, '');
    const cPhoneDigits = (c.phone || '').replace(/\D/g, '');
    const cDocDigits = (c.document || '').replace(/\D/g, '');

    return (
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.document && c.document.toLowerCase().includes(term)) ||
      (rawDigits.length >= 2 && (cPhoneDigits.includes(rawDigits) || cDocDigits.includes(rawDigits)))
    );
  });

  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehBrand, setNewVehBrand] = useState('');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehYear, setNewVehYear] = useState<number>(new Date().getFullYear());
  const [newVehMileage, setNewVehMileage] = useState<number>(50000);

  // =========================================================================
  // FLUXO DE ENTRADA ÁGIL ESTILO LOVABLE (Placa Mercosul + Cliente Rápido)
  // =========================================================================
  const initialPlate = order ? vehicles.find((v) => v.id === order.vehicleId)?.plate || '' : '';
  const initialModel = order ? vehicles.find((v) => v.id === order.vehicleId)?.model || '' : '';
  const initialClientName = order ? clients.find((c) => c.id === order.clientId)?.name || '' : '';
  const initialClientPhone = order ? clients.find((c) => c.id === order.clientId)?.phone || '' : '';

  const [plateInput, setPlateInput] = useState(initialPlate);
  const [quickModel, setQuickModel] = useState(initialModel);
  const [quickClientName, setQuickClientName] = useState(initialClientName);
  const [quickClientPhone, setQuickClientPhone] = useState(initialClientPhone);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(isEditing);
  const [plateFoundMatch, setPlateFoundMatch] = useState<{ vehicle: Vehicle; client?: Client } | null>(null);

  // Tags de relatos rápidos e opções de combustível estilo Lovable
  const QUICK_SYMPTOM_OPTIONS = [
    'Revisão',
    'Troca de Óleo',
    'Freio',
    'Barulho',
    'Suspensão',
    'Motor falhando',
    'Ar-condicionado',
    'Embreagem',
    'Superaquecimento',
    'Vazamento',
    'Luz da Injeção',
    'Bateria / Partida',
  ];

  const [selectedSymptomTags, setSelectedSymptomTags] = useState<string[]>(() => {
    if (!order?.complaintDescription) return [];
    return QUICK_SYMPTOM_OPTIONS.filter((tag) =>
      order.complaintDescription.toLowerCase().includes(tag.toLowerCase())
    );
  });

  const [complaintDetails, setComplaintDetails] = useState<string>(() => {
    if (!order?.complaintDescription) return '';
    let text = order.complaintDescription;
    QUICK_SYMPTOM_OPTIONS.forEach((tag) => {
      text = text.replace(new RegExp(`\\b${tag}\\b[,;\\s-]*`, 'gi'), '');
    });
    return text.trim();
  });

  const toggleSymptomTag = (tag: string) => {
    setSelectedSymptomTags((prev) => {
      const exists = prev.includes(tag);
      const updated = exists ? prev.filter((t) => t !== tag) : [...prev, tag];
      const fullText = [updated.join(', '), complaintDetails.trim()].filter(Boolean).join(' - ');
      setComplaintDescription(fullText);
      return updated;
    });
  };

  const handleDetailsChange = (val: string) => {
    setComplaintDetails(val);
    const fullText = [selectedSymptomTags.join(', '), val.trim()].filter(Boolean).join(' - ');
    setComplaintDescription(fullText);
  };

  const FUEL_OPTIONS = [
    { label: 'Reserva', value: 0 },
    { label: '1/4', value: 25 },
    { label: '1/2', value: 50 },
    { label: '3/4', value: 75 },
    { label: 'Cheio', value: 100 },
  ];

  // Manipulador de digitação da Placa com busca automática inteligente
  const handlePlateChange = (newPlate: string) => {
    setPlateInput(newPlate);
    const clean = formatPlate(newPlate);

    if (clean.length === 7) {
      // Procura veículo no banco de dados pela placa limpa
      const matchedVeh = vehicles.find((v) => formatPlate(v.plate) === clean);
      if (matchedVeh) {
        setVehicleId(matchedVeh.id);
        setQuickModel(matchedVeh.model);
        if (matchedVeh.mileage) setMileage(matchedVeh.mileage);

        const matchedCli = clients.find((c) => c.id === matchedVeh.clientId);
        if (matchedCli) {
          setClientId(matchedCli.id);
          setQuickClientName(matchedCli.name);
          setQuickClientPhone(matchedCli.phone);
          setClientInputValue(matchedCli.name);
          setPlateFoundMatch({ vehicle: matchedVeh, client: matchedCli });
        } else {
          setPlateFoundMatch({ vehicle: matchedVeh });
        }
      } else {
        setPlateFoundMatch(null);
      }
    } else {
      setPlateFoundMatch(null);
    }
  };

  // Sincroniza se o veículo mudar externamente
  useEffect(() => {
    if (vehicleId) {
      const v = vehicles.find((veh) => veh.id === vehicleId);
      if (v && v.plate) {
        setPlateInput(v.plate);
        setQuickModel(v.model);
      }
    }
  }, [vehicleId, vehicles]);

  // Sincroniza se o cliente mudar externamente
  useEffect(() => {
    if (clientId) {
      const c = clients.find((cli) => cli.id === clientId);
      if (c) {
        setQuickClientName(c.name);
        setQuickClientPhone(c.phone);
      }
    }
  }, [clientId, clients]);

  // Assegura criação de cliente e veículo se digitados diretamente na entrada ágil
  const ensureQuickClientAndVehicle = (): { targetClientId: string; targetVehicleId: string } => {
    let targetClientId = clientId;
    let targetVehicleId = vehicleId;

    if (quickClientName.trim()) {
      const existingCli = clients.find(
        (c) =>
          c.name.toLowerCase().trim() === quickClientName.toLowerCase().trim() ||
          (quickClientPhone.trim() && c.phone.replace(/\D/g, '') === quickClientPhone.replace(/\D/g, ''))
      );
      if (existingCli) {
        targetClientId = existingCli.id;
      } else if (onSaveClient) {
        const newCli: Client = {
          id: 'cli-' + Date.now(),
          name: quickClientName.trim(),
          phone: quickClientPhone.trim(),
          document: '',
          createdAt: new Date().toISOString(),
        };
        onSaveClient(newCli);
        targetClientId = newCli.id;
        setClientId(targetClientId);
      }
    }

    if (plateInput.trim()) {
      const cleanP = formatPlate(plateInput);
      const existingVeh = vehicles.find((v) => formatPlate(v.plate) === cleanP);
      if (existingVeh) {
        targetVehicleId = existingVeh.id;
      } else if (onSaveVehicle && targetClientId) {
        const newVeh: Vehicle = {
          id: 'veh-' + Date.now(),
          clientId: targetClientId,
          plate: cleanP,
          brand: 'Genérica',
          model: quickModel.trim() || 'Veículo Cadastrado na OS',
          year: new Date().getFullYear(),
          mileage: Number(mileage) || 50000,
          fuelType: 'flex',
        };
        onSaveVehicle(newVeh);
        targetVehicleId = newVeh.id;
        setVehicleId(targetVehicleId);
      }
    }

    return { targetClientId, targetVehicleId };
  };

  // Modo de Fornecimento de Peças & Insumos
  const [partsSupplyMode, setPartsSupplyMode] = useState<PartsSupplyMode>(
    order?.partsSupplyMode || 'oficina'
  );
  const [clientProvidedPartsNotes, setClientProvidedPartsNotes] = useState<string>(
    order?.clientProvidedPartsNotes || ''
  );

  // Seletores com Busca Digitável - Peças & Insumos
  const [partSearch, setPartSearch] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partPriceInput, setPartPriceInput] = useState('');
  const [isPartDropdownOpen, setIsPartDropdownOpen] = useState(false);
  const [totalPartsInput, setTotalPartsInput] = useState('');
  const [isEditingTotalParts, setIsEditingTotalParts] = useState(false);

  // Seletores com Busca Digitável - Serviços
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [servicePriceInput, setServicePriceInput] = useState('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [totalServicesInput, setTotalServicesInput] = useState('');
  const [isEditingTotalServices, setIsEditingTotalServices] = useState(false);
  const [customServicesTotal, setCustomServicesTotal] = useState<number | null>(
    order?.servicesTotal !== undefined && order.servicesTotal > 0 && order.services.every((s) => s.price === 0)
      ? order.servicesTotal
      : null
  );

  // Sincroniza veículos quando o cliente muda
  const clientVehicles = vehicles.filter((v) => v.clientId === clientId);

  useEffect(() => {
    if (clientVehicles.length > 0 && !clientVehicles.find((v) => v.id === vehicleId)) {
      const latest = getClientLatestVehicle(clientId, vehicles, allOrders) || clientVehicles[clientVehicles.length - 1];
      setVehicleId(latest.id);
      if (latest.mileage) {
        setMileage(latest.mileage);
      }
    }
  }, [clientId, vehicles]);

  // Se o status da OS mudar para aprovado/em andamento/finalizado, define automaticamente a data de serviço se vazia
  const handleStatusChange = (newStatus: OrderStatus) => {
    setStatus(newStatus);
    const isApprovedOrActive =
      newStatus === 'aprovado' ||
      newStatus === 'em_andamento' ||
      newStatus === 'pronto' ||
      newStatus === 'finalizado';
    if (isApprovedOrActive && !serviceDate) {
      setServiceDate(toIsoDate(new Date()));
    }
  };

  // Cálculos Automáticos em Tempo Real
  const partsTotal = partsSupplyMode === 'cliente_todas' ? 0 : parts.reduce((acc, p) => acc + p.total, 0);
  const sumServices = services.reduce((acc, s) => acc + s.price, 0);
  const servicesTotal =
    customServicesTotal !== null && customServicesTotal > 0 && sumServices === 0
      ? customServicesTotal
      : sumServices;
  const grossTotal = partsTotal + servicesTotal;
  const netTotal = Math.max(0, grossTotal - discount);

  const currentMechanic = mechanics.find((m) => m.id === mechanicId);
  const mechanicCommRate = currentMechanic?.commissionRate || 15;
  const mechanicsCommissionTotal =
    sumServices === 0 && servicesTotal > 0
      ? (servicesTotal * mechanicCommRate) / 100
      : services.reduce((acc, s) => acc + s.commissionValue, 0);

  const partsCostTotal = partsSupplyMode === 'cliente_todas' ? 0 : parts.reduce((acc, p) => acc + p.unitCost * p.quantity, 0);
  const netProfit = netTotal - partsCostTotal - mechanicsCommissionTotal;
  const profitMarginPercent = netTotal > 0 ? (netProfit / netTotal) * 100 : 0;

  // Etapa Atual da OS: Orçamento/Proposta vs. Fechamento/Execução
  const isQuotationStage = status === 'orcamento' || status === 'aguardando_aprovacao';
  const zeroPriceParts = parts.filter((p) => p.unitPrice === 0);

  // Helper para Snapshot dos Dados da OS para WhatsApp e Impressão
  const getOrderDataSnapshot = (): ServiceOrder => ({
    ...order!,
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
    partsSupplyMode,
    clientProvidedPartsNotes,
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
    entryDate,
    serviceDate,
    warrantyDays,
    warrantyExpiresAt: warrantyInfo.expiryDateStr,
    proposalValidity,
    notes: customerNotes,
    createdAt: order?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleShareBudget = async () => {
    const vehName = quickModel || (currentVehicle ? `${currentVehicle.brand} ${currentVehicle.model}` : 'Veículo');
    const plateStr = formatPlate(plateInput) || currentVehicle?.plate || '';
    const message = `*OFICINA MESTRE* - Proposta de Orçamento ${orderNumber}\nVeículo: ${vehName} (${plateStr})\nTotal: R$ ${formatCurrency(netTotal)}\nValidade da Proposta: ${proposalValidity}\n${customerNotes ? `Observações: ${customerNotes}\n` : ''}Itens sujeitos à aprovação.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Orçamento ${orderNumber} — Oficina Mestre`,
          text: message,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          // segue para fallback
        }
      }
    }

    if (currentClient?.phone) {
      WhatsAppService.openWhatsAppChat(currentClient.phone, message);
    } else {
      try {
        await navigator.clipboard.writeText(message);
        alert('Resumo do orçamento copiado para a área de transferência!');
      } catch {
        alert('Não foi possível compartilhar o orçamento.');
      }
    }
  };

  const handleCopyOrderMessage = async () => {
    const orderData = getOrderDataSnapshot();
    const currentMechanicName = mechanics.find((m) => m.id === mechanicId)?.name;
    const msg = WhatsAppService.getMessageForOrder(orderData, currentClient!, currentVehicle!, currentMechanicName);
    const success = await WhatsAppService.copyToClipboard(msg);
    if (success) {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    }
  };

  // Referência para captura da proposta oficial em PNG (layout idêntico ao Imprimir Orçamento)
  const quotationDocRef = useRef<HTMLDivElement>(null);
  const [isGeneratingQuotationPng, setIsGeneratingQuotationPng] = useState(false);
  const [pngFeedbackInfo, setPngFeedbackInfo] = useState<{
    copied: boolean;
    shared: boolean;
    dataUrl: string;
    blob: Blob;
  } | null>(null);

  const handleSendQuotationWhatsAppPng = async () => {
    if (!quotationDocRef.current || !currentClient?.phone) return;
    setIsGeneratingQuotationPng(true);
    if (status === 'orcamento') {
      handleStatusChange('aguardando_aprovacao');
    }
    try {
      const orderData = getOrderDataSnapshot();
      const res = await QuotationImageService.sendQuotationToWhatsApp({
        element: quotationDocRef.current,
        orderNumber: orderData.orderNumber,
        phone: currentClient.phone,
        customText: 'Para darmos início aos serviços, responda com *AUTORIZADO*',
      });
      setPngFeedbackInfo({
        copied: res.copiedToClipboard,
        shared: res.sharedNatively,
        dataUrl: res.dataUrl,
        blob: res.blob,
      });
    } catch (err) {
      console.error('Erro ao gerar orçamento em PNG:', err);
      alert('Não foi possível gerar a imagem do orçamento. Tente novamente.');
    } finally {
      setIsGeneratingQuotationPng(false);
    }
  };

  const handleDownloadQuotationPng = async () => {
    if (!quotationDocRef.current) return;
    setIsGeneratingQuotationPng(true);
    try {
      const { dataUrl } = await QuotationImageService.generateImage(quotationDocRef.current);
      QuotationImageService.downloadImage(dataUrl, `orcamento-${orderNumber}.png`);
    } catch (err) {
      console.error('Erro ao baixar PNG do orçamento:', err);
      alert('Não foi possível baixar a imagem. Tente novamente.');
    } finally {
      setIsGeneratingQuotationPng(false);
    }
  };

  // Informações de Garantia Calculadas (90 dias padrão CDC)
  const warrantyInfo = getOrderWarranty({
    entryDate,
    serviceDate: serviceDate || undefined,
    warrantyDays,
    createdAt: order?.createdAt || new Date().toISOString(),
    finishedAt: status === 'finalizado' ? order?.finishedAt || new Date().toISOString() : undefined,
  });

  // Status de O.S. Finalizada (impede alteração ou avanço desnecessário)
  const isFinalized = order?.status === 'finalizado' || status === 'finalizado';

  // Cálculo da Data Prevista de Retorno (Previsão Preventiva)
  const estimatedReturnDateFormatted = (() => {
    const baseDateStr = serviceDate || entryDate || toIsoDate(new Date());

    // 1. Tenta buscar registro salvo no storage para esta OS ou veículo, garantindo que seja futuro
    const storedRecords = StorageService.getMaintenanceRecords();
    const orderRecord = storedRecords.find(
      (r) =>
        ((order?.id && r.serviceOrderId === order.id) || (vehicleId && r.vehicleId === vehicleId)) &&
        r.estimatedReturnDate &&
        r.estimatedReturnDate > baseDateStr
    );

    if (orderRecord?.estimatedReturnDate) {
      return formatBrDate(orderRecord.estimatedReturnDate);
    }

    // 2. Se não houver registro prévio futuro, calcula dinamicamente baseado nos serviços/peças da OS e perfil do veículo
    let detectedType = 'troca_oleo';
    if (services.length > 0) {
      const types = services.map((s) => PreventiveMaintenanceService.detectServiceType(s.description));
      if (types.includes('troca_oleo')) detectedType = 'troca_oleo';
      else if (types.includes('alinhamento')) detectedType = 'alinhamento';
      else if (types.includes('freios')) detectedType = 'freios';
      else if (types.includes('revisao_geral')) detectedType = 'revisao_geral';
      else if (types.includes('correia_dentada')) detectedType = 'correia_dentada';
      else detectedType = types[0] || 'troca_oleo';
    } else if (parts.length > 0) {
      const types = parts.map((p) => PreventiveMaintenanceService.detectServiceType(p.description));
      if (types.includes('troca_oleo')) detectedType = 'troca_oleo';
      else if (types.includes('freios')) detectedType = 'freios';
      else detectedType = types[0] || 'troca_oleo';
    }

    const currentV = vehicles.find((v) => v.id === vehicleId);
    const profile = currentV?.usageProfile || 'normal';
    const params = PreventiveMaintenanceService.getIntervalParams(
      detectedType as any,
      profile,
      currentV?.averageMonthlyKm
    );

    const baseD = parseLocalDate(baseDateStr);
    const retDate = new Date(baseD.getFullYear(), baseD.getMonth(), baseD.getDate() + params.intervalDays);
    return formatBrDate(retDate);
  })();

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

  // Handlers para Peças & Insumos
  const handleAddPart = (
    targetPartId?: string,
    customDescription?: string,
    customUnitPrice?: number,
    customQty?: number
  ) => {
    const pId = targetPartId || selectedPartId;
    const partFound = availableParts.find((p) => p.id === pId);
    const qty = customQty !== undefined ? customQty : Math.max(1, partQty);

    const parsedPrice = parseFloat(partPriceInput.replace(',', '.'));
    const hasValidInputPrice = !isNaN(parsedPrice) && parsedPrice >= 0;

    if (partFound) {
      const unitPrice =
        customUnitPrice !== undefined
          ? customUnitPrice
          : hasValidInputPrice
          ? parsedPrice
          : partFound.sellPrice;

      // Se a peça já está na lista, apenas incrementa a quantidade
      const existingIndex = parts.findIndex((p) => p.partId === partFound.id);
      if (existingIndex >= 0) {
        const updated = [...parts];
        const newQty = updated[existingIndex].quantity + qty;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          unitPrice,
          total: Math.round(unitPrice * newQty * 100) / 100,
        };
        setParts(updated);
      } else {
        const newItem: OrderPartItem = {
          id: 'poi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          partId: partFound.id,
          code: partFound.code,
          description: partFound.description,
          quantity: qty,
          unitCost: partFound.costPrice,
          unitPrice,
          total: Math.round(unitPrice * qty * 100) / 100,
        };
        setParts((prev) => [...prev, newItem]);
      }
    } else {
      // Inserção de Peça/Insumo Avulso fora do catálogo
      const typedText = (customDescription || partSearch).trim();
      if (!typedText) return;

      const unitPrice =
        customUnitPrice !== undefined
          ? customUnitPrice
          : hasValidInputPrice
          ? parsedPrice
          : 0;

      const newItem: OrderPartItem = {
        id: 'poi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        partId: undefined,
        code: 'AVULSO',
        description: typedText,
        quantity: qty,
        unitCost: 0,
        unitPrice,
        total: Math.round(unitPrice * qty * 100) / 100,
      };
      setParts((prev) => [...prev, newItem]);
    }

    setSelectedPartId('');
    setPartSearch('');
    setPartPriceInput('');
    setPartQty(1);
    setIsPartDropdownOpen(false);
  };

  const handleUpdatePartQty = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setParts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            quantity: newQty,
            total: Math.round(p.unitPrice * newQty * 100) / 100,
          };
        }
        return p;
      })
    );
  };

  const handleUpdatePartUnitPrice = (id: string, newUnitPrice: number) => {
    const price = Math.max(0, isNaN(newUnitPrice) ? 0 : newUnitPrice);
    setParts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            unitPrice: price,
            total: Math.round(price * p.quantity * 100) / 100,
          };
        }
        return p;
      })
    );
  };

  const handleApplyTotalParts = (val: string) => {
    const newTotal = parseFloat(val.replace(',', '.'));
    if (isNaN(newTotal) || newTotal < 0) return;

    if (parts.length === 0) {
      if (newTotal > 0) {
        const newItem: OrderPartItem = {
          id: 'poi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          partId: undefined,
          code: 'AVULSO',
          description: 'Peças & Insumos Gerais',
          quantity: 1,
          unitCost: 0,
          unitPrice: newTotal,
          total: newTotal,
        };
        setParts([newItem]);
      }
      return;
    }

    if (parts.length === 1) {
      const q = Math.max(1, parts[0].quantity);
      const unitP = Math.round((newTotal / q) * 100) / 100;
      setParts([
        {
          ...parts[0],
          unitPrice: unitP,
          total: newTotal,
        },
      ]);
      return;
    }

    // Distribuir proporcionalmente entre as peças existentes (ou igualmente se soma atual for zero)
    const currentSum = parts.reduce((acc, p) => acc + p.total, 0);
    let allocated = 0;
    const updated = parts.map((p, idx) => {
      let itemTotal: number;
      if (idx === parts.length - 1) {
        itemTotal = Math.max(0, Math.round((newTotal - allocated) * 100) / 100);
      } else {
        const ratio = currentSum > 0 ? p.total / currentSum : 1 / parts.length;
        itemTotal = Math.round(ratio * newTotal * 100) / 100;
        allocated += itemTotal;
      }
      const unitPrice = Math.round((itemTotal / Math.max(1, p.quantity)) * 100) / 100;
      return {
        ...p,
        unitPrice,
        total: itemTotal,
      };
    });

    setParts(updated);
  };

  const handleRemovePart = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  // Handlers para Serviços
  const handleAddService = (targetServiceId?: string, customName?: string, customPrice?: number) => {
    const sId = targetServiceId || selectedServiceId;
    const serviceFound = availableServices.find((s) => s.id === sId);

    let description = '';
    let serviceId: string | undefined = undefined;
    let price = 0;

    const parsedInputPrice = parseFloat(servicePriceInput.replace(',', '.'));
    const hasValidInputPrice = !isNaN(parsedInputPrice) && parsedInputPrice >= 0;

    if (serviceFound) {
      serviceId = serviceFound.id;
      description = serviceFound.name;
      price = customPrice !== undefined ? customPrice : (hasValidInputPrice ? parsedInputPrice : serviceFound.standardPrice);
    } else {
      const typedText = (customName || serviceSearch).trim();
      if (!typedText) return;
      description = typedText;
      price = customPrice !== undefined ? customPrice : (hasValidInputPrice ? parsedInputPrice : 0);
    }

    const currentMechanic = mechanics.find((m) => m.id === mechanicId);
    const commRate = currentMechanic?.commissionRate || 15;
    const commVal = (price * commRate) / 100;

    const newService: OrderServiceItem = {
      id: 'soi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      serviceId,
      description,
      mechanicId,
      price,
      commissionRate: commRate,
      commissionValue: commVal,
    };

    setServices((prev) => [...prev, newService]);
    setSelectedServiceId('');
    setServiceSearch('');
    setServicePriceInput('');
    setIsServiceDropdownOpen(false);
  };

  const handleUpdateServicePrice = (id: string, newPrice: number) => {
    const currentMechanic = mechanics.find((m) => m.id === mechanicId);
    const commRate = currentMechanic?.commissionRate || 15;
    const p = Math.max(0, isNaN(newPrice) ? 0 : newPrice);
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            price: p,
            commissionValue: (p * (s.commissionRate || commRate)) / 100,
          };
        }
        return s;
      })
    );
    if (p > 0) {
      setCustomServicesTotal(null);
    }
  };

  const handleApplyTotalServices = (val: string) => {
    const newTotal = parseFloat(val.replace(',', '.'));
    if (isNaN(newTotal) || newTotal < 0) return;

    const currentMechanic = mechanics.find((m) => m.id === mechanicId);
    const commRate = currentMechanic?.commissionRate || 15;

    if (services.length === 0) {
      if (newTotal > 0) {
        const newService: OrderServiceItem = {
          id: 'soi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          serviceId: undefined,
          description: 'Mão de Obra Geral / Serviços',
          mechanicId,
          price: newTotal,
          commissionRate: commRate,
          commissionValue: (newTotal * commRate) / 100,
        };
        setServices([newService]);
        setCustomServicesTotal(null);
      }
      return;
    }

    const currentSum = services.reduce((acc, s) => acc + s.price, 0);

    // REGRA DE OPERAÇÃO:
    // Se o mecânico NÃO entrou com o valor de mão de obra individual (soma dos serviços é 0),
    // ao totalizar o valor, NÃO DILUIR o valor total para cada serviço!
    // Mantém todos os serviços descritos e atribui o total global de mão de obra.
    if (currentSum === 0) {
      setCustomServicesTotal(newTotal);
      return;
    }

    if (services.length === 1) {
      setServices([
        {
          ...services[0],
          price: newTotal,
          commissionValue: (newTotal * (services[0].commissionRate || commRate)) / 100,
        },
      ]);
      setCustomServicesTotal(null);
      return;
    }

    // Se já havia preços individuais maiores que zero, distribui proporcionalmente
    let allocated = 0;
    const updated = services.map((s, idx) => {
      let p: number;
      if (idx === services.length - 1) {
        p = Math.max(0, Math.round((newTotal - allocated) * 100) / 100);
      } else {
        const ratio = s.price / currentSum;
        p = Math.round(ratio * newTotal * 100) / 100;
        allocated += p;
      }
      return {
        ...s,
        price: p,
        commissionValue: (p * (s.commissionRate || commRate)) / 100,
      };
    });

    setServices(updated);
    setCustomServicesTotal(null);
  };

  const handleRemoveService = (id: string) => {
    setServices((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        setCustomServicesTotal(null);
      }
      return remaining;
    });
  };

  // Marcar/Desmarcar Tudo no Checklist de Entrada em 1 Toque
  const handleToggleChecklistAll = () => {
    const allChecked = hasSpareWheel && hasJack && hasLugWrench && hasTriangle;
    setHasSpareWheel(!allChecked);
    setHasJack(!allChecked);
    setHasLugWrench(!allChecked);
    setHasTriangle(!allChecked);
  };

  // Salvar Novo Cliente & Veículo diretamente no Modal da OS
  const handleSaveNewClientQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) return;

    const newClient: Client = {
      id: 'cli-' + Date.now(),
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      document: newClientDocument.trim(),
      address: newClientAddress.trim(),
      createdAt: new Date().toISOString(),
    };

    let newVeh: Vehicle | undefined = undefined;
    if (newClientHasVehicle && newClientPlate.trim() && newClientModel.trim()) {
      newVeh = {
        id: 'veh-' + Date.now(),
        clientId: newClient.id,
        plate: newClientPlate.toUpperCase().trim(),
        brand: newClientBrand.trim() || 'Genérica',
        model: newClientModel.trim(),
        year: Number(newClientYear) || new Date().getFullYear(),
        mileage: Number(newClientMileage) || 50000,
        fuelType: 'flex',
      };
    }

    if (onSaveClient) {
      onSaveClient(newClient, newVeh);
    }

    // Seleciona o novo cliente e veículo na OS imediatamente
    setClientId(newClient.id);
    if (newVeh) {
      setVehicleId(newVeh.id);
      setMileage(newVeh.mileage);
    }

    // Limpa formulário e fecha modal
    setNewClientName('');
    setNewClientPhone('');
    setNewClientDocument('');
    setNewClientAddress('');
    setNewClientPlate('');
    setNewClientBrand('');
    setNewClientModel('');
    setIsNewClientModalOpen(false);
  };

  // Salvar Novo Veículo diretamente no Modal da OS
  const handleSaveNewVehicleQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehPlate.trim() || !newVehModel.trim() || !clientId) return;

    const newVeh: Vehicle = {
      id: 'veh-' + Date.now(),
      clientId: clientId,
      plate: newVehPlate.toUpperCase().trim(),
      brand: newVehBrand.trim() || 'Genérica',
      model: newVehModel.trim(),
      year: Number(newVehYear) || new Date().getFullYear(),
      mileage: Number(newVehMileage) || 50000,
      fuelType: 'flex',
    };

    if (onSaveVehicle) {
      onSaveVehicle(newVeh);
    }

    // Seleciona o novo veículo imediatamente
    setVehicleId(newVeh.id);
    setMileage(newVeh.mileage);

    // Limpa formulário e fecha modal
    setNewVehPlate('');
    setNewVehBrand('');
    setNewVehModel('');
    setIsNewVehicleModalOpen(false);
  };

  // Salvar Ordem de Serviço
  const handleSave = () => {
    if (isReadOnly) {
      return;
    }

    const { targetClientId, targetVehicleId } = ensureQuickClientAndVehicle();
    const finalClientId = targetClientId || clientId || clients[0]?.id || '';
    const finalVehicleId = targetVehicleId || vehicleId || vehicles[0]?.id || '';

    const isApprovedOrActive =
      status === 'aprovado' ||
      status === 'em_andamento' ||
      status === 'pronto' ||
      status === 'finalizado';

    const calculatedServiceDate = serviceDate || (isApprovedOrActive ? toIsoDate(new Date()) : undefined);

    const currentOrder: ServiceOrder = {
      id: order?.id || 'ord-' + Date.now(),
      orderNumber,
      clientId: finalClientId,
      vehicleId: finalVehicleId,
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
      partsSupplyMode,
      clientProvidedPartsNotes,
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
      entryDate,
      serviceDate: calculatedServiceDate,
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

  // Referência para captura do Prontuário / Recibo da OS Finalizada
  const finalizedReceiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingFinalizedPng, setIsGeneratingFinalizedPng] = useState(false);

  const handleDownloadFinalizedPng = async () => {
    if (!finalizedReceiptRef.current) return;
    setIsGeneratingFinalizedPng(true);
    try {
      const { dataUrl } = await QuotationImageService.generateImage(finalizedReceiptRef.current);
      QuotationImageService.downloadImage(dataUrl, `recibo-${orderNumber}.png`);
    } catch (err) {
      console.error('Erro ao baixar PNG do recibo:', err);
      alert('Não foi possível baixar a imagem. Tente novamente.');
    } finally {
      setIsGeneratingFinalizedPng(false);
    }
  };

  const handleSendWhatsAppReceipt = () => {
    if (!currentClient?.phone) return;
    const orderData = order || getOrderDataSnapshot();
    const msg = WhatsAppService.generateFinalizedMessage(orderData, currentClient, currentVehicle!);
    WhatsAppService.openWhatsAppChat(currentClient.phone, msg);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
        <main className="os-shell w-full max-w-6xl h-[100dvh] sm:h-[94vh] max-h-[100dvh] sm:max-h-[94vh] flex flex-col rounded-none sm:rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          {/* TOPBAR ESTILO V0 AUTOMOTIVO */}
          <header className="topbar">
            <div className="brand-mark">
              <Wrench size={20} />
            </div>
            <div className="brand">
              <span>OFICINA MESTRE</span>
              <div>
                <h1>{isFinalized ? `Prontuário da ${orderNumber}` : isEditing ? `Editar ${orderNumber}` : 'Nova OS'}</h1>
                <b>{orderNumber}</b>
              </div>
              <small>❖ &nbsp;Gestão de Pátio</small>
            </div>
            <div className="vehicle-summary hidden md:flex">
              <span>Entrada: <b>{formatBrDate(entryDate) || 'Hoje'}</b></span>
              <span>Garantia: <strong>{warrantyDays}d pós aprov.</strong></span>
              {estimatedReturnDateFormatted && <span className="return">❖ &nbsp;Retorno: <b>{estimatedReturnDateFormatted}</b></span>}
            </div>
            <label className="status">
              STATUS
              <select value={status} onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}>
                <option value="orcamento">1. Orçamento</option>
                <option value="aprovado">2. Aprovado</option>
                <option value="em_andamento">3. Em Execução</option>
                <option value="pronto">4. Pronto</option>
                <option value="finalizado">5. Finalizada</option>
              </select>
            </label>
            <button className="icon-button" aria-label="Fechar ordem" onClick={onClose}>
              <X size={19} />
            </button>
          </header>

          {/* STEP NAV TABS ESTILO V0 */}
          <nav className="step-nav" aria-label="Etapas da ordem de serviço">
            <button
              type="button"
              className={`step-tab ${activeTab === 'diagnostico' ? 'active' : ''} ${activeTab !== 'diagnostico' ? 'done' : ''}`}
              onClick={() => setActiveTab('diagnostico')}
            >
              <ClipboardList size={16} />
              <span>1. Diagnóstico & Entrada</span>
            </button>
            <button
              type="button"
              className={`step-tab ${activeTab === 'itens' ? 'active' : ''} ${activeTab === 'fechamento' ? 'done' : ''}`}
              onClick={() => setActiveTab('itens')}
            >
              <Wrench size={16} />
              <span>2. Serviços & Peças</span>
            </button>
            <button
              type="button"
              className={`step-tab ${activeTab === 'fechamento' ? 'active' : ''}`}
              onClick={() => setActiveTab('fechamento')}
            >
              <FileText size={16} />
              <span>3. Proposta & Orçamento</span>
              <b>R$ {formatCurrency(netTotal)}</b>
            </button>
          </nav>

          {/* ÁREA DE CONTEÚDO COM ROLAGEM SUAVE */}
          <section className="content-area overflow-y-auto flex-1">
            {/* ETAPA 1: DIAGNÓSTICO & ENTRADA */}
            {activeTab === 'diagnostico' && (
              <div className="panel entry-panel">
                <div className="panel-heading">
                  <div>
                    <ClipboardList size={18} />
                    <h2>Diagnóstico & Entrada</h2>
                  </div>
                  <span>Etapa 1 de 3</span>
                </div>
                <p className="subcopy">Confira os dados recebidos e registre o diagnóstico inicial do veículo.</p>
                <div className="form-grid">
                  <label>
                    Placa
                    <input
                      value={plateInput}
                      onChange={(e) => handlePlateChange(e.target.value.toUpperCase())}
                      placeholder="ABC1D23"
                      maxLength={8}
                    />
                  </label>
                  <label>
                    Veículo
                    <input
                      value={quickModel}
                      onChange={(e) => setQuickModel(e.target.value)}
                      placeholder="Gol 1.6 prata"
                    />
                  </label>
                  <label>
                    Cliente
                    <input
                      value={quickClientName}
                      onChange={(e) => setQuickClientName(e.target.value)}
                      placeholder="Mariana Costa"
                    />
                  </label>
                  <label>
                    WhatsApp
                    <input
                      value={quickClientPhone}
                      onChange={(e) => setQuickClientPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      type="tel"
                    />
                  </label>
                  <label className="wide">
                    Queixa relatada
                    <textarea
                      value={complaintDescription}
                      onChange={(e) => setComplaintDescription(e.target.value)}
                      placeholder="Revisão, barulho na suspensão"
                      rows={3}
                    />
                  </label>

                  {/* SINTOMAS RECORRENTES (1 CLIQUE) - LOGO ABAIXO DA QUEIXA */}
                  <div className="wide -mt-1 pb-1">
                    <label className="text-xs font-semibold text-[#8a9bb5] flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#ffab00]" />
                      Sintomas Recorrentes (1 Clique):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SYMPTOM_OPTIONS.map((symptom) => {
                        const isSelected = complaintDescription.toLowerCase().includes(symptom.toLowerCase());
                        return (
                          <button
                            key={symptom}
                            type="button"
                            onClick={() => toggleSymptomTag(symptom)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-[#ffab00]/20 text-[#ffab00] border-[#ffab00]'
                                : 'bg-[#19263b] text-[#8a9bb5] border-[#1e2b43] hover:text-[#edf2fb] hover:border-[#32415a]'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {symptom}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QUILOMETRAGEM E NÍVEL DE COMBUSTÍVEL */}
                  <label>
                    Quilometragem
                    <input
                      inputMode="numeric"
                      value={mileage ? String(mileage) : ''}
                      onChange={(e) => setMileage(Number(e.target.value.replace(/\D/g, '')))}
                      placeholder="Ex.: 68.500 km"
                    />
                  </label>
                  <div>
                    <label className="block text-[#bac8d9] font-[650] text-[11px] mb-[7px]">
                      Nível de combustível
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 h-[42px]">
                      {[
                        { label: 'Reserva', value: 10 },
                        { label: '1/4', value: 25 },
                        { label: '1/2', value: 50 },
                        { label: '3/4', value: 75 },
                        { label: 'Cheio', value: 100 },
                      ].map((opt) => {
                        const isSelected =
                          opt.label === 'Reserva' ? fuelLevel <= 15 :
                          opt.label === '1/4' ? fuelLevel > 15 && fuelLevel <= 35 :
                          opt.label === '1/2' ? fuelLevel > 35 && fuelLevel <= 65 :
                          opt.label === '3/4' ? fuelLevel > 65 && fuelLevel <= 85 :
                          fuelLevel > 85;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setFuelLevel(opt.value)}
                            className={`h-full rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                              isSelected
                                ? 'bg-[#ffab00] text-slate-950 font-black shadow-md ring-1 ring-[#ffab00]'
                                : 'bg-[#19263b] text-[#8a9bb5] border border-[#32415a] hover:text-[#edf2fb] hover:border-[#4d6387]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ATALHOS DE QUILOMETRAGEM EM FILEIRAS DE 10 EM 10 MIL */}
                  <div className="wide -mt-1 pt-3 border-t border-[#1e2b43]/60 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-[650] text-[#bac8d9] flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-[#ffab00]" />
                        Atalhos Rápidos de KM (5 em 5 mil até 150 mil):
                      </span>
                      {mileage > 0 && (
                        <span className="text-[11px] font-mono font-bold text-[#ffab00] bg-[#19263b] px-2 py-0.5 rounded border border-[#2b3d5b]">
                          {mileage.toLocaleString('pt-BR')} km selecionados
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {MILEAGE_QUICK_ROWS.map((row) => (
                        <div key={row.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="text-[10px] text-[#7284a1] font-mono font-bold w-14 shrink-0 hidden sm:inline">
                            {row.label}:
                          </span>
                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 flex-1">
                            {row.values.map((val) => {
                              const isSelected = mileage === val;
                              const valFormatted = val / 1000;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => setMileage(val)}
                                  className={`py-1.5 px-0.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#ffab00] text-slate-950 font-black shadow-md ring-1 ring-[#ffab00]'
                                      : 'bg-[#19263b] text-[#8a9bb5] border border-[#2b3d5b] hover:text-[#edf2fb] hover:border-[#3e5377]'
                                  }`}
                                >
                                  <span className="sm:hidden">{valFormatted}k</span>
                                  <span className="hidden sm:inline">{valFormatted} mil</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* DIAGNÓSTICO TÉCNICO DO MECÂNICO */}
                <div className="mt-4 pt-4 border-t border-[#1e2b43]">
                  <label className="block text-xs font-semibold text-[#8a9bb5]">
                    Diagnóstico Técnico do Mecânico
                    <textarea
                      value={technicalDiagnostic}
                      onChange={(e) => setTechnicalDiagnostic(e.target.value)}
                      placeholder="Ex: Folga axial nos pivôs da bandeja dianteira, vazamento no retentor do câmbio..."
                      className="mt-1 w-full bg-[#19263b] text-[#edf2fb] border border-[#2b3d5b] rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-[#ffab00] outline-none"
                      rows={2}
                    />
                  </label>
                </div>

                {/* CHECKLIST DE ITENS / ACESSÓRIOS */}
                <div className="mt-4 pt-4 border-t border-[#1e2b43]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#8a9bb5] uppercase tracking-wider">Acessórios / Itens Presentes</span>
                    <button
                      type="button"
                      onClick={handleToggleChecklistAll}
                      className="text-[11px] text-[#ffab00] hover:underline"
                    >
                      Alternar Todos
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Estepe', val: hasSpareWheel, set: setHasSpareWheel },
                      { label: 'Macaco', val: hasJack, set: setHasJack },
                      { label: 'Chave de Roda', val: hasLugWrench, set: setHasLugWrench },
                      { label: 'Triângulo', val: hasTriangle, set: setHasTriangle },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => item.set(!item.val)}
                        className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-between transition-all ${
                          item.val
                            ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                            : 'bg-[#19243a] border-[#1e2b43] text-slate-400'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span>{item.val ? '✓ Sim' : '✕ Não'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* IMAGEM DO CARRO PARA O MECÂNICO MARCAR AVARIAS (BLUEPRINT) */}
                <div className="mt-4 pt-4 border-t border-[#1e2b43]">
                  <CarDamageCanvas
                    damagePoints={damagePoints}
                    onChange={setDamagePoints}
                    readOnly={isReadOnly}
                  />
                </div>

                {/* MECÂNICO RESPONSÁVEL & DATA DE ENTRADA */}
                <div className="mt-4 pt-4 border-t border-[#1e2b43] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#8a9bb5] mb-1">Mecânico Responsável</label>
                    <select
                      value={mechanicId}
                      onChange={(e) => setMechanicId(e.target.value)}
                      className="w-full bg-[#19263b] text-[#edf2fb] border border-[#2b3d5b] rounded-lg p-2 text-xs"
                    >
                      {mechanics.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.commissionRate}% comissão)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#8a9bb5] mb-1">Data de Entrada</label>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full bg-[#19263b] text-[#edf2fb] border border-[#2b3d5b] rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: SERVIÇOS & PEÇAS */}
            {activeTab === 'itens' && (
              <>
                {/* SUMMARY PANEL */}
                <div className="panel summary-panel">
                  <div className="summary-top">
                    <span>
                      <b>{plateInput || 'SEM PLACA'}</b> &nbsp; {quickModel || (currentVehicle ? `${currentVehicle.brand} ${currentVehicle.model}` : 'Veículo')} <i>•</i> {quickClientName || (currentClient ? currentClient.name : 'Cliente')}
                    </span>
                    <span>Queixa: {complaintDescription || 'Não informada'}</span>
                  </div>
                  <p>
                    {discount > 0 
                      ? `Desconto comercial de R$ ${formatCurrency(discount)} aplicado.`
                      : 'Sem desconto comercial aplicado. O subtotal bruto corresponde ao total da O.S.'}
                  </p>
                  <button
                    type="button"
                    className="discount-link"
                    onClick={() => {
                      if (discount > 0) setDiscount(0);
                      else {
                        const val = prompt('Digite o valor do desconto (R$):', '25');
                        if (val) setDiscount(Number(val.replace(',', '.')) || 0);
                      }
                    }}
                  >
                    {discount > 0 ? `Remover desconto (-R$ ${formatCurrency(discount)})` : '+ Aplicar Desconto'}
                  </button>
                </div>

                {/* SERVICE PANEL */}
                <div className="panel service-panel">
                  <div className="panel-heading">
                    <div>
                      <Wrench size={17} />
                      <h2>Mão de Obra & Serviços Mecânicos</h2>
                    </div>
                    <strong>Subtotal: R$ {formatCurrency(servicesTotal)}</strong>
                  </div>

                  <p className="section-label">
                    <Sparkles size={14} /> Combos Rápidos & Serviços Pré-Cadastrados (1 Clique):
                  </p>
                  <div className="quick-list">
                    {DEFAULT_QUICK_SERVICES.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => handleAddService(undefined, item.name, item.value)}
                      >
                        <Plus size={13} /> {item.name} <b>R$ {formatCurrency(item.value)}</b>
                      </button>
                    ))}
                  </div>

                  <label className="catalog-select">
                    <span>▤ &nbsp;Escolher do Catálogo Completo de Serviços da Oficina ({availableServices.length} cadastrados)...</span>
                    <select
                      aria-label="Catálogo de serviços"
                      value=""
                      onChange={(e) => {
                        const s = availableServices.find((x) => x.id === e.target.value);
                        if (s) handleAddService(s.id);
                      }}
                    >
                      <option value="" disabled></option>
                      {availableServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} - R$ {formatCurrency(s.standardPrice)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} />
                  </label>

                  <div className="add-row">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        placeholder="Digite o serviço (ex: alinhamento, troca de óleo, freios)..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && serviceSearch.trim()) {
                            e.preventDefault();
                            handleAddService();
                            setServiceSearch('');
                            setServicePriceInput('');
                          }
                        }}
                      />
                    </div>
                    <label className="price-input">
                      <span>R$</span>
                      <input
                        inputMode="decimal"
                        value={servicePriceInput}
                        onChange={(e) => setServicePriceInput(e.target.value.replace(/[^\d,.]/g, ''))}
                        placeholder="Valor"
                      />
                    </label>
                    <button
                      type="button"
                      className="add-button"
                      onClick={() => {
                        if (serviceSearch.trim()) {
                          handleAddService();
                          setServiceSearch('');
                          setServicePriceInput('');
                        }
                      }}
                    >
                      <Plus size={17} /> Adicionar
                    </button>
                  </div>

                  {/* LISTA DE SERVIÇOS ADICIONADOS */}
                  {services.length === 0 ? (
                    <div className="empty-state">Nenhum serviço mecânico adicionado ainda.</div>
                  ) : (
                    <div className="line-list">
                      {services.map((item) => (
                        <div className="line-item" key={item.id}>
                          <div className="flex-1 min-w-0 pr-2">
                            <span className="font-semibold text-[#edf2fb] block truncate">{item.description}</span>
                            <span className="text-[11px] text-[#7284a1]">
                              Mecânico: {mechanics.find((m) => m.id === (item.mechanicId || mechanicId))?.name || 'Geral'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={item.price}
                              onChange={(e) => handleUpdateServicePrice(item.id, Number(e.target.value))}
                              className="w-24 bg-[#19263b] text-right text-xs font-bold text-[#edf2fb] border border-[#2b3d5b] rounded px-2 py-1"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveService(item.id)}
                              aria-label={`Remover ${item.description}`}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TOTAL DA MÃO DE OBRA */}
                  <label className="labor-total">
                    <span>
                      <b>TOTAL DA MÃO DE OBRA (SERVIÇOS):</b>
                      <small>Digite o valor total de mão de obra para criar o pacote de serviços.</small>
                    </span>
                    <div>
                      <b>R$</b>
                      <input
                        inputMode="decimal"
                        value={customServicesTotal !== null ? customServicesTotal : (sumServices > 0 ? sumServices : '')}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value.replace(',', '.'));
                          setCustomServicesTotal(!isNaN(v) ? v : null);
                        }}
                        placeholder="0,00"
                      />
                    </div>
                  </label>
                </div>

                {/* PARTS PANEL */}
                <div className="panel parts-panel">
                  <div className="panel-heading">
                    <div>
                      <Sparkles size={17} />
                      <h2>Peças & Materiais</h2>
                    </div>
                    <strong>Subtotal: R$ {formatCurrency(partsTotal)}</strong>
                  </div>

                  {/* MODO DE FORNECIMENTO DE PEÇAS */}
                  <div className="mb-3 flex items-center justify-between p-2.5 rounded-lg bg-[#11192e] border border-[#1e2b43] flex-wrap gap-2">
                    <span className="text-xs font-bold text-[#8a9bb5]">Quem fornece as peças?</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 'oficina', label: 'Oficina Fornece' },
                        { id: 'cliente', label: 'Cliente Forneceu' },
                        { id: 'misto', label: 'Misto' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPartsSupplyMode(m.id as any)}
                          className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                            partsSupplyMode === m.id
                              ? 'bg-[#ffab00] text-slate-950 font-bold shadow-sm'
                              : 'bg-[#19243a] text-[#8a9bb5] hover:text-white border border-[#2b3d5b]'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="section-label">Adicione peças utilizadas no reparo.</p>

                  <label className="catalog-select mb-3">
                    <span>▤ &nbsp;Buscar no Estoque ({availableParts.length} itens)...</span>
                    <select
                      aria-label="Catálogo de peças"
                      value=""
                      onChange={(e) => {
                        const p = availableParts.find((part) => part.id === e.target.value);
                        if (p) handleAddPart(p.id);
                      }}
                    >
                      <option value="" disabled></option>
                      {availableParts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.description} (Estoque: {p.currentStock}) - R$ {formatCurrency(p.sellPrice)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} />
                  </label>

                  <div className="add-row">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        value={partSearch}
                        onChange={(e) => setPartSearch(e.target.value)}
                        placeholder="Nome da peça (ex: filtro de óleo, pastilha)..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && partSearch.trim()) {
                            e.preventDefault();
                            handleAddPart();
                            setPartSearch('');
                            setPartPriceInput('');
                          }
                        }}
                      />
                    </div>
                    <label className="price-input">
                      <span>R$</span>
                      <input
                        inputMode="decimal"
                        value={partPriceInput}
                        onChange={(e) => setPartPriceInput(e.target.value.replace(/[^\d,.]/g, ''))}
                        placeholder="Valor Unit."
                      />
                    </label>
                    <button
                      type="button"
                      className="add-button"
                      onClick={() => {
                        if (partSearch.trim()) {
                          handleAddPart();
                          setPartSearch('');
                          setPartPriceInput('');
                        }
                      }}
                    >
                      <Plus size={17} /> Adicionar
                    </button>
                  </div>

                  {/* LISTA DE PEÇAS ADICIONADAS */}
                  {parts.length === 0 ? (
                    <div className="empty-state">Nenhuma peça adicionada ainda.</div>
                  ) : (
                    <div className="line-list">
                      {parts.map((item) => {
                        const stockItem = availableParts.find((p) => p.id === item.partId || p.code === item.code);
                        return (
                          <div className="line-item" key={item.id}>
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#edf2fb] truncate">{item.description}</span>
                                {stockItem && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                      stockItem.currentStock <= 0
                                        ? 'bg-red-950/80 text-red-400 border border-red-700'
                                        : 'bg-[#19243a] text-slate-400'
                                    }`}
                                  >
                                    Estoque: {stockItem.currentStock}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#7284a1]">
                                Cód: {item.code || 'S/N'} • R$ {formatCurrency(item.unitPrice)} un.
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-[#19263b] rounded border border-[#2b3d5b]">
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePartQty(item.id, Math.max(1, item.quantity - 1))}
                                  className="px-2 py-1 text-slate-400 hover:text-white"
                                >
                                  -
                                </button>
                                <span className="px-2 text-xs font-bold text-white font-mono">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePartQty(item.id, item.quantity + 1)}
                                  className="px-2 py-1 text-slate-400 hover:text-white"
                                >
                                  +
                                </button>
                              </div>
                              <b className="text-xs font-bold text-[#ffab00] w-20 text-right">
                                R$ {formatCurrency(item.total)}
                              </b>
                              <button
                                type="button"
                                onClick={() => handleRemovePart(item.id)}
                                aria-label={`Remover ${item.description}`}
                                className="text-red-400 hover:text-red-300 p-1"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ETAPA 3: PROPOSTA & ORÇAMENTO */}
            {activeTab === 'fechamento' && (
              <div className="panel proposal-panel">
                <div className="panel-heading">
                  <div>
                    <FileText size={18} />
                    <h2>Proposta & Orçamento</h2>
                  </div>
                  <span>Etapa 3 de 3</span>
                </div>
                <p className="subcopy">Revise os itens e prepare o orçamento para aprovação do cliente.</p>

                <div className="proposal-client">
                  <div>
                    <small>CLIENTE</small>
                    <b>{quickClientName || (currentClient ? currentClient.name : 'Cliente')}</b>
                  </div>
                  <div>
                    <small>VEÍCULO</small>
                    <b>{quickModel || (currentVehicle ? `${currentVehicle.brand} ${currentVehicle.model}` : 'Veículo')} · {plateInput || 'SEM PLACA'}</b>
                  </div>
                  <div>
                    <small>VALIDADE DA PROPOSTA</small>
                    <select
                      value={proposalValidity}
                      onChange={(e) => setProposalValidity(e.target.value as any)}
                    >
                      <option value="3 dias">3 dias</option>
                      <option value="7 dias">7 dias</option>
                      <option value="15 dias">15 dias</option>
                      <option value="30 dias">30 dias</option>
                    </select>
                  </div>
                </div>

                <h3>Itens do orçamento</h3>
                {services.length === 0 && parts.length === 0 ? (
                  <div className="empty-state">Adicione serviços ou peças na etapa anterior.</div>
                ) : (
                  <div className="line-list">
                    {services.map((item, idx) => (
                      <div className="line-item" key={`serv-${item.id || idx}`}>
                        <span>🔧 {item.description}</span>
                        <b>R$ {formatCurrency(item.price)}</b>
                      </div>
                    ))}
                    {parts.map((item, idx) => (
                      <div className="line-item" key={`part-${item.id || idx}`}>
                        <span>📦 {item.description} ({item.quantity}x)</span>
                        <b>R$ {formatCurrency(item.total)}</b>
                      </div>
                    ))}
                  </div>
                )}

                <div className="totals">
                  <div>
                    <span>Serviços e peças</span>
                    <b>R$ {formatCurrency(grossTotal)}</b>
                  </div>
                  <div>
                    <span>Desconto</span>
                    <b>− R$ {formatCurrency(discount)}</b>
                  </div>
                  <div>
                    <span>Mão de obra</span>
                    <b>R$ {formatCurrency(servicesTotal)}</b>
                  </div>
                  <div className="grand-total">
                    <span>Total do orçamento</span>
                    <b>R$ {formatCurrency(netTotal)}</b>
                  </div>
                </div>

                <label className="notes-label">
                  Observações para o cliente
                  <textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Condições, prazo estimado ou recomendações..."
                    rows={3}
                  />
                </label>

                {/* SEÇÃO DRE E MARGEM DA OFICINA (MODO DONO) */}
                <div className="mt-4 pt-3 border-t border-[#1e2b43]">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowProfitDetails(!showProfitDetails)}
                      className="text-xs text-[#7284a1] hover:text-[#edf2fb] flex items-center gap-1.5"
                    >
                      {showProfitDetails ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{showProfitDetails ? 'Ocultar DRE / Margem da Oficina' : 'Ver DRE / Margem de Lucro da Oficina (Modo Dono)'}</span>
                    </button>
                    {isFinalized && (
                      <button
                        type="button"
                        onClick={() => setIsCheckoutOpen(true)}
                        className="text-xs text-[#ffab00] hover:underline font-bold"
                      >
                        Editar Pagamento ({paymentMethod.toUpperCase()} · {isPaid ? 'Pago' : 'Pendente'})
                      </button>
                    )}
                  </div>

                  {showProfitDetails && (
                    <div className="mt-2.5 p-3 rounded-lg bg-[#0c1325] border border-[#1e2b43] text-xs space-y-1.5">
                      <div className="flex justify-between text-[#8a9bb5]">
                        <span>Custo das Peças:</span>
                        <span className="font-mono">R$ {formatCurrency(partsCostTotal)}</span>
                      </div>
                      <div className="flex justify-between text-[#8a9bb5]">
                        <span>Comissão do Mecânico ({currentMechanic?.name || 'Geral'} - {mechanicCommRate}%):</span>
                        <span className="font-mono">R$ {formatCurrency(mechanicsCommissionTotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#ffab00] pt-1.5 border-t border-[#1e2b43]">
                        <span>Lucro Líquido Estimado da Oficina:</span>
                        <span className="font-mono">R$ {formatCurrency(netProfit)} ({profitMarginPercent}%)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* RODAPÉ DE AÇÃO COM BOTÕES CONFORME ETAPA */}
          <footer className={`bottom-bar ${activeTab === 'fechamento' ? 'proposal-footer' : ''}`}>
            <div className="footer-left">
              <button
                type="button"
                className="back-button"
                onClick={() => {
                  if (activeTab === 'fechamento') setActiveTab('itens');
                  else if (activeTab === 'itens') setActiveTab('diagnostico');
                }}
                disabled={activeTab === 'diagnostico'}
              >
                <ChevronLeft size={17} /> Voltar
              </button>

              {activeTab === 'fechamento' && (
                <button
                  type="button"
                  className="save-os-button"
                  onClick={handleSave}
                >
                  <Check size={16} /> Salvar Ordem de Serviço
                </button>
              )}
            </div>

            <div className="footer-actions">
              {activeTab !== 'fechamento' ? (
                <>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      if (activeTab === 'diagnostico') setActiveTab('itens');
                      else if (activeTab === 'itens') setActiveTab('fechamento');
                    }}
                  >
                    Continuar <ChevronRight className="arrow-next" size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="print-button"
                    onClick={() => onPrintReceipt(getOrderDataSnapshot())}
                  >
                    <Printer size={16} /> Imprimir Orçamento
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleShareBudget}
                  >
                    <Send size={16} /> Enviar Orçamento
                  </button>
                </>
              )}
            </div>
          </footer>
        </main>


  
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
          entryDate,
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

      {/* ========================================================================= */}
      {/* MODAL: CADASTRAR NOVO CLIENTE & VEÍCULO (DIRETO PELA O.S.) */}
      {/* ========================================================================= */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSaveNewClientQuick}>
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  Cadastrar Novo Cliente & Veículo
                </h3>
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                {/* Banner de Reconhecimento Automático de Cliente Existente */}
                {matchedClientInQuickModal && (
                  <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                        <UserCheck className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-amber-400 block tracking-wider">
                          Cliente Já Cadastrado Localizado!
                        </span>
                        <span className="text-sm font-black text-white block">
                          {matchedClientInQuickModal.name}
                        </span>
                        <span className="text-[11px] text-slate-300 font-mono block">
                          Tel: {formatPhone(matchedClientInQuickModal.phone)} {matchedClientInQuickModal.document ? `• Doc: ${formatCpfCnpj(matchedClientInQuickModal.document)}` : ''}
                        </span>
                        {(() => {
                          const lastVeh = getClientLatestVehicle(matchedClientInQuickModal.id, vehicles, allOrders);
                          return lastVeh ? (
                            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                              <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Último veículo: <strong className="font-mono text-amber-300">{lastVeh.plate}</strong> - {lastVeh.brand} {lastVeh.model} ({lastVeh.mileage ? `${lastVeh.mileage.toLocaleString('pt-BR')} km` : ''})</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 mt-0.5">Nenhum veículo vinculado ainda</div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const lastVeh = getClientLatestVehicle(matchedClientInQuickModal.id, vehicles, allOrders);
                          handleIdentifyAndPullClient(matchedClientInQuickModal, lastVeh);
                          setIsNewClientModalOpen(false);
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                        title="Puxar cliente e seu último veículo para esta OS e fechar modal"
                      >
                        <UserCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>Puxar Cliente & Último Veículo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewClientName(matchedClientInQuickModal.name);
                          setNewClientPhone(formatPhone(matchedClientInQuickModal.phone));
                          setNewClientDocument(formatCpfCnpj(matchedClientInQuickModal.document || ''));
                          setNewClientAddress(matchedClientInQuickModal.address || '');
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
                  <label className="block text-slate-300 font-semibold mb-1">Nome Completo do Cliente *</label>
                  <input
                    required
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">WhatsApp / Telefone *</label>
                    <input
                      required
                      type="text"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(formatPhone(e.target.value))}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">CPF ou CNPJ</label>
                    <input
                      type="text"
                      value={newClientDocument}
                      onChange={(e) => setNewClientDocument(formatCpfCnpj(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Endereço (opcional)</label>
                  <input
                    type="text"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    placeholder="Rua, número, bairro e cidade"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Bloco de Veículo Inicial */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <label className="flex items-center gap-2 font-bold text-amber-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newClientHasVehicle}
                      onChange={(e) => setNewClientHasVehicle(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4"
                    />
                    Cadastrar Veículo Inicial Agora
                  </label>

                  {newClientHasVehicle && (
                    <div className="space-y-3 pl-4 border-l-2 border-amber-500/40 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Placa do Veículo *</label>
                          <input
                            type="text"
                            required={newClientHasVehicle}
                            value={newClientPlate}
                            onChange={(e) => setNewClientPlate(e.target.value)}
                            placeholder="ABC1D23"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 font-mono font-bold text-white uppercase placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Marca</label>
                          <input
                            type="text"
                            value={newClientBrand}
                            onChange={(e) => setNewClientBrand(e.target.value)}
                            placeholder="Ex: Fiat, VW, GM"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-slate-300 font-semibold mb-1">Modelo *</label>
                          <input
                            type="text"
                            required={newClientHasVehicle}
                            value={newClientModel}
                            onChange={(e) => setNewClientModel(e.target.value)}
                            placeholder="Ex: Palio 1.0 Fire"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">Ano</label>
                          <input
                            type="number"
                            value={newClientYear}
                            onChange={(e) => setNewClientYear(Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Quilometragem Atual (KM)</label>
                        <input
                          type="number"
                          value={newClientMileage}
                          onChange={(e) => setNewClientMileage(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CADASTRAR NOVO VEÍCULO PARA O CLIENTE SELECIONADO */}
      {/* ========================================================================= */}
      {isNewVehicleModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSaveNewVehicleQuick}>
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-amber-400" />
                    Cadastrar Veículo para Cliente
                  </h3>
                  {currentClient && (
                    <span className="text-xs text-amber-400/90 font-medium">
                      Cliente: {currentClient.name}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewVehicleModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Placa do Veículo *</label>
                    <input
                      type="text"
                      required
                      value={newVehPlate}
                      onChange={(e) => setNewVehPlate(e.target.value)}
                      placeholder="ABC1D23"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 font-mono font-bold text-white uppercase placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Marca</label>
                    <input
                      type="text"
                      value={newVehBrand}
                      onChange={(e) => setNewVehBrand(e.target.value)}
                      placeholder="Ex: Fiat, VW, GM"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Modelo *</label>
                    <input
                      type="text"
                      required
                      value={newVehModel}
                      onChange={(e) => setNewVehModel(e.target.value)}
                      placeholder="Ex: Palio 1.0 Fire"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Ano</label>
                    <input
                      type="number"
                      value={newVehYear}
                      onChange={(e) => setNewVehYear(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quilometragem Atual (KM)</label>
                  <input
                    type="number"
                    value={newVehMileage}
                    onChange={(e) => setNewVehMileage(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewVehicleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Salvar Veículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Feedback do Orçamento PNG Enviado */}
      {pngFeedbackInfo && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Orçamento em Imagem PNG Gerado!</h3>
                  <p className="text-xs text-slate-400">Layout oficial idêntico ao Imprimir Orçamento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPngFeedbackInfo(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1.5">
                <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span>📋</span>
                  <span>A imagem foi copiada para sua Área de Transferência e baixada no seu computador!</span>
                </p>
                <p className="text-slate-300">
                  A conversa do WhatsApp Web com <strong>{currentClient?.name}</strong> foi aberta.
                </p>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>👉</span>
                  <span>Como enviar ao cliente:</span>
                </p>
                <p>
                  1. No WhatsApp Web aberto, clique no campo de texto e tecle{' '}
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300 font-mono font-bold">
                    Ctrl + V
                  </kbd>{' '}
                  para colar a imagem do orçamento.
                </p>
                <p>
                  2. A mensagem fora da proposta já está preenchida automaticamente:
                  <span className="block mt-1 font-mono text-[11px] bg-slate-950/60 p-2 rounded text-emerald-300 border border-slate-800">
                    Para darmos início aos serviços, responda com *AUTORIZADO*
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 flex-wrap">
              <div className="flex items-center gap-2">
                {currentClient?.phone && (
                  <button
                    type="button"
                    onClick={() =>
                      WhatsAppService.openWhatsAppChat(
                        currentClient.phone,
                        'Para darmos início aos serviços, responda com *AUTORIZADO*'
                      )
                    }
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Reabrir WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    if (pngFeedbackInfo.blob) {
                      const ok = await QuotationImageService.copyImageToClipboard(pngFeedbackInfo.blob);
                      if (ok) alert('Imagem copiada para a área de transferência!');
                    }
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Imagem</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPngFeedbackInfo(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container isolado para captura de imagem PNG idêntica ao Imprimir Orçamento */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '780px',
          pointerEvents: 'none',
          zIndex: -9999,
          opacity: 0,
        }}
      >
        <ReceiptDocument
          ref={quotationDocRef}
          order={getOrderDataSnapshot()}
          client={currentClient}
          vehicle={currentVehicle}
          mechanic={currentMechanic}
          isQuotation={status === 'orcamento' || status === 'aguardando_aprovacao'}
          estimatedReturnDate={estimatedReturnDateFormatted}
        />
      </div>
    </div>
  );
};
