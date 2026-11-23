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
  totalValue: number;
}
