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
} from 'lucide-react';
import { CarDamageCanvas } from './CarDamageCanvas';
import { WhatsAppService } from '../services/whatsapp';
import { QuickOrderCheckoutModal } from './QuickOrderCheckoutModal';
import { getOrderWarranty, toIsoDate, formatBrDate } from '../utils/warranty';
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
  onPrintReceipt,
  onQuickCheckout,
  onSaveClient,
  onSaveVehicle,
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

  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehBrand, setNewVehBrand] = useState('');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehYear, setNewVehYear] = useState<number>(new Date().getFullYear());
  const [newVehMileage, setNewVehMileage] = useState<number>(50000);

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
      setVehicleId(clientVehicles[0].id);
      if (clientVehicles[0].mileage) {
        setMileage(clientVehicles[0].mileage);
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
    const msg =
      status === 'pronto'
        ? WhatsAppService.generateCarReadyMessage(orderData, currentClient!, currentVehicle!)
        : WhatsAppService.generateBudgetMessage(orderData, currentClient!, currentVehicle!);
    const success = await WhatsAppService.copyToClipboard(msg);
    if (success) {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
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
    const isApprovedOrActive =
      status === 'aprovado' ||
      status === 'em_andamento' ||
      status === 'pronto' ||
      status === 'finalizado';

    const calculatedServiceDate = serviceDate || (isApprovedOrActive ? toIsoDate(new Date()) : undefined);

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
            {/* Bloco de Data de Entrada e Vencimento da Garantia */}
            <div className="hidden md:flex flex-col text-right px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400">
                Data Entrada: <span className="text-slate-200 font-mono font-bold">{warrantyInfo.formattedEntryDate}</span>
              </span>
              {warrantyInfo.hasServiceDate ? (
                <span className="text-xs text-white">
                  Venc. Garantia: <strong className="text-amber-400 font-bold">{warrantyInfo.formattedExpiryDate}</strong>
                </span>
              ) : (
                <span className="text-[10px] text-amber-400/90 font-medium">
                  Garantia: 90 dias após aprovação
                </span>
              )}
            </div>

            {/* Seletor de Status da OS */}
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
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
              {isQuotationStage ? (
                <FileText className="w-4 h-4 text-sky-400" />
              ) : (
                <DollarSign className="w-4 h-4 text-emerald-400" />
              )}
              <span>{isQuotationStage ? '3. Proposta & Orçamento' : '3. Fechamento & Pagamento'}</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                  activeTab === 'fechamento'
                    ? (isQuotationStage ? 'bg-sky-500/20 text-sky-300' : 'bg-emerald-500/20 text-emerald-300')
                    : 'bg-slate-800/80 text-slate-300'
                }`}
              >
                R$ {formatCurrency(netTotal)}
              </span>
            </button>
          </div>
        </div>

        {/* Corpo do Modal - Conteúdo Dinâmico por Aba */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-200">
          {/* ========================================================================= */}
          {/* ABA 1: DIAGNÓSTICO & ENTRADA */}
          {/* ========================================================================= */}
          {activeTab === 'diagnostico' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Seção 1: Cliente, Veículo, Mecânico e Data de Entrada / Data do Serviço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                {/* Campo Cliente com Botão Novo (+) Embaixo */}
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

                  {/* Botão Novo (+) Embaixo de Cliente */}
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => setIsNewClientModalOpen(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      title="Cadastrar Novo Cliente & Veículo diretamente pela OS"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Novo (+)</span>
                    </button>
                  </div>
                </div>

                {/* Campo Veículo do Cliente com Botão Novo (+) Embaixo */}
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
                    {clientVehicles.length === 0 ? (
                      <option value="">Nenhum veículo cadastrado para este cliente</option>
                    ) : (
                      clientVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.brand} {v.model} ({v.plate})
                        </option>
                      ))
                    )}
                  </select>

                  {/* Botão Novo (+) Embaixo de Veículo */}
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => setIsNewVehicleModalOpen(true)}
                      disabled={!clientId}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 px-2 py-1 rounded-lg border border-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      title="Cadastrar Novo Veículo para este cliente"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Novo (+)</span>
                    </button>
                  </div>
                </div>

                {/* Mecânico Responsável */}
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

                {/* Data de Entrada & Data do Serviço */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Data de Entrada
                  </label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 font-mono font-medium"
                  />

                  {/* Data do Serviço: Apenas com aprovação da OS */}
                  {status === 'aprovado' ||
                  status === 'em_andamento' ||
                  status === 'pronto' ||
                  status === 'finalizado' ||
                  serviceDate ? (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <label className="block text-[11px] font-semibold text-emerald-400 uppercase mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Data do Serviço (Aprovada)
                      </label>
                      <input
                        type="date"
                        value={serviceDate || toIsoDate(new Date())}
                        onChange={(e) => setServiceDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-medium"
                      />
                      <div className="mt-1 text-xs text-slate-300">
                        <span className="text-[11px] text-slate-400">Venc. Garantia: </span>
                        <strong className="text-amber-400 font-bold">{warrantyInfo.formattedExpiryDate}</strong>
                        <span className="text-[10px] text-slate-500 ml-1">({warrantyDays}d)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 py-1 px-2 bg-slate-900/80 rounded border border-slate-800 text-[10px] sm:text-[11px] text-slate-400">
                      <span className="text-amber-400/90 font-medium">⏳ Data do Serviço:</span> Definida automaticamente após a aprovação da O.S.
                    </div>
                  )}
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
                    R$ {formatCurrency(servicesTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    Peças {partsSupplyMode === 'cliente_todas' ? '(Cliente)' : `(${parts.length})`}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white">
                    {partsSupplyMode === 'cliente_todas' ? 'R$ 0,00' : `R$ ${partsTotal.toFixed(2)}`}
                  </span>
                </div>
                <div className="border-l border-slate-800 pl-2">
                  <span className="text-[11px] text-amber-400/90 font-bold block">Subtotal Parcial</span>
                  <span className="font-mono text-sm sm:text-base font-black text-amber-400">
                    R$ {formatCurrency(servicesTotal + partsTotal)}
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
                    Subtotal: R$ {formatCurrency(servicesTotal)}
                  </span>
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                      />
                      {serviceSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setServiceSearch('');
                            setSelectedServiceId('');
                            setServicePriceInput('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-2 py-2 text-xs sm:text-sm text-white font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-amber-500 text-right"
                          title="Valor individual deste serviço (ou deixe vazio para o padrão)"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddService()}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                        title="Adicionar serviço com o valor individual informado"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Dropdown de Sugestões de Serviços */}
                  {isServiceDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-40 divide-y divide-slate-800">
                      {serviceSearch.trim() && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAddService(undefined, serviceSearch.trim());
                          }}
                          className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 cursor-pointer flex items-center justify-between text-xs font-bold border-b border-slate-800 transition-colors"
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
                            className={`p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              selectedServiceId === s.id ? 'bg-amber-500/20 border-l-4 border-amber-500' : ''
                            }`}
                          >
                            <span className="font-semibold text-white truncate pr-2">{s.name}</span>
                            <span className="font-mono font-bold text-amber-400 shrink-0">
                              R$ {formatCurrency(s.standardPrice)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de Serviços Adicionados */}
                <div className="divide-y divide-slate-800/80 max-h-52 overflow-y-auto bg-slate-900/40 rounded-lg p-2 border border-slate-800/60">
                  {services.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500 italic">
                      Nenhum serviço mecânico adicionado ainda.
                    </div>
                  ) : (
                    services.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-slate-100 truncate">{item.description}</div>
                          <div className="text-slate-400 text-[11px] flex items-center gap-2">
                            {item.price === 0 && servicesTotal > 0 ? (
                              <span className="text-amber-400 font-medium bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px]">
                                Incluso no Pacote Global
                              </span>
                            ) : (
                              <span>Comissão ({item.commissionRate}%): R$ {formatCurrency(item.commissionValue)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 focus-within:border-amber-500">
                            <span className="text-slate-400 text-xs font-bold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price > 0 ? item.price : ''}
                              placeholder="0,00"
                              onChange={(e) => handleUpdateServicePrice(item.id, parseFloat(e.target.value) || 0)}
                              className="w-20 sm:w-24 bg-transparent text-xs sm:text-sm font-mono font-bold text-white text-right focus:outline-none placeholder-slate-500"
                              title="Valor individual deste serviço (ou deixe vazio para compor o pacote global)"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveService(item.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
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
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                        Total da Mão de Obra (Serviços):
                      </span>
                      {services.length > 0 && (
                        <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 font-bold">
                          {services.length} {services.length === 1 ? 'serviço' : 'serviços'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
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
                    <div className="flex items-center gap-1.5 bg-slate-800 border-2 border-amber-500/70 rounded-lg px-2.5 py-1 focus-within:border-amber-400 shadow-sm">
                      <span className="text-xs font-bold text-amber-400">R$</span>
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
                        className="w-28 sm:w-32 bg-transparent text-sm sm:text-base font-black text-white text-right font-mono focus:outline-none"
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
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow-sm"
                      >
                        ✓ Ok
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Alerta de Itens sem Valor de Venda Definido */}
              {partsSupplyMode !== 'cliente_todas' && zeroPriceParts.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-200">Atenção aos itens com valor R$ 0,00:</span>
                    <p className="text-[11px] text-amber-300/80 mt-0.5">
                      Há {zeroPriceParts.length} peça(s) adicionada(s) sem preço de venda. Preencha o valor unitário de cada item ou ajuste o Total de Peças para evitar enviar orçamento zerado por engano.
                    </p>
                  </div>
                </div>
              )}

              {/* Bloco 2: Peças & Insumos Utilizados */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">Peças & Insumos</h4>
                    {partsSupplyMode === 'cliente_todas' && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Cliente Forneceu Todas
                      </span>
                    )}
                    {partsSupplyMode === 'cliente_parcial' && (
                      <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30 font-bold flex items-center gap-1">
                        <Split className="w-3 h-3" />
                        Fornecimento Parcial
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400">
                      {partsSupplyMode === 'cliente_todas' ? (
                        <span className="text-emerald-400 font-mono">Total Peças: R$ 0,00</span>
                      ) : (
                        <span>Subtotal: R$ {formatCurrency(partsTotal)}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Seletor Rápido de Fornecimento de Peças */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Origem das Peças & Insumos:</span>
                    <span className="text-[11px] text-slate-500">Clique para alternar o modo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Opção 1: Oficina Fornece */}
                    <button
                      type="button"
                      onClick={() => setPartsSupplyMode('oficina')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center gap-2.5 ${
                        partsSupplyMode === 'oficina'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/30'
                          : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Store className="w-4 h-4 shrink-0 text-amber-400" />
                      <div className="min-w-0">
                        <div className="truncate font-black">Oficina Fornece</div>
                        <div className="text-[10px] opacity-75 font-normal truncate">Catálogo & estoque próprio</div>
                      </div>
                    </button>

                    {/* Opção 2: Cliente Forneceu Parcialmente */}
                    <button
                      type="button"
                      onClick={() => setPartsSupplyMode('cliente_parcial')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center gap-2.5 ${
                        partsSupplyMode === 'cliente_parcial'
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm ring-1 ring-sky-500/30'
                          : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Split className="w-4 h-4 shrink-0 text-sky-400" />
                      <div className="min-w-0">
                        <div className="truncate font-black">Cliente Parcialmente</div>
                        <div className="text-[10px] opacity-75 font-normal truncate">Lançar peças faltantes</div>
                      </div>
                    </button>

                    {/* Opção 3: Cliente Forneceu Todas as Peças */}
                    <button
                      type="button"
                      onClick={() => setPartsSupplyMode('cliente_todas')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border flex items-center gap-2.5 ${
                        partsSupplyMode === 'cliente_todas'
                          ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
                          : 'bg-slate-800/60 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <div className="min-w-0">
                        <div className="truncate font-black">Cliente Forneceu Todas</div>
                        <div className="text-[10px] opacity-75 font-normal truncate">Sem custo de peças (Avançar)</div>
                      </div>
                    </button>
                  </div>

                  {/* Banner & Ação Direta se 'cliente_todas' */}
                  {partsSupplyMode === 'cliente_todas' && (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 space-y-3 mt-1 animate-in fade-in duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Cliente forneceu 100% das peças e insumos!</span>
                          </div>
                          <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                            Nenhum valor de peças será cobrado na O.S. (Total de Peças: <strong>R$ 0,00</strong>). A oficina cobra e garante apenas a mão de obra de montagem e instalação.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('fechamento')}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 shadow-lg transition-all active:scale-95"
                          title="Avançar diretamente para o fechamento da O.S."
                        >
                          <span>Avançar para Fechamento</span>
                          <ChevronRight className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-emerald-800/40">
                        <label className="text-[10px] font-bold text-emerald-300 block mb-1">
                          Anotação das peças trazidas (para constar na O.S. e recibo):
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 4L Óleo Sintético 5W30 Motul + Filtro Mann trazidos pelo cliente no porta-malas..."
                          value={clientProvidedPartsNotes}
                          onChange={(e) => setClientProvidedPartsNotes(e.target.value)}
                          className="w-full bg-slate-950/70 border border-emerald-600/50 rounded-lg px-3 py-1.5 text-xs text-emerald-100 placeholder-emerald-400/50 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Banner se 'cliente_parcial' */}
                  {partsSupplyMode === 'cliente_parcial' && (
                    <div className="bg-sky-950/30 border border-sky-500/40 rounded-xl p-3.5 space-y-2 mt-1 animate-in fade-in duration-150">
                      <div className="flex items-start gap-2 text-xs text-sky-200">
                        <Split className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white">Fornecimento Parcial de Peças:</span> O cliente trouxe parte dos materiais.
                          Insira abaixo <strong>apenas as peças faltantes</strong> que a oficina irá fornecer e cobrar na O.S.
                        </div>
                      </div>
                      <div className="pt-1">
                        <label className="text-[10px] font-bold text-sky-300 block mb-1">
                          O que o cliente já trouxe? (para resguardo da oficina):
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Cliente trouxe pastilhas dianteiras; oficina fornece discos e fluído de freio..."
                          value={clientProvidedPartsNotes}
                          onChange={(e) => setClientProvidedPartsNotes(e.target.value)}
                          className="w-full bg-slate-950/70 border border-sky-600/50 rounded-lg px-3 py-1.5 text-xs text-sky-100 placeholder-sky-400/50 focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Seletor & Inclusão de Peças (Ativo quando a oficina fornece ou faltam peças) */}
                {partsSupplyMode !== 'cliente_todas' && (
                  <>
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
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                          />
                          {partSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setPartSearch('');
                                setSelectedPartId('');
                                setPartPriceInput('');
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-xs sm:text-sm text-white text-center font-bold font-mono focus:outline-none focus:border-amber-500"
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
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-2 py-2 text-xs sm:text-sm text-white font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-amber-500 text-right"
                              title="Valor unitário da peça (ou deixe vazio para o preço de catálogo)"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddPart()}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                            title="Adicionar peça com quantidade e valor informados"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            Adicionar
                          </button>
                        </div>
                      </div>

                      {/* Dropdown de Sugestões de Peças com Estoque e Venda */}
                      {isPartDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-40 divide-y divide-slate-800">
                          {partSearch.trim() && (
                            <div
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAddPart(undefined, partSearch.trim());
                              }}
                              className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 cursor-pointer flex items-center justify-between text-xs font-bold border-b border-slate-800 transition-colors"
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
                                className={`p-2.5 hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                  selectedPartId === p.id ? 'bg-amber-500/20 border-l-4 border-amber-500' : ''
                                }`}
                              >
                                <div>
                                  <span className="font-semibold text-white">{p.description}</span>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span className="font-mono text-amber-400/90 font-bold">Cód: {p.code}</span>
                                    {p.brand && <span>• {p.brand}</span>}
                                    {p.location && (
                                      <span className="text-amber-300 font-medium bg-amber-500/10 px-1 rounded">
                                        Loc: {p.location}
                                      </span>
                                    )}
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
                    <div className="divide-y divide-slate-800/80 max-h-56 overflow-y-auto bg-slate-900/40 rounded-lg p-2 border border-slate-800/60">
                      {parts.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500 italic">
                          {partsSupplyMode === 'cliente_parcial'
                            ? 'Nenhuma peça faltante lançada ainda. Adicione as peças que a oficina fornecerá.'
                            : 'Nenhuma peça ou insumo adicionado ainda.'}
                        </div>
                      ) : (
                        parts.map((item) => (
                          <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="font-bold text-slate-100 truncate">{item.description}</div>
                              <div className="text-slate-400 text-[11px] flex items-center gap-2">
                                <span className="font-mono text-slate-500">Cód: {item.code}</span>
                                <span>• Subtotal: R$ {formatCurrency(item.total)}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

                              {/* Input Editável de Valor Unitário */}
                              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 focus-within:border-amber-500">
                                <span className="text-slate-400 text-xs font-bold">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdatePartUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                                  className="w-16 sm:w-20 bg-transparent text-xs sm:text-sm font-mono font-bold text-white text-right focus:outline-none"
                                  title="Clique para alterar o valor unitário desta peça"
                                />
                              </div>

                              {/* Subtotal da Peça */}
                              <span className="font-mono font-bold text-white text-xs sm:text-sm min-w-[70px] text-right">
                                R$ {formatCurrency(item.total)}
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

                    {/* Barra de Ajuste do Total de Peças & Insumos (Distribuição Proporcional) */}
                    <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                            Total de Peças & Insumos:
                          </span>
                          {parts.length > 0 && (
                            <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 font-bold">
                              {parts.length} {parts.length === 1 ? 'item' : 'itens'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {parts.length > 1
                            ? 'Você pode alterar o valor total do lote de peças (o sistema distribui proporcionalmente).'
                            : parts.length === 1
                            ? 'Altere o valor unitário acima ou ajuste o total aqui.'
                            : 'Digite o valor total de peças para criar um lançamento consolidado.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-800 border-2 border-amber-500/70 rounded-lg px-2.5 py-1 focus-within:border-amber-400 shadow-sm">
                          <span className="text-xs font-bold text-amber-400">R$</span>
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
                            className="w-28 sm:w-32 bg-transparent text-sm sm:text-base font-black text-white text-right font-mono focus:outline-none"
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
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow-sm"
                          >
                            ✓ Ok
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
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
                  <span>{isQuotationStage ? 'Avançar para Proposta & Envio' : 'Avançar para Fechamento & Pagamento'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: PROPOSTA & ORÇAMENTO (se orcamento/aguardando) OU FECHAMENTO & PAGAMENTO */}
          {/* ========================================================================= */}
          {activeTab === 'fechamento' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Alerta de Itens Sem Preço no Orçamento */}
              {isQuotationStage && partsSupplyMode !== 'cliente_todas' && zeroPriceParts.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-200">Existem peças lançadas sem valor de venda:</span>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      Há {zeroPriceParts.length} peça(s) com valor <strong>R$ 0,00</strong>. Se a oficina fornecerá esses itens, volte à aba 2 e defina os valores para não enviar proposta incompleta ao cliente.
                    </p>
                  </div>
                </div>
              )}

              {/* Card de Resumo Financeiro da OS */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 p-5 rounded-2xl border border-amber-500/30 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    {isQuotationStage ? 'Resumo da Proposta de Orçamento' : 'Resumo do Valor a Cobrar'}
                  </h4>

                  {/* Botão Único Unificado: Modo Dono / DRE */}
                  <button
                    type="button"
                    onClick={() => setShowProfitDetails(!showProfitDetails)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors font-medium shadow-sm"
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

                {/* 4 Blocos Principais de Cobrança com Formatação Monetária Brasileira */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-800 text-xs">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px] mb-1">
                      Total Peças {partsSupplyMode === 'cliente_todas' ? '(Cliente)' : ''}:
                    </span>
                    <span className="font-mono text-sm sm:text-base text-slate-200 font-bold">
                      {partsSupplyMode === 'cliente_todas' ? 'R$ 0,00' : `R$ ${formatCurrency(partsTotal)}`}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[11px] mb-1">Mão de Obra:</span>
                    <span className="font-mono text-sm sm:text-base text-slate-200 font-bold">
                      R$ {formatCurrency(servicesTotal)}
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
                      {isQuotationStage ? 'Total da Proposta:' : 'Total a Cobrar:'}
                    </span>
                    <span className="font-mono text-lg sm:text-xl font-black text-amber-400">
                      R$ {formatCurrency(netTotal)}
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
                          - R$ {formatCurrency(partsCostTotal)}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[11px]">Comissão do Mecânico:</span>
                        <span className="font-mono text-sm text-red-400 font-bold">
                          - R$ {formatCurrency(mechanicsCommissionTotal)}
                        </span>
                      </div>
                      <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                        <span className="text-emerald-400 font-bold block text-[11px]">
                          LUCRO REAL DA OFICINA:
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-mono text-base font-black text-white">
                            R$ {formatCurrency(netProfit)}
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
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* CARD DE AÇÃO DINÂMICO 1: ETAPA DE ORÇAMENTO (STATUS 1 OU 2) */}
              {/* ============================================================= */}
              {isQuotationStage ? (
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-sky-500/30 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
                        Etapa Comercial • Proposta
                      </span>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-400" />
                        Pronto para enviar ao cliente?
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Envie a proposta técnica pelo WhatsApp ou autorize o serviço caso já tenha sido combinada no balcão/telefone.
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        status === 'aguardando_aprovacao'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {status === 'aguardando_aprovacao' ? '2. Aguardando Aprovação' : '1. Orçamento'}
                      </span>
                    </div>
                  </div>

                  {/* Grid de Ações Principais da Proposta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Botão 1: Enviar Orçamento no WhatsApp */}
                    {currentClient?.phone && currentVehicle ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (status === 'orcamento') {
                            handleStatusChange('aguardando_aprovacao');
                          }
                          const orderData = getOrderDataSnapshot();
                          const msg = WhatsAppService.generateBudgetMessage(orderData, currentClient, currentVehicle);
                          WhatsAppService.openWhatsAppChat(currentClient.phone, msg);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        title="Abre o WhatsApp com a proposta e atualiza status para 2. Aguardando Aprovação"
                      >
                        <MessageCircle className="w-4 h-4 stroke-[2.5]" />
                        <span>Enviar Orçamento no WhatsApp</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-500 italic">
                        Cadastre telefone para envio via WhatsApp
                      </div>
                    )}

                    {/* Botão 2: Aprovação Manual pelo Mecânico */}
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
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      title="Cliente aprovou presencialmente ou por telefone. Avança o status direto para 3. Aprovado / Peças"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Aprovar Orçamento</span>
                    </button>

                    {/* Botão 3: Imprimir Orçamento */}
                    <button
                      type="button"
                      onClick={() => onPrintReceipt(getOrderDataSnapshot())}
                      className="flex items-center justify-center gap-2 px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-colors"
                      title="Imprime a proposta de orçamento em formato oficial"
                    >
                      <Printer className="w-4 h-4 text-slate-400" />
                      <span>Imprimir Orçamento</span>
                    </button>

                    {/* Botão 4: Copiar Texto */}
                    <button
                      type="button"
                      onClick={handleCopyOrderMessage}
                      className="flex items-center justify-center gap-2 px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-colors"
                      title="Copiar texto do orçamento técnico"
                    >
                      {copiedMsg ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                          <span className="text-emerald-400 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-400" />
                          <span>Copiar Texto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* ============================================================= */
                /* CARD DE AÇÃO DINÂMICO 2: ETAPA DE FECHAMENTO & PAGAMENTO */
                /* ============================================================= */
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-emerald-500/30 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                        Etapa de Entrega & Quitação
                      </span>
                      <h4 className="text-base font-black text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        Pronto para entregar o veículo?
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isPaid
                          ? `O.S. quitada via ${paymentMethod.toUpperCase()}. Imprima o recibo oficial ou envie o comprovante ao cliente.`
                          : 'Finalize a O.S. e receba em 1 toque (Pix, Cartão, Dinheiro ou Fiado).'}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isPaid ? (
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Quitada ({paymentMethod.toUpperCase()})
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Aguardando Recebimento
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid de Ações Principais de Fechamento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Botão 1: Finalizar e Receber Agora (se não estiver paga) */}
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => setIsCheckoutOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <DollarSign className="w-4 h-4 stroke-[3]" />
                        <span>Finalizar e Receber Agora</span>
                      </button>
                    )}

                    {/* Botão 2: WhatsApp (Avisar Pronto ou Enviar Comprovante) */}
                    {currentClient?.phone && currentVehicle && (
                      <button
                        type="button"
                        onClick={() => {
                          const orderData = getOrderDataSnapshot();
                          const msg = status === 'pronto'
                            ? WhatsAppService.generateCarReadyMessage(orderData, currentClient, currentVehicle)
                            : WhatsAppService.generateBudgetMessage(orderData, currentClient, currentVehicle);
                          WhatsAppService.openWhatsAppChat(currentClient.phone, msg);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{status === 'pronto' ? 'Avisar Carro Pronto' : 'Enviar no WhatsApp'}</span>
                      </button>
                    )}

                    {/* Botão 3: Imprimir Recibo Oficial */}
                    <button
                      type="button"
                      onClick={() => onPrintReceipt(getOrderDataSnapshot())}
                      className="flex items-center justify-center gap-2 px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-colors"
                      title="Imprime o Recibo com termo de garantia legal de 90 dias"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir Recibo</span>
                    </button>

                    {/* Botão 4: Copiar Dados */}
                    <button
                      type="button"
                      onClick={handleCopyOrderMessage}
                      className="flex items-center justify-center gap-2 px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-colors"
                    >
                      {copiedMsg ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                          <span className="text-emerald-400 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-slate-400" />
                          <span>Copiar Dados</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Botão Voltar para a Aba 2 */}
              <div className="flex justify-start pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('itens')}
                  className="px-3.5 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors bg-slate-800/40 hover:bg-slate-800 rounded-lg border border-slate-700/50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar para Serviços & Peças</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Global Fixo do Modal (Sem Botão Verde Duplicado) */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div>
            {activeTab !== 'diagnostico' && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'fechamento') setActiveTab('itens');
                  else if (activeTab === 'itens') setActiveTab('diagnostico');
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
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
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">CPF ou CNPJ</label>
                    <input
                      type="text"
                      value={newClientDocument}
                      onChange={(e) => setNewClientDocument(e.target.value)}
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
    </div>
  );
};
