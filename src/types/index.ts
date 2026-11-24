export type OrderStatus =
  | 'orcamento'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'em_andamento'
  | 'pronto'
  | 'finalizado'
  | 'cancelado';

export interface Client {
  id: string;
  name: string;
  phone: string;
  document: string; // CPF ou CNPJ
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export type VehicleUsageProfile = 'normal' | 'app_severo' | 'moderado';

export interface Vehicle {
  id: string;
  clientId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  engine?: string;
  color?: string;
  mileage: number;
  fuelType?: 'flex' | 'gasolina' | 'etanol' | 'diesel' | 'eletrico' | 'hibrido';
  usageProfile?: VehicleUsageProfile; // Perfil de rodagem (App, Normal, Moderado)
  averageMonthlyKm?: number; // Média estimada de km rodados por mês
}

export type PreventiveServiceType =
  | 'troca_oleo'
  | 'correia_dentada'
  | 'freios'
  | 'alinhamento'
  | 'revisao_geral'
  | 'outro';

export interface MaintenanceRecord {
  id: string;
  serviceOrderId?: string;
  vehicleId: string;
  clientId: string;
  serviceType: PreventiveServiceType;
  serviceName: string;
  completedDate: string; // YYYY-MM-DD
  mileageAtService: number; // KM no momento da troca
  usageProfile: VehicleUsageProfile;
  
  // Metas de retorno calculadas
  estimatedReturnDate: string; // YYYY-MM-DD
  estimatedReturnMileage: number;
  intervalMonths: number;
  intervalKm: number;

  reminderSent7Days?: boolean;
  reminderSent1Day?: boolean;
  contactStatus?: 'pendente' | 'avisado' | 'agendado';
  contactedAt?: string;
  notes?: string;
}

export interface MaintenanceAlert {
  record: MaintenanceRecord;
  vehicle: Vehicle;
  client: Client;
  daysRemaining: number; // Negativo se já venceu, 0 a 1 se vence amanhã, 2 a 7 se vence na semana
  status: 'vencido' | 'urgente_1dia' | 'alerta_7dias' | 'em_dia';
}

export interface GroupedVehicleAlert {
  vehicle: Vehicle;
  client: Client;
  alerts: MaintenanceAlert[];
  records: MaintenanceRecord[];
  worstStatus: 'urgente_1dia' | 'alerta_7dias' | 'vencido' | 'em_dia';
  minDaysRemaining: number;
  isContacted: boolean;
  contactedAt?: string;
}


export interface Mechanic {
  id: string;
  name: string;
  phone: string;
  commissionRate: number; // Porcentagem padrão ex: 15%
  active: boolean;
}

export interface Part {
  id: string;
  sku: string;
  code: string; // Código de fabricante / OEM
  description: string;
  brand: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  currentStock: number;
  minStock: number;
  unit: string; // UN, L, Jogo, etc.
  location?: string; // Prateleira/Gaveta
  supplierName?: string; // Nome do fornecedor (ex: "DPaschoal Distribuidora")
  lastInvoiceNumber?: string; // Ex: "NF-e 45892"
  purchaseId?: string; // ID da compra vinculada
}

export interface ServiceItem {
  id: string;
  name: string;
  standardPrice: number;
  category: string;
}

export interface OrderPartItem {
  id: string;
  partId?: string;
  code: string;
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  total: number;
}

export interface OrderServiceItem {
  id: string;
  serviceId?: string;
  description: string;
  mechanicId: string;
  price: number;
  commissionRate: number;
  commissionValue: number;
}

export interface DamagePoint {
  id: string;
  x: number; // Porcentagem 0-100 na silhueta do carro
  y: number; // Porcentagem 0-100
  type: 'risco' | 'amassado' | 'quebrado' | 'trincado' | 'outro';
  partName: string;
  notes?: string;
}

export interface VehicleChecklist {
  fuelLevel: number; // 0 a 100 (%)
  mileage: number;
  hasSpareWheel: boolean;
  hasJack: boolean;
  hasLugWrench: boolean;
  hasTriangle: boolean;
  hasManual: boolean;
  hasKeyChain: boolean;
  lightsWorking: boolean;
  hornWorking: boolean;
  wipersWorking: boolean;
  damagePoints: DamagePoint[];
  additionalNotes?: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'a_prazo' | 'boleto';

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  vehicleId: string;
  clientId: string;
  mechanicId: string;
  status: OrderStatus;
  complaintDescription: string; // Sintoma / O que o cliente relatou
  technicalDiagnostic?: string; // Parecer do mecânico
  checklist: VehicleChecklist;
  parts: OrderPartItem[];
  services: OrderServiceItem[];
  
  // Financeiro da OS
  partsTotal: number;
  servicesTotal: number;
  grossTotal: number;
  discount: number;
  netTotal: number;
  
  // Custos e Rentabilidade da OS (DRE da OS)
  partsCostTotal: number;
  mechanicsCommissionTotal: number;
  netProfit: number; // Lucro bruto real = netTotal - partsCostTotal - mechanicsCommissionTotal
  profitMarginPercent: number; // (netProfit / netTotal) * 100

  // Pagamento
  paymentMethod?: PaymentMethod;
  installments?: number;
  isPaid: boolean;
  paidAt?: string;

  // Datas e Garantia
  entryDate?: string; // Data de Entrada do veículo no pátio da oficina (YYYY-MM-DD ou ISO)
  serviceDate?: string; // Data da realização/aprovação do serviço (definida com a aprovação da O.S.)
  warrantyDays?: number; // Prazo de garantia em dias (padrão: 90 dias - Art. 26 CDC)
  warrantyExpiresAt?: string; // Data exata em que vence a garantia (YYYY-MM-DD ou ISO)

  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  finishedAt?: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: 'pendente' | 'pago' | 'atrasado';
  serviceOrderId?: string;
  supplierPurchaseId?: string;
  installmentInfo?: string; // ex: "Parcela 1/3"
  mechanicId?: string; // Vincula pagamento de comissão ao mecânico
  paymentMethod?: string; // 'pix' | 'cartao' | 'dinheiro' | etc.
  createdAt: string;
}

export interface PurchaseInstallment {
  id: string;
  installmentNumber: number; // 1, 2, 3...
  totalInstallments: number; // 3
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'pendente' | 'pago' | 'atrasado';
  paidAt?: string;
  transactionId?: string; // id correspondente em FinancialTransaction
}

export interface SupplierPurchase {
  id: string;
  nfeNumber: string; // Ex: 45892 ou PED-102
  supplierName: string; // Ex: DPaschoal Distribuidora de Autopeças
  supplierCnpj?: string;
  issueDate: string; // YYYY-MM-DD
  totalValue: number; // R$ 689,00
  itemsCount: number; // Ex: 3 produtos
  
  // Condição e Parcelamento
  paymentMethod?: 'boleto' | 'pix' | 'cartao' | 'a_prazo';
  installments: PurchaseInstallment[];
  
  // Resumos inteligentes calculados
  paidInstallmentsCount: number; // Ex: 1
  totalInstallmentsCount: number; // Ex: 3
  paidAmount: number; // Ex: R$ 229,67
  remainingAmount: number; // Ex: R$ 459,33
  firstDueDate: string; // Vencimento 1ª parcela
  lastDueDate: string; // Vencimento última parcela
  status: 'quitado' | 'pago' | 'parcial' | 'pendente' | 'atrasado'; // Status geral da compra
  
  // Lista de códigos de peças adquiridas para vincular ao estoque
  partCodes?: string[];
  notes?: string;
  createdAt: string;
}

export interface ParsedXMLItem {
  code: string;
  description: string;
  ncm?: string;
  quantity: number;
  unitCost: number;
  suggestedSellPrice: number;
  totalCost: number;
}

export interface ParsedXMLInvoice {
  nfeNumber: string;
  supplierName: string;
  supplierCnpj: string;
  issueDate: string;
  items: ParsedXMLItem[];
  itemsCount?: number;
  totalValue: number;
  // Parcelamento detectado no XML ou configurado
  installmentsCount?: number;
  firstDueDate?: string;
}
