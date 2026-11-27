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
    'Troca de óleo',
    'Freio',
    'Barulho',
    'Suspensão',
    'Motor falhando',
    'Ar-condicionado',
    'Elétrica',
    'Luz no painel',
    'Pneu',
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
    createdAt: order?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

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
      <div className="bg-slate-900 border border-slate-800 rounded-none sm:rounded-2xl w-full max-w-5xl h-[100dvh] sm:h-[92vh] max-h-[100dvh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal com Layout Espaçado e Elegante */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold shrink-0 shadow-inner">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-black tracking-widest text-[#f97316] uppercase block">
                OFICINA MESTRE
              </span>
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h3 className="text-base sm:text-xl font-black text-white truncate tracking-tight">
                  {isFinalized ? `Prontuário da ${orderNumber}` : isEditing ? `Editar ${orderNumber}` : 'Nova OS'}
                </h3>
                <span className="text-[11px] bg-slate-800 text-amber-400 border border-slate-700/80 px-2 py-0.5 rounded-md font-mono font-bold shrink-0">
                  {orderNumber}
                </span>
                {isFinalized && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Finalizada
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate hidden sm:flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-300">
                  {currentVehicle ? `${currentVehicle.brand} ${currentVehicle.model} • Placa ${currentVehicle.plate}` : 'Gestão de Pátio'}
                </span>
                {currentClient && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{currentClient.name}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {/* Bloco de Telemetria Compacto em Grade 2 Colunas */}
            <div className="hidden sm:grid grid-cols-2 text-right px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl shadow-inner gap-x-3 gap-y-0.5 text-[11px] min-w-[270px]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-slate-400">Entrada:</span>
                <span className="text-slate-200 font-mono font-bold">{warrantyInfo.formattedEntryDate}</span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-slate-400">Garantia:</span>
                <strong className="text-amber-400 font-mono font-bold">
                  {warrantyInfo.hasServiceDate ? warrantyInfo.formattedExpiryDate : '90d pós aprov.'}
                </strong>
              </div>
              {(serviceDate || order?.serviceDate) && (
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-slate-400">Aprovação:</span>
                  <span className="text-slate-200 font-mono font-bold">{formatBrDate(serviceDate || order?.serviceDate)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  Retorno:
                </span>
                <strong className="text-emerald-300 font-mono font-bold">
                  {estimatedReturnDateFormatted}
                </strong>
              </div>
              {isFinalized && (
                <div className="col-span-2 flex items-center justify-between gap-1.5 pt-0.5 border-t border-slate-800/80">
                  <span className="text-slate-400">Finalização:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {formatBrDate(order?.finishedAt || order?.updatedAt || order?.serviceDate || order?.createdAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Seletor de Status da OS / Badge de Finalizada */}
            {isFinalized ? (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Status</span>
                <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Finalizada / Paga
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Status</span>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-bold text-amber-400 focus:outline-none focus:border-amber-500 shadow-sm"
                >
                  <option value="orcamento">1. Orçamento</option>
                  <option value="aguardando_aprovacao">2. Aguardando Aprovação</option>
                  <option value="aprovado">3. Aprovado / Peças</option>
                  <option value="em_andamento">4. Em Execução no Pátio</option>
                  <option value="pronto">5. Pronto para Retirada</option>
                  <option value="finalizado">6. Finalizada / Paga</option>
                  <option value="cancelado">Cancelada</option>
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isFinalized ? (
          <>
            {/* Visualização de Prontuário / Recibo Completo para O.S. Finalizada com Rolagem Fluida */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-950/70 flex flex-col items-center">
              {/* Banner Superior Informativo */}
              <div className="w-[780px] max-w-full mb-3 flex items-center justify-between gap-3 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-slate-200">Prontuário & Recibo Documental Concluído</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-medium">Garantia Ativa até {warrantyInfo.formattedExpiryDate}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Previsão de Retorno: <strong className="text-emerald-400">{estimatedReturnDateFormatted}</strong>
                </div>
              </div>

              {/* Folha do Recibo Oficial com Altura Total e sem Cortes */}
              <div className="bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-300 max-w-full my-1 mb-8 shrink-0">
                <ReceiptDocument
                  ref={finalizedReceiptRef}
                  order={order || getOrderDataSnapshot()}
                  client={currentClient}
                  vehicle={currentVehicle}
                  mechanic={currentMechanic}
                  isQuotation={false}
                  estimatedReturnDate={estimatedReturnDateFormatted}
                />
              </div>
            </div>

            {/* Rodapé Especial para O.S. Finalizada */}
            <div className="px-5 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Documento oficial concluído e registrado no histórico do veículo.</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {currentClient?.phone && (
                  <button
                    type="button"
                    onClick={handleSendWhatsAppReceipt}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
                    title="Enviar comprovante e resumo da OS para o WhatsApp do cliente"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar no WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyOrderMessage}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors border border-slate-700"
                  title="Copiar texto do recibo para a área de transferência"
                >
                  {copiedMsg ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span className="text-emerald-400 font-bold">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFinalizedPng}
                  disabled={isGeneratingFinalizedPng}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors border border-slate-700 disabled:opacity-50"
                  title="Baixar imagem em PNG deste recibo"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isGeneratingFinalizedPng ? 'Baixando...' : 'Baixar PNG'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPrintReceipt(order || getOrderDataSnapshot())}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  title="Imprimir Recibo Oficial da O.S."
                >
                  <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Imprimir Recibo</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-colors bg-slate-900 border border-slate-800 ml-1"
                >
                  Fechar
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Barra de 3 Abas Rápidas no Topo - Estilo Lovable */}
            <div className="bg-slate-950 px-2 sm:px-6 pt-2 sm:pt-3 pb-0 border-b border-slate-800 flex items-center justify-between gap-1.5 sm:gap-3 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('diagnostico')}
              className={`px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-xl transition-all border-b-2 ${
                activeTab === 'diagnostico'
                  ? 'bg-[#faf8f5] text-slate-900 border-[#f97316] shadow-sm font-black'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
              }`}
            >
              <ClipboardList className={`w-4 h-4 ${activeTab === 'diagnostico' ? 'text-[#f97316]' : 'text-slate-400'}`} />
              <span>1. Diagnóstico & Entrada</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('itens')}
              className={`px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-xl transition-all border-b-2 ${
                activeTab === 'itens'
                  ? 'bg-[#faf8f5] text-slate-900 border-[#f97316] shadow-sm font-black'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
              }`}
            >
              <Wrench className={`w-4 h-4 ${activeTab === 'itens' ? 'text-[#f97316]' : 'text-slate-400'}`} />
              <span>2. Serviços & Peças</span>
              {services.length + parts.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    activeTab === 'itens' ? 'bg-[#f97316] text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {services.length + parts.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fechamento')}
              className={`px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 rounded-t-xl transition-all border-b-2 ${
                activeTab === 'fechamento'
                  ? 'bg-[#faf8f5] text-slate-900 border-[#f97316] shadow-sm font-black'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
              }`}
            >
              {isQuotationStage ? (
                <FileText className={`w-4 h-4 ${activeTab === 'fechamento' ? 'text-[#f97316]' : 'text-sky-400'}`} />
              ) : (
                <DollarSign className={`w-4 h-4 ${activeTab === 'fechamento' ? 'text-[#f97316]' : 'text-emerald-400'}`} />
              )}
              <span>{isQuotationStage ? '3. Proposta & Orçamento' : '3. Fechamento & Pagamento'}</span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                  activeTab === 'fechamento'
                    ? 'bg-[#f97316]/15 text-[#f97316]'
                    : 'bg-slate-800/80 text-slate-300'
                }`}
              >
                R$ {formatCurrency(netTotal)}
              </span>
            </button>
          </div>
        </div>

        {/* Corpo do Modal - Conteúdo Dinâmico por Aba em Fundo Off-White #faf8f5 */}
        <div className="overflow-y-auto flex-1 bg-[#faf8f5] text-slate-900">
          {/* ========================================================================= */}
          {/* ABA 1: DIAGNÓSTICO & ENTRADA */}
          {/* ========================================================================= */}
          {activeTab === 'diagnostico' && (
            <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 pb-28 text-slate-900 animate-in fade-in duration-150">
              {/* PASSO 1: PLACA */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#f97316] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    1
                  </div>
                  <h4 className="text-base font-black text-slate-900 tracking-tight">
                    Placa
                  </h4>
                  {plateFoundMatch && (
                    <span className="ml-auto text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Veículo Cadastrado
                    </span>
                  )}
                </div>

                {/* CARD DA PLACA EXATO ESTILO LOVABLE */}
                <div className="bg-white rounded-2xl border-[3px] border-[#f97316] p-4 sm:p-5 shadow-xs flex items-center justify-center transition-all">
                  <input
                    type="text"
                    value={formatPlate(plateInput)}
                    onChange={(e) => handlePlateChange(e.target.value)}
                    placeholder="A B C 1 D 2 3"
                    maxLength={7}
                    disabled={isReadOnly}
                    autoFocus={!isEditing}
                    className="w-full text-center font-mono font-black text-3xl sm:text-4xl tracking-[0.25em] text-slate-700 placeholder-slate-300 uppercase bg-transparent focus:outline-none selection:bg-orange-100"
                  />
                </div>

                {/* MODELO DO VEÍCULO */}
                <div>
                  <input
                    type="text"
                    value={quickModel}
                    onChange={(e) => setQuickModel(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Modelo (ex: Gol 1.6 prata)"
                    className="w-full bg-white border border-slate-200 focus:border-[#f97316] rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none transition-colors shadow-xs"
                  />
                </div>
              </div>

              {/* PASSO 2: CLIENTE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#f97316] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    2
                  </div>
                  <h4 className="text-base font-black text-slate-900 tracking-tight">
                    Cliente
                  </h4>
                  {plateFoundMatch?.client && (
                    <span className="ml-auto text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                      Cliente Vinculado
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={quickClientName}
                    onChange={(e) => {
                      setQuickClientName(e.target.value);
                      setClientInputValue(e.target.value);
                    }}
                    disabled={isReadOnly}
                    placeholder="Nome do cliente"
                    className="w-full bg-white border border-slate-200 focus:border-[#f97316] rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none transition-colors shadow-xs"
                  />

                  <input
                    type="text"
                    value={quickClientPhone}
                    onChange={(e) => setQuickClientPhone(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="WhatsApp (opcional)"
                    className="w-full bg-white border border-slate-200 focus:border-[#f97316] rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none transition-colors shadow-xs font-mono"
                  />
                </div>
              </div>

              {/* PASSO 3: O QUE O CLIENTE RELATOU? */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#f97316] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    3
                  </div>
                  <h4 className="text-base font-black text-slate-900 tracking-tight">
                    O que o cliente relatou?
                  </h4>
                </div>

                {/* 10 PÍLULAS DE TAGS RÁPIDAS */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_SYMPTOM_OPTIONS.map((tag) => {
                    const isSelected = selectedSymptomTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => toggleSymptomTag(tag)}
                        className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all border shadow-xs select-none cursor-pointer ${
                          isSelected
                            ? 'bg-[#f97316] text-white border-[#f97316] shadow-sm'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* TEXTAREA DETALHES */}
                <div className="pt-1">
                  <textarea
                    rows={3}
                    value={complaintDetails}
                    onChange={(e) => handleDetailsChange(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Detalhes (opcional)"
                    className="w-full bg-white border border-slate-200 focus:border-[#f97316] rounded-xl p-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors shadow-xs resize-none"
                  />
                </div>
              </div>

              {/* PASSO 4: CHEGADA DO VEÍCULO */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#f97316] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    4
                  </div>
                  <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Chegada do veículo
                    <span className="text-xs font-normal text-slate-400">opcional</span>
                  </h4>
                </div>

                {/* KM NO PAINEL */}
                <div>
                  <input
                    type="number"
                    value={mileage || ''}
                    onChange={(e) => setMileage(Number(e.target.value))}
                    disabled={isReadOnly}
                    placeholder="KM no painel"
                    className="w-full bg-white border border-slate-200 focus:border-[#f97316] rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none transition-colors shadow-xs"
                  />
                </div>

                {/* SELETOR DE COMBUSTÍVEL EM 5 BOTÕES */}
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-2">
                    Combustível
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {FUEL_OPTIONS.map((opt) => {
                      const isSelected = fuelLevel === opt.value;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => setFuelLevel(opt.value)}
                          className={`py-3 rounded-xl text-center text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer ${
                            isSelected
                              ? 'bg-[#f97316] text-white shadow-md shadow-orange-500/20'
                              : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

                            {/* PASSO 5: VISTORIA DO VEÍCULO & AVARIAS DA LATARIA (DIRETAMENTE VISÍVEL COMO SOLICITADO) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#f97316] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      5
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">Vistoria & Avarias da Lataria</span>
                      <span className="text-[11px] text-slate-500">Clique na silhueta do veículo para marcar arranhões, amassados e trincas</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                  {/* Silhueta Vetorial do Carro com Pinos de Avarias */}
                  <CarDamageCanvas damagePoints={damagePoints} onChange={setDamagePoints} readOnly={isReadOnly} />

                  {/* Acessórios Obrigatórios (Estepe, Macaco, Chave, Triângulo) */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#f97316]" />
                        Checklist de Acessórios Obrigatórios
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleChecklistAll}
                        className="text-[11px] font-bold text-[#f97316] hover:underline cursor-pointer"
                      >
                        {hasSpareWheel && hasJack && hasLugWrench && hasTriangle ? 'Desmarcar Todos' : 'Marcar Todos'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={hasSpareWheel}
                          onChange={(e) => setHasSpareWheel(e.target.checked)}
                          disabled={isReadOnly}
                          className="w-4 h-4 rounded text-[#f97316] focus:ring-0 accent-[#f97316]"
                        />
                        Estepe
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={hasJack}
                          onChange={(e) => setHasJack(e.target.checked)}
                          disabled={isReadOnly}
                          className="w-4 h-4 rounded text-[#f97316] focus:ring-0 accent-[#f97316]"
                        />
                        Macaco
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={hasLugWrench}
                          onChange={(e) => setHasLugWrench(e.target.checked)}
                          disabled={isReadOnly}
                          className="w-4 h-4 rounded text-[#f97316] focus:ring-0 accent-[#f97316]"
                        />
                        Chave de Roda
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={hasTriangle}
                          onChange={(e) => setHasTriangle(e.target.checked)}
                          disabled={isReadOnly}
                          className="w-4 h-4 rounded text-[#f97316] focus:ring-0 accent-[#f97316]"
                        />
                        Triângulo
                      </label>
                    </div>
                  </div>

                  {/* Mecânico Responsável & Data de Entrada */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-[#f97316]" />
                        Mecânico Responsável
                      </label>
                      <select
                        value={mechanicId}
                        onChange={(e) => setMechanicId(e.target.value)}
                        disabled={isReadOnly}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#f97316] focus:bg-white transition-all"
                      >
                        {mechanics.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} (Comissão: {m.commissionRate}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#f97316]" />
                        Data de Entrada no Pátio
                      </label>
                      <input
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        disabled={isReadOnly}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-[#f97316] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Diagnóstico Técnico Prévio da Oficina */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#f97316]" />
                      Diagnóstico Técnico Prévio da Oficina
                    </label>
                    <textarea
                      rows={2}
                      value={technicalDiagnostic}
                      onChange={(e) => setTechnicalDiagnostic(e.target.value)}
                      disabled={isReadOnly}
                      placeholder="Ex: Pastilhas desgastadas, correia ressecada, vazamento no cárter..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f97316] focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

{/* BARRA FIXA DE AÇÃO NO RODAPÉ ESTILO LOVABLE */}
              <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-6 p-4 bg-[#faf8f5]/95 backdrop-blur-md border-t border-slate-200/80 z-20">
                {formatPlate(plateInput).length < 7 ? (
                  <div className="w-full bg-[#eef2f6] text-[#557086] font-black text-sm tracking-wider uppercase py-4 rounded-2xl text-center select-none shadow-xs cursor-not-allowed">
                    INFORME A PLACA
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      ensureQuickClientAndVehicle();
                      setActiveTab('itens');
                    }}
                    className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-black text-sm tracking-wider uppercase py-4 rounded-2xl text-center shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <span>AVANÇAR PARA PEÇAS & SERVIÇOS</span>
                    <ChevronRight className="w-5 h-5 stroke-[3]" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: SERVIÇOS & PEÇAS (Estilo Lovable - Limpo, Elegante e Operacional) */}
          {/* ========================================================================= */}
          {activeTab === 'itens' && (
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 pb-28 text-slate-900 animate-in fade-in duration-150">
              {/* Barra de Resumo Parcial Rápido em 4 Cards Brancos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                  <span className="text-[11px] text-slate-500 block font-semibold mb-0.5">Mão de Obra ({services.length})</span>
                  <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                    R$ {formatCurrency(servicesTotal)}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                  <span className="text-[11px] text-slate-500 block font-semibold mb-0.5">
                    Peças {partsSupplyMode === 'cliente_todas' ? '(Cliente)' : `(${parts.length})`}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                    {partsSupplyMode === 'cliente_todas' ? 'R$ 0,00' : `R$ ${partsTotal.toFixed(2)}`}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                  <span className="text-[11px] text-slate-500 block font-semibold mb-0.5">Subtotal Bruto</span>
                  <span className="font-mono text-sm sm:text-base font-black text-slate-700">
                    R$ {formatCurrency(grossTotal)}
                  </span>
                </div>
                <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-2xl p-3.5 shadow-xs text-center">
                  <span className="text-[11px] text-[#f97316] block font-bold uppercase tracking-wider mb-0.5">
                    Total da O.S.
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-[#f97316]">
                    R$ {formatCurrency(netTotal)}
                  </span>
                </div>
              </div>

              {/* Banner Transparente de Desconto */}
              {discount > 0 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl text-xs text-red-700 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                    <span>
                      Desconto Aplicado: <strong className="font-mono text-red-600">- R$ {formatCurrency(discount)}</strong>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span>(Subtotal Bruto: <strong>R$ {formatCurrency(grossTotal)}</strong> ➔ Valor Final: <strong className="text-[#f97316]">R$ {formatCurrency(netTotal)}</strong>)</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fechamento')}
                    className="text-[11px] text-[#f97316] hover:underline font-bold shrink-0 cursor-pointer"
                  >
                    Editar Desconto na Aba 3
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>Sem desconto comercial aplicado. O subtotal bruto corresponde ao total da O.S.</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fechamento')}
                    className="text-slate-600 hover:text-[#f97316] font-medium transition-colors cursor-pointer"
                  >
                    + Aplicar Desconto
                  </button>
                </div>
              )}

              {/* Ação Direta do Mecânico no Pátio (1 Toque) */}
              {(status === 'em_andamento' || status === 'aprovado') && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">
                          Ação Direta do Mecânico no Pátio
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {status === 'em_andamento' ? '4. Em Execução' : '3. Aprovado'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Terminou o serviço no carro? Marque como pronto em 1 toque sem precisar transitar por abas financeiras.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStatus('pronto');
                      confetti({
                        particleCount: 70,
                        spread: 60,
                        origin: { y: 0.6 },
                      });
                      alert('✅ Sucesso! Veículo marcado como "5. Pronto para Retirada no Pátio". O cliente já pode vir buscar!');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-95 shrink-0 cursor-pointer"
                    title="Avança a O.S. diretamente para Pronto para Retirada"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Concluir Serviço (Marcar Pronto)</span>
                  </button>
                </div>
              )}

              {/* Bloco 1: Serviços Mecânicos (Mão de Obra) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#f97316] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Mão de Obra & Serviços Mecânicos</h4>
                      <p className="text-[11px] text-slate-500">Adicione os serviços que serão executados na oficina</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#f97316] font-mono bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                    Subtotal: R$ {formatCurrency(servicesTotal)}
                  </span>
                </div>

                {/* Combos Rápidos de Serviços Pré-Cadastrados */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#f97316]" />
                    Combos Rápidos & Serviços Frequentes (1 Clique):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableServices.slice(0, 8).map((srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => {
                          handleAddService(srv.id, srv.name, srv.standardPrice);
                        }}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-800 hover:text-[#f97316] rounded-xl text-xs font-semibold border border-slate-200 hover:border-[#f97316]/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        title={`Adicionar "${srv.name}" com valor sugerido de R$ ${srv.standardPrice.toFixed(2)}`}
                      >
                        <Plus className="w-3.5 h-3.5 text-[#f97316]" />
                        <span>{srv.name}</span>
                        <span className="font-mono text-[11px] text-[#f97316] font-bold">
                          R$ {srv.standardPrice.toFixed(0)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seletor Suspenso do Catálogo Geral de Serviços */}
                <div>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const found = availableServices.find((s) => s.id === e.target.value);
                      if (found) {
                        handleAddService(found.id, found.name, found.standardPrice);
                      }
                      e.target.value = '';
                    }}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-[#f97316]/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#f97316] focus:bg-white cursor-pointer transition-all"
                  >
                    <option value="">📋 Escolher do Catálogo Completo de Serviços da Oficina ({availableServices.length} cadastrados)...</option>
                    {availableServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — R$ {s.standardPrice.toFixed(2)} ({s.category || 'Geral'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo de Busca Digitável para Serviços + Valor Individual */}
                <div className="relative">
                  <div className="flex flex-col sm:flex-row gap-2">
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
                            handleAddService();
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f97316] focus:bg-white transition-all"
                      />
                      {serviceSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setServiceSearch('');
                            setSelectedServiceId('');
                            setServicePriceInput('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Campo de Valor Individual do Serviço */}
                    <div className="flex gap-2">
                      <div className="relative w-28 sm:w-32 shrink-0">
                        <span className="text-slate-400 text-xs absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none font-bold">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Valor"
                          value={servicePriceInput}
                          onChange={(e) => setServicePriceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddService();
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-[#f97316] focus:bg-white text-right transition-all"
                          title="Valor individual deste serviço"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddService()}
                        className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shrink-0 transition-all shadow-sm cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Dropdown de Sugestões de Serviços */}
                  {isServiceDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-40 divide-y divide-slate-100">
                      {serviceSearch.trim() && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAddService(undefined, serviceSearch.trim());
                          }}
                          className="p-3 bg-orange-50 hover:bg-orange-100 text-[#f97316] cursor-pointer flex items-center justify-between text-xs font-bold border-b border-orange-100 transition-colors"
                        >
                          <span className="flex items-center gap-1.5 truncate pr-2">
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Adicionar como serviço avulso: "{serviceSearch.trim()}"</span>
                          </span>
                          <span className="font-mono text-xs shrink-0">
                            {servicePriceInput ? `R$ ${parseFloat(servicePriceInput.replace(',', '.')).toFixed(2)}` : '(definir valor)'}
                          </span>
                        </div>
                      )}

                      {filteredServices.length === 0 && !serviceSearch.trim() ? (
                        <div className="p-3 text-xs text-slate-400 text-center">
                          Nenhum serviço cadastrado.
                        </div>
                      ) : (
                        filteredServices.map((s) => (
                          <div
                            key={s.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedServiceId(s.id);
                              setServiceSearch(s.name);
                              setServicePriceInput(s.standardPrice.toString());
                              setIsServiceDropdownOpen(false);
                            }}
                            className={`p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              selectedServiceId === s.id ? 'bg-orange-50/80 border-l-4 border-[#f97316]' : ''
                            }`}
                          >
                            <span className="font-semibold text-slate-800 truncate pr-2">{s.name}</span>
                            <span className="font-mono font-bold text-[#f97316] shrink-0">
                              R$ {formatCurrency(s.standardPrice)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de Serviços Adicionados */}
                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto bg-slate-50 rounded-xl p-2 border border-slate-200">
                  {services.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 italic">
                      Nenhum serviço mecânico adicionado ainda.
                    </div>
                  ) : (
                    services.map((item) => (
                      <div key={item.id} className="py-2.5 px-2 flex items-center justify-between text-xs gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-slate-900 truncate">{item.description}</div>
                          <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                            {item.price === 0 && servicesTotal > 0 ? (
                              <span className="text-[#f97316] font-medium bg-orange-100/60 border border-orange-200 px-1.5 py-0.5 rounded text-[10px]">
                                Incluso no Pacote Global
                              </span>
                            ) : (
                              <span>Comissão ({item.commissionRate}%): R$ {formatCurrency(item.commissionValue)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 focus-within:border-[#f97316] shadow-xs">
                            <span className="text-slate-400 text-xs font-bold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price > 0 ? item.price : ''}
                              placeholder="0,00"
                              onChange={(e) => handleUpdateServicePrice(item.id, parseFloat(e.target.value) || 0)}
                              className="w-20 sm:w-24 bg-transparent text-xs sm:text-sm font-mono font-bold text-slate-900 text-right focus:outline-none placeholder-slate-400"
                              title="Valor individual deste serviço"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveService(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Remover serviço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Ajuste do Total dos Serviços (Mão de Obra) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Total da Mão de Obra (Serviços):
                      </span>
                      {services.length > 0 && (
                        <span className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 font-bold">
                          {services.length} {services.length === 1 ? 'serviço' : 'serviços'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {sumServices === 0 && servicesTotal > 0
                        ? 'Valor global de mão de obra definido. Os serviços são mantidos no pacote sem diluição individual.'
                        : services.length > 1
                        ? 'Você pode alterar o valor total do pacote (o sistema distribui entre os serviços com valor).'
                        : services.length === 1
                        ? 'Altere o valor individual acima ou ajuste o total aqui.'
                        : 'Digite o valor total de mão de obra para criar o pacote de serviços.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border-2 border-[#f97316] rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-[#f97316]/30 shadow-xs">
                      <span className="text-xs font-bold text-[#f97316]">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={isEditingTotalServices ? totalServicesInput : (servicesTotal > 0 ? servicesTotal.toFixed(2) : '')}
                        onFocus={() => {
                          setIsEditingTotalServices(true);
                          setTotalServicesInput(servicesTotal > 0 ? servicesTotal.toFixed(2) : '');
                        }}
                        onChange={(e) => setTotalServicesInput(e.target.value)}
                        onBlur={() => {
                          handleApplyTotalServices(totalServicesInput);
                          setIsEditingTotalServices(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyTotalServices(totalServicesInput);
                            setIsEditingTotalServices(false);
                          }
                        }}
                        className="w-28 sm:w-32 bg-transparent text-sm sm:text-base font-black text-slate-900 text-right font-mono focus:outline-none"
                        title="Digite o valor total da mão de obra"
                      />
                    </div>
                    {isEditingTotalServices && (
                      <button
                        type="button"
                        onClick={() => {
                          handleApplyTotalServices(totalServicesInput);
                          setIsEditingTotalServices(false);
                        }}
                        className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs cursor-pointer"
                      >
                        ✓ Ok
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Alerta de Itens sem Valor de Venda Definido */}
              {partsSupplyMode !== 'cliente_todas' && zeroPriceParts.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900">Atenção aos itens com valor R$ 0,00:</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Há {zeroPriceParts.length} peça(s) adicionada(s) sem preço de venda. Preencha o valor unitário de cada item ou ajuste o Total de Peças para evitar enviar orçamento zerado por engano.
                    </p>
                  </div>
                </div>
              )}

              {/* Bloco 2: Peças & Insumos Utilizados */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#f97316] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Peças & Insumos</h4>
                        {partsSupplyMode === 'cliente_todas' && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Cliente Forneceu Todas
                          </span>
                        )}
                        {partsSupplyMode === 'cliente_parcial' && (
                          <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-300 font-bold flex items-center gap-1">
                            <Split className="w-3 h-3" />
                            Fornecimento Parcial
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">Defina as peças da oficina ou registre as trazidas pelo cliente</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg border bg-orange-50 text-[#f97316] border-orange-200">
                      {partsSupplyMode === 'cliente_todas' ? (
                        <span className="text-emerald-700">Total Peças: R$ 0,00</span>
                      ) : (
                        <span>Subtotal: R$ {formatCurrency(partsTotal)}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Seletor Rápido de Fornecimento de Peças */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Origem das Peças & Insumos:</span>
                    <span className="text-[11px] text-slate-500">Clique para alternar o modo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Opção 1: Oficina Fornece */}
                    <button
                      type="button"
                      onClick={() => setPartsSupplyMode('oficina')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center gap-2.5 cursor-pointer ${
                        partsSupplyMode === 'oficina'
                          ? 'bg-orange-50 border-[#f97316] text-[#f97316] shadow-xs ring-1 ring-[#f97316]/30'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Store className="w-4 h-4 shrink-0 text-[#f97316]" />
                      <div className="min-w-0">
                        <div className="truncate font-black">Oficina Fornece</div>
                        <div className="text-[10px] opacity-75 font-normal truncate">Catálogo & estoque próprio</div>
                      </div>
                    </button>

                    {/* Opção 2: Cliente Forneceu Parcialmente */}
                    <button
                      type="button"
                      onClick={() => setPartsSupplyMode('cliente_parcial')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center gap-2.5 cursor-pointer ${
                        partsSupplyMode === 'cliente_parcial'
                          ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-xs ring-1 ring-sky-500/30'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Split className="w-4 h-4 shrink-0 text-sky-600" />
                      <div className="min-w-0">
                        <div className="truncate font-black">Cliente Parcialmente</div>
                        <div className="text-[10px] opacity-75 font-normal truncate">Lançar peças faltantes</div>
                      </div>
                    </button>

                    {/* Opção 3: Cliente Forneceu Todas as Peças */}
                    <button
                      type="button"
                      onClick={() => setPartsSupplyMode('cliente_todas')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center gap-2.5 cursor-pointer ${
                        partsSupplyMode === 'cliente_todas'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs ring-1 ring-emerald-500/30'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <div className="min-w-0">
                        <div className="truncate font-black">Cliente Forneceu Todas</div>
                        <div className="text-[10px] opacity-75 font-normal truncate">Sem custo de peças (Avançar)</div>
                      </div>
                    </button>
                  </div>

                  {/* Banner se 'cliente_todas' */}
                  {partsSupplyMode === 'cliente_todas' && (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-3 mt-1 animate-in fade-in duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span>Cliente forneceu 100% das peças e insumos!</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 leading-relaxed">
                            Nenhum valor de peças será cobrado na O.S. (Total de Peças: <strong>R$ 0,00</strong>). A oficina cobra e garante apenas a mão de obra de montagem e instalação.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('fechamento')}
                          disabled={isFinalized}
                          className={`font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 shadow-sm transition-all cursor-pointer ${
                            isFinalized
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none opacity-60'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                          }`}
                        >
                          <span>Avançar para Fechamento</span>
                          <ChevronRight className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-emerald-200">
                        <label className="text-[10px] font-bold text-emerald-900 block mb-1">
                          Anotação das peças trazidas (para constar na O.S. e recibo):
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 4L Óleo Sintético 5W30 Motul + Filtro Mann trazidos pelo cliente no porta-malas..."
                          value={clientProvidedPartsNotes}
                          onChange={(e) => setClientProvidedPartsNotes(e.target.value)}
                          className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-emerald-600/50 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Banner se 'cliente_parcial' */}
                  {partsSupplyMode === 'cliente_parcial' && (
                    <div className="bg-sky-50 border border-sky-300 rounded-xl p-3.5 space-y-2 mt-1 animate-in fade-in duration-150">
                      <div className="flex items-start gap-2 text-xs text-sky-800">
                        <Split className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-sky-950">Fornecimento Parcial de Peças:</span> O cliente trouxe parte dos materiais.
                          Insira abaixo <strong>apenas as peças faltantes</strong> que a oficina irá fornecer e cobrar na O.S.
                        </div>
                      </div>
                      <div className="pt-1">
                        <label className="text-[10px] font-bold text-sky-900 block mb-1">
                          O que o cliente já trouxe? (para resguardo da oficina):
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Cliente trouxe pastilhas dianteiras; oficina fornece discos e fluído de freio..."
                          value={clientProvidedPartsNotes}
                          onChange={(e) => setClientProvidedPartsNotes(e.target.value)}
                          className="w-full bg-white border border-sky-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-sky-600/50 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Seletor & Inclusão de Peças */}
                {partsSupplyMode !== 'cliente_todas' && (
                  <>
                    {/* Seletor Suspenso do Estoque Físico de Peças */}
                    <div>
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const found = availableParts.find((p) => p.id === e.target.value);
                          if (found) {
                            setSelectedPartId(found.id);
                            setPartSearch(`${found.description} (Cód: ${found.code})`);
                            setPartPriceInput(found.sellPrice.toString());
                          }
                          e.target.value = '';
                        }}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-[#f97316]/50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#f97316] focus:bg-white cursor-pointer transition-all"
                      >
                        <option value="">📦 Escolher do Estoque Físico da Oficina ({availableParts.length} itens cadastrados)...</option>
                        {availableParts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.description} (Cód: {p.code}) — Saldo: {p.currentStock} {p.unit || 'un'} {p.currentStock <= p.minStock ? '⚠️' : '✓'} | R$ {p.sellPrice.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Busca Digitável */}
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder={
                              partsSupplyMode === 'cliente_parcial'
                                ? 'Digite a peça FALTANTE da oficina (ou insumo avulso)...'
                                : 'Digite a peça (ex: óleo, filtro, pastilha) ou insumo avulso...'
                            }
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
                                handleAddPart();
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#f97316] focus:bg-white transition-all"
                          />
                          {partSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setPartSearch('');
                                setSelectedPartId('');
                                setPartPriceInput('');
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Quantidade Inicial + Valor Unitário Individual + Botão Adicionar */}
                        <div className="flex gap-2">
                          <div className="w-16 sm:w-20 shrink-0">
                            <input
                              type="number"
                              min="1"
                              value={partQty}
                              onChange={(e) => setPartQty(Math.max(1, Number(e.target.value)))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs sm:text-sm text-slate-900 text-center font-bold font-mono focus:outline-none focus:border-[#f97316] focus:bg-white transition-all"
                              title="Quantidade a adicionar"
                            />
                          </div>

                          <div className="relative w-28 sm:w-32 shrink-0">
                            <span className="text-slate-400 text-xs absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none font-bold">
                              R$
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Unitário"
                              value={partPriceInput}
                              onChange={(e) => setPartPriceInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddPart();
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-2.5 text-xs sm:text-sm text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-[#f97316] focus:bg-white text-right transition-all"
                              title="Valor unitário da peça"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddPart()}
                            className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shrink-0 transition-all shadow-sm cursor-pointer active:scale-95"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            Adicionar
                          </button>
                        </div>
                      </div>

                      {/* Dropdown de Sugestões de Peças com Estoque e Venda */}
                      {isPartDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-40 divide-y divide-slate-100">
                          {partSearch.trim() && (
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAddPart(undefined, partSearch.trim());
                              }}
                              className="p-3 bg-orange-50 hover:bg-orange-100 text-[#f97316] cursor-pointer flex items-center justify-between text-xs font-bold border-b border-orange-100 transition-colors"
                            >
                              <span className="flex items-center gap-1.5 truncate pr-2">
                                <Plus className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Adicionar como peça/insumo avulso: "{partSearch.trim()}"</span>
                              </span>
                              <span className="font-mono text-xs shrink-0">
                                {partPriceInput ? `R$ ${parseFloat(partPriceInput.replace(',', '.')).toFixed(2)}/un` : '(definir unitário)'}
                              </span>
                            </div>
                          )}

                          {filteredParts.length === 0 && !partSearch.trim() ? (
                            <div className="p-3 text-xs text-slate-400 text-center">
                              Nenhuma peça cadastrada no estoque.
                            </div>
                          ) : (
                            filteredParts.slice(0, 15).map((p) => (
                              <div
                                key={p.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSelectedPartId(p.id);
                                  setPartSearch(`${p.description} (Cód: ${p.code})`);
                                  setPartPriceInput(p.sellPrice.toString());
                                  setIsPartDropdownOpen(false);
                                }}
                                className={`p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                  selectedPartId === p.id ? 'bg-orange-50/80 border-l-4 border-[#f97316]' : ''
                                }`}
                              >
                                <div>
                                  <span className="font-semibold text-slate-800">{p.description}</span>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span className="font-mono text-[#f97316] font-bold">Cód: {p.code}</span>
                                    {p.brand && <span>• {p.brand}</span>}
                                    {p.location && (
                                      <span className="text-slate-600 font-medium bg-slate-100 px-1 rounded">
                                        Loc: {p.location}
                                      </span>
                                    )}
                                    <span
                                      className={
                                        p.currentStock <= p.minStock
                                          ? 'text-red-500 font-bold'
                                          : 'text-slate-500'
                                      }
                                    >
                                      • Estoque: {p.currentStock} {p.unit || 'un'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right ml-2 shrink-0">
                                  <span className="font-mono font-bold text-[#f97316] text-xs sm:text-sm">
                                    R$ {formatCurrency(p.sellPrice)}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Lista de Peças Adicionadas */}
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50 rounded-xl p-2 border border-slate-200">
                      {parts.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          {partsSupplyMode === 'cliente_parcial'
                            ? 'Nenhuma peça faltante lançada ainda. Adicione as peças que a oficina fornecerá.'
                            : 'Nenhuma peça ou insumo adicionado ainda.'}
                        </div>
                      ) : (
                        parts.map((item) => {
                          const stockItem = availableParts.find((p) => p.id === item.partId || p.code === item.code);
                          const isOutOfStock = stockItem ? stockItem.currentStock <= 0 : false;
                          const isQtyExceeded = stockItem ? item.quantity > stockItem.currentStock : false;
                          const isBelowMin = stockItem ? stockItem.currentStock <= stockItem.minStock && !isOutOfStock : false;

                          return (
                            <div key={item.id} className="py-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2.5 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 shadow-xs transition-colors my-1">
                              <div className="flex-1 min-w-0 pr-2 space-y-1">
                                <div className="font-bold text-slate-900 truncate flex items-center gap-2">
                                  <span className="truncate">{item.description}</span>
                                  {stockItem?.location && (
                                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 font-normal">
                                      Loc: {stockItem.location}
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-slate-600">Cód: {item.code}</span>
                                  <span>•</span>
                                  <span>Subtotal: R$ {formatCurrency(item.total)}</span>
                                  <span>•</span>
                                  {stockItem ? (
                                    isOutOfStock ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                                        <span>SEM ESTOQUE FÍSICO (0 un no pátio)</span>
                                      </span>
                                    ) : isQtyExceeded ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-700 border border-red-300 flex items-center gap-1 animate-pulse">
                                        <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                                        <span>Qtd ({item.quantity}) excede saldo físico ({stockItem.currentStock} {stockItem.unit || 'un'})</span>
                                      </span>
                                    ) : isBelowMin ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                        <span>⚠️ Estoque Baixo: {stockItem.currentStock} {stockItem.unit || 'un'}</span>
                                        <span className="text-slate-500">(mín: {stockItem.minStock})</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                        <Check className="w-3 h-3 stroke-[2.5]" />
                                        <span>Saldo: {stockItem.currentStock} {stockItem.unit || 'un'} disponíveis</span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                      Item avulso / sob encomenda
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                {/* Controles de Quantidade Rápida [-] [Qtd] [+] */}
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5 shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePartQty(item.id, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                    className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
                                    title="Diminuir quantidade"
                                  >
                                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                  <span className="font-mono font-bold text-slate-900 text-xs px-2 min-w-[28px] text-center">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePartQty(item.id, item.quantity + 1)}
                                    className="w-7 h-7 flex items-center justify-center text-[#f97316] hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                    title="Aumentar quantidade"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                </div>

                                {/* Input Editável de Valor Unitário */}
                                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 focus-within:border-[#f97316] shadow-xs">
                                  <span className="text-slate-400 text-xs font-bold">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.unitPrice}
                                    onChange={(e) => handleUpdatePartUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                                    className="w-16 sm:w-20 bg-transparent text-xs sm:text-sm font-mono font-bold text-slate-900 text-right focus:outline-none"
                                    title="Clique para alterar o valor unitário desta peça"
                                  />
                                </div>

                                {/* Subtotal da Peça */}
                                <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm min-w-[70px] text-right">
                                  R$ {formatCurrency(item.total)}
                                </span>

                                {/* Botão de Exclusão */}
                                <button
                                  type="button"
                                  onClick={() => handleRemovePart(item.id)}
                                  className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Remover peça"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Barra de Ajuste do Total de Peças & Insumos */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Total de Peças & Insumos:
                          </span>
                          {parts.length > 0 && (
                            <span className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 font-bold">
                              {parts.length} {parts.length === 1 ? 'item' : 'itens'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {parts.length > 1
                            ? 'Você pode alterar o valor total do lote de peças (o sistema distribui proporcionalmente).'
                            : parts.length === 1
                            ? 'Altere o valor unitário acima ou ajuste o total aqui.'
                            : 'Digite o valor total de peças para criar um lançamento consolidado.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-white border-2 border-[#f97316] rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-[#f97316]/30 shadow-xs">
                          <span className="text-xs font-bold text-[#f97316]">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={isEditingTotalParts ? totalPartsInput : (partsTotal > 0 ? partsTotal.toFixed(2) : '')}
                            onFocus={() => {
                              setIsEditingTotalParts(true);
                              setTotalPartsInput(partsTotal > 0 ? partsTotal.toFixed(2) : '');
                            }}
                            onChange={(e) => setTotalPartsInput(e.target.value)}
                            onBlur={() => {
                              handleApplyTotalParts(totalPartsInput);
                              setIsEditingTotalParts(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyTotalParts(totalPartsInput);
                                setIsEditingTotalParts(false);
                              }
                            }}
                            className="w-28 sm:w-32 bg-transparent text-sm sm:text-base font-black text-slate-900 text-right font-mono focus:outline-none"
                            title="Digite o valor total das peças & insumos"
                          />
                        </div>
                        {isEditingTotalParts && (
                          <button
                            type="button"
                            onClick={() => {
                              handleApplyTotalParts(totalPartsInput);
                              setIsEditingTotalParts(false);
                            }}
                            className="bg-[#f97316] hover:bg-[#ea580c] text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs cursor-pointer"
                          >
                            ✓ Ok
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* BARRA FIXA DE AÇÃO NO RODAPÉ ESTILO LOVABLE - ABA 2 */}
              <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-6 p-4 bg-[#faf8f5]/95 backdrop-blur-md border-t border-slate-200/80 z-20 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('diagnostico')}
                  className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar ao Diagnóstico</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('fechamento')}
                  disabled={isFinalized}
                  className={`flex-1 max-w-sm font-black text-xs sm:text-sm tracking-wider uppercase py-3.5 rounded-2xl text-center shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isFinalized
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-[#f97316] hover:bg-[#ea580c] text-white shadow-orange-500/25 active:scale-[0.99]'
                  }`}
                >
                  <span>{isQuotationStage ? 'AVANÇAR PARA PROPOSTA & ENVIO' : 'AVANÇAR PARA FECHAMENTO & PAGAMENTO'}</span>
                  <ChevronRight className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: PROPOSTA & ORÇAMENTO / FECHAMENTO & PAGAMENTO (Estilo Lovable) */}
          {/* ========================================================================= */}
          {activeTab === 'fechamento' && (
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 pb-28 text-slate-900 animate-in fade-in duration-150">
              {/* Alerta de Itens Sem Preço no Orçamento */}
              {isQuotationStage && partsSupplyMode !== 'cliente_todas' && zeroPriceParts.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-950">Existem peças lançadas sem valor de venda:</span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Há {zeroPriceParts.length} peça(s) com valor <strong>R$ 0,00</strong>. Se a oficina fornecerá esses itens, volte à aba 2 e defina os valores para não enviar proposta incompleta ao cliente.
                    </p>
                  </div>
                </div>
              )}

              {/* Card de Resumo Financeiro da OS Estilo Lovable */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#f97316] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {isQuotationStage ? 'Resumo da Proposta de Orçamento' : 'Resumo do Valor a Cobrar'}
                      </h4>
                      <p className="text-[11px] text-slate-500">Valores consolidados de peças, mão de obra e descontos</p>
                    </div>
                  </div>

                  {/* Botão Modo Dono / DRE */}
                  <button
                    type="button"
                    onClick={() => setShowProfitDetails(!showProfitDetails)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors font-bold shadow-xs cursor-pointer"
                    title="Alternar proteção de margem de lucro e custo de peças"
                  >
                    {showProfitDetails ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-[#f97316]" />
                        <span>Ocultar Rentabilidade</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ver Rentabilidade & DRE</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 4 Blocos Principais de Cobrança */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px] mb-1 font-semibold">
                      Total Peças {partsSupplyMode === 'cliente_todas' ? '(Cliente)' : ''}:
                    </span>
                    <span className="font-mono text-sm sm:text-base text-slate-900 font-bold">
                      {partsSupplyMode === 'cliente_todas' ? 'R$ 0,00' : `R$ ${formatCurrency(partsTotal)}`}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px] mb-1 font-semibold">Mão de Obra:</span>
                    <span className="font-mono text-sm sm:text-base text-slate-900 font-bold">
                      R$ {formatCurrency(servicesTotal)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block text-[11px] mb-1 font-semibold">Desconto (R$):</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[#f97316]"
                    />
                  </div>
                  <div className="bg-[#f97316]/10 p-3.5 rounded-xl border border-[#f97316]/30">
                    <span className="text-[#f97316] block text-[11px] font-bold mb-0.5 uppercase tracking-wide">
                      {isQuotationStage ? 'Total da Proposta:' : 'Total a Cobrar:'}
                    </span>
                    <span className="font-mono text-base sm:text-lg font-black text-[#f97316]">
                      R$ {formatCurrency(netTotal)}
                    </span>
                  </div>
                </div>

                {/* DRE e Rentabilidade da Oficina (Protegido por Padrão) */}
                {showProfitDetails ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-[#f97316]" />
                        DRE Operacional da Ordem de Serviço (Modo Dono)
                      </span>
                      <span className="text-[11px] text-slate-500">Visível apenas com autorização</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-[11px]">Custo Real das Peças:</span>
                        <span className="font-mono text-sm text-red-600 font-bold">
                          - R$ {formatCurrency(partsCostTotal)}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-[11px]">Comissão do Mecânico:</span>
                        <span className="font-mono text-sm text-red-600 font-bold">
                          - R$ {formatCurrency(mechanicsCommissionTotal)}
                        </span>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300">
                        <span className="text-emerald-800 font-bold block text-[11px]">
                          LUCRO REAL DA OFICINA:
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-mono text-base font-black text-emerald-900">
                            R$ {formatCurrency(netProfit)}
                          </span>
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                            {profitMarginPercent.toFixed(1)}% margem
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dados de custo de peças e lucro da oficina protegidos nesta tela.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD DE AÇÃO 1: ETAPA DE ORÇAMENTO (STATUS 1 OU 2) */}
              {isQuotationStage ? (
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-sky-600 uppercase tracking-wider block">
                        Etapa Comercial • Proposta
                      </span>
                      <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-600" />
                        Pronto para enviar ao cliente?
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Envie a proposta técnica pelo WhatsApp ou autorize o serviço caso já tenha sido combinada no balcão/telefone.
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        status === 'aguardando_aprovacao'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-sky-100 text-sky-800 border border-sky-300'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {status === 'aguardando_aprovacao' ? '2. Aguardando Aprovação' : '1. Orçamento'}
                      </span>
                    </div>
                  </div>

                  {/* Grid de Ações Principais da Proposta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                    {/* Botão 1: Enviar Orçamento no WhatsApp (PNG) */}
                    {currentClient?.phone && currentVehicle ? (
                      <button
                        type="button"
                        onClick={handleSendQuotationWhatsAppPng}
                        disabled={isGeneratingQuotationPng}
                        className="flex items-center justify-center gap-2 px-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        title="Gera imagem PNG da proposta oficial e envia no WhatsApp do cliente"
                      >
                        <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                        <span>{isGeneratingQuotationPng ? 'Gerando PNG...' : 'Enviar no WhatsApp'}</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                        Cadastre telefone para envio via WhatsApp
                      </div>
                    )}

                    {/* Botão 2: Baixar Imagem PNG */}
                    <button
                      type="button"
                      onClick={handleDownloadQuotationPng}
                      disabled={isGeneratingQuotationPng}
                      className="flex items-center justify-center gap-2 px-3 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Baixar imagem em PNG da proposta"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>Baixar PNG</span>
                    </button>

                    {/* Botão 3: Aprovação Manual pelo Mecânico */}
                    <button
                      type="button"
                      onClick={() => {
                        handleStatusChange('aprovado');
                        confetti({
                          particleCount: 70,
                          spread: 60,
                          origin: { y: 0.6 },
                        });
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-3 bg-[#f97316] hover:bg-[#ea580c] text-white font-black text-xs rounded-xl shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      title="Avança o status direto para 3. Aprovado / Peças"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Aprovar Orçamento</span>
                    </button>

                    {/* Botão 4: Imprimir Orçamento */}
                    <button
                      type="button"
                      onClick={() => onPrintReceipt(getOrderDataSnapshot())}
                      className="flex items-center justify-center gap-2 px-3 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                      title="Imprime a proposta de orçamento"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Imprimir Orçamento</span>
                    </button>

                    {/* Botão 5: Copiar Texto */}
                    <button
                      type="button"
                      onClick={handleCopyOrderMessage}
                      className="flex items-center justify-center gap-2 px-3 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                      title="Copiar texto do orçamento técnico"
                    >
                      {copiedMsg ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                          <span className="text-emerald-700 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-500" />
                          <span>Copiar Texto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* CARD DE AÇÃO 2: ETAPA DE FECHAMENTO & PAGAMENTO */
                <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                        Etapa de Entrega & Quitação
                      </span>
                      <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Pronto para entregar o veículo?
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isPaid
                          ? `O.S. quitada via ${paymentMethod.toUpperCase()}. Imprima o recibo oficial ou envie o comprovante ao cliente.`
                          : 'Finalize a O.S. e receba em 1 toque (Pix, Cartão, Dinheiro ou Fiado).'}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isPaid ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Quitada ({paymentMethod.toUpperCase()})
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Aguardando Recebimento
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid de Ações Principais de Fechamento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Botão 1: Finalizar e Receber Agora */}
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => setIsCheckoutOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      >
                        <DollarSign className="w-4 h-4 stroke-[3]" />
                        <span>Finalizar e Receber Agora</span>
                      </button>
                    )}

                    {/* Botão 2: WhatsApp */}
                    {currentClient?.phone && currentVehicle && (
                      <button
                        type="button"
                        onClick={() => {
                          const orderData = getOrderDataSnapshot();
                          const currentMechanicName = mechanics.find((m) => m.id === mechanicId)?.name;
                          const msg = WhatsAppService.getMessageForOrder(orderData, currentClient, currentVehicle, currentMechanicName);
                          WhatsAppService.openWhatsAppChat(currentClient.phone, msg);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-emerald-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title={WhatsAppService.getWhatsAppActionTitle(status)}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{WhatsAppService.getWhatsAppActionTitle(status)}</span>
                      </button>
                    )}

                    {/* Botão 3: Imprimir Recibo Oficial */}
                    <button
                      type="button"
                      onClick={() => onPrintReceipt(getOrderDataSnapshot())}
                      className="flex items-center justify-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                      title="Imprime o Recibo com termo de garantia legal de 90 dias"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Imprimir Recibo</span>
                    </button>

                    {/* Botão 4: Copiar Dados */}
                    <button
                      type="button"
                      onClick={handleCopyOrderMessage}
                      className="flex items-center justify-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                    >
                      {copiedMsg ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                          <span className="text-emerald-700 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-500" />
                          <span>Copiar Dados</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* BARRA FIXA DE AÇÃO NO RODAPÉ ESTILO LOVABLE - ABA 3 */}
              <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-6 p-4 bg-[#faf8f5]/95 backdrop-blur-md border-t border-slate-200/80 z-20 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('itens')}
                  className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar a Peças & Serviços</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 max-w-sm bg-[#f97316] hover:bg-[#ea580c] text-white font-black text-xs sm:text-sm tracking-wider uppercase py-3.5 rounded-2xl text-center shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>{isFinalized ? 'SALVAR ALTERAÇÕES' : isQuotationStage ? 'SALVAR PROPOSTA' : 'CONCLUIR E SALVAR O.S.'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    )}
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
