import {
  Client,
  Vehicle,
  Mechanic,
  Part,
  ServiceItem,
  ServiceOrder,
  FinancialTransaction,
  MaintenanceRecord,
  SupplierPurchase,
} from '../types';

const STORAGE_KEYS = {
  CLIENTS: 'og_clients_v1',
  VEHICLES: 'og_vehicles_v1',
  MECHANICS: 'og_mechanics_v1',
  PARTS: 'og_parts_v1',
  SERVICES: 'og_services_v1',
  ORDERS: 'og_orders_v1',
  TRANSACTIONS: 'og_transactions_v1',
  MAINTENANCE: 'og_maintenance_v1',
  PURCHASES: 'og_purchases_v1',
};

// Seed Data Realista para Oficinas Mecânicas Brasileiras
const INITIAL_MECHANICS: Mechanic[] = [
  { id: 'mec-1', name: 'Rico (Responsável Técnico)', phone: '(11) 98244-0071', commissionRate: 20, active: true },
  { id: 'mec-2', name: 'Marcos Silva', phone: '(11) 97654-3210', commissionRate: 15, active: true },
];

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-1',
    name: 'Roberto Andrade Souza',
    phone: '11981234567',
    document: '123.456.789-00',
    email: 'roberto.souza@gmail.com',
    address: 'Av. Paulista, 1500 - SP',
    createdAt: '2026-10-10T09:00:00Z',
  },
  {
    id: 'cli-2',
    name: 'Dra. Patrícia Helena Mendes',
    phone: '11998761234',
    document: '234.567.890-11',
    email: 'patricia.mendes@clinica.com.br',
    address: 'Rua das Palmeiras, 340 - SP',
    createdAt: '2026-10-15T14:30:00Z',
  },
  {
    id: 'cli-3',
    name: 'TransExpress Transportes (Uber/Frota)',
    phone: '11977778888',
    document: '12.345.678/0001-90',
    email: 'frota@transexpress.com.br',
    address: 'Rod. Anhanguera, km 25 - SP',
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'cli-4',
    name: 'Henrique Rosa',
    phone: '21993793746',
    document: '345.678.901-22',
    email: 'henrique.rosa@gmail.com',
    address: 'Rua Barata Ribeiro, 502 - Copacabana, Rio de Janeiro - RJ',
    createdAt: '2026-11-12T11:00:00Z',
  },
];

const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    clientId: 'cli-1',
    plate: 'BRA2E19',
    brand: 'Volkswagen',
    model: 'Gol 1.6 MSI Flex',
    year: 2021,
    engine: '1.6 8V EA111',
    color: 'Prata',
    mileage: 58400,
    fuelType: 'flex',
    usageProfile: 'normal',
    averageMonthlyKm: 900,
  },
  {
    id: 'veh-2',
    clientId: 'cli-2',
    plate: 'RTO4G99',
    brand: 'Toyota',
    model: 'Corolla XEi 2.0',
    year: 2020,
    engine: '2.0 Dual VVT-iE',
    color: 'Preto',
    mileage: 42150,
    fuelType: 'flex',
    usageProfile: 'moderado',
    averageMonthlyKm: 1600,
  },
  {
    id: 'veh-3',
    clientId: 'cli-3',
    plate: 'FLX9A12',
    brand: 'Fiat',
    model: 'Strada Freedom 1.3 CS (App)',
    year: 2022,
    engine: '1.3 Firefly',
    color: 'Branco',
    mileage: 89300,
    fuelType: 'flex',
    usageProfile: 'app_severo', // Motorista de aplicativo / uso severo
    averageMonthlyKm: 4200,
  },
  {
    id: 'veh-4',
    clientId: 'cli-4',
    plate: 'RKL2D99',
    brand: 'Chevrolet',
    model: 'Onix 1.0 Manual',
    year: 2022,
    engine: '1.0 Flex Manual',
    color: 'Prata Switchblade',
    mileage: 64000,
    fuelType: 'flex',
    usageProfile: 'normal',
    averageMonthlyKm: 1000,
  },
  {
    id: 'veh-5',
    clientId: 'cli-4',
    plate: 'TTZ8D77',
    brand: 'Chevrolet',
    model: 'Tracker Premier 1.2 Turbo',
    year: 2023,
    engine: '1.2 Turbo Flex',
    color: 'Azul Eclipse',
    mileage: 24500,
    fuelType: 'flex',
    usageProfile: 'moderado',
    averageMonthlyKm: 1400,
  },
];

const INITIAL_SERVICES: ServiceItem[] = [
  { id: 'srv-1', name: 'Troca de Óleo e Filtros', standardPrice: 70.0, category: 'Revisão Rápida' },
  { id: 'srv-2', name: 'Alinhamento e Balanceamento 3D', standardPrice: 120.0, category: 'Suspensão' },
  { id: 'srv-3', name: 'Troca de Pastilhas de Freio Dianteiro', standardPrice: 90.0, category: 'Freios' },
  { id: 'srv-4', name: 'Troca de Correia Dentada e Tensor', standardPrice: 280.0, category: 'Motor' },
  { id: 'srv-5', name: 'Limpeza de Bicos e TBI', standardPrice: 180.0, category: 'Injeção Eletrônica' },
  { id: 'srv-6', name: 'Revisão Preventiva Geral (Check 40 itens)', standardPrice: 250.0, category: 'Revisão' },
];

const INITIAL_PURCHASES: SupplierPurchase[] = [
  {
    id: 'pur-1',
    nfeNumber: '45892',
    supplierName: 'Distribuidora Pellegrino',
    supplierCnpj: '43.210.987/0001-55',
    issueDate: '2026-11-10',
    totalValue: 1450.0,
    itemsCount: 2,
    paidInstallmentsCount: 0,
    totalInstallmentsCount: 2,
    paidAmount: 0.0,
    remainingAmount: 1450.0,
    firstDueDate: '2026-11-25',
    lastDueDate: '2026-12-25',
    status: 'pendente',
    partCodes: ['MOT-5W30-1L', 'WO-205'],
    installments: [
      {
        id: 'inst-1-1',
        installmentNumber: 1,
        totalInstallments: 2,
        amount: 725.0,
        dueDate: '2026-11-25',
        status: 'pendente',
      },
      {
        id: 'inst-1-2',
        installmentNumber: 2,
        totalInstallments: 2,
        amount: 725.0,
        dueDate: '2026-12-25',
        status: 'pendente',
      },
    ],
    notes: 'Óleos sintéticos e filtros para estoque de revisão rápida.',
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'pur-2',
    nfeNumber: '38104',
    supplierName: 'DPaschoal Autopeças',
    supplierCnpj: '60.444.333/0001-22',
    issueDate: '2026-10-16',
    totalValue: 689.0,
    itemsCount: 2,
    paidInstallmentsCount: 1,
    totalInstallmentsCount: 3,
    paidAmount: 229.67,
    remainingAmount: 459.33,
    firstDueDate: '2026-11-16',
    lastDueDate: '2027-01-16',
    status: 'parcial',
    partCodes: ['N-1238', 'DOT4-500ML'],
    installments: [
      {
        id: 'inst-2-1',
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 229.67,
        dueDate: '2026-11-16',
        status: 'pago',
        paidAt: '2026-11-16T15:00:00Z',
      },
      {
        id: 'inst-2-2',
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 229.67,
        dueDate: '2026-12-16',
        status: 'pendente',
      },
      {
        id: 'inst-2-3',
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 229.66,
        dueDate: '2027-01-16',
        status: 'pendente',
      },
    ],
    notes: 'Pastilhas cerâmicas e fluidos DOT4.',
    createdAt: '2026-10-16T14:20:00Z',
  },
  {
    id: 'pur-3',
    nfeNumber: '29410',
    supplierName: 'Nakata Automotiva',
    supplierCnpj: '55.111.222/0001-88',
    issueDate: '2026-10-15',
    totalValue: 980.0,
    itemsCount: 2,
    paidInstallmentsCount: 2,
    totalInstallmentsCount: 3,
    paidAmount: 653.34,
    remainingAmount: 326.66,
    firstDueDate: '2026-10-15',
    lastDueDate: '2026-12-15',
    status: 'parcial',
    partCodes: ['CT488K1', 'BKR6E-D'],
    installments: [
      {
        id: 'inst-3-1',
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 326.67,
        dueDate: '2026-10-15',
        status: 'pago',
        paidAt: '2026-10-15T11:00:00Z',
      },
      {
        id: 'inst-3-2',
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 326.67,
        dueDate: '2026-11-15',
        status: 'pago',
        paidAt: '2026-11-15T09:30:00Z',
      },
      {
        id: 'inst-3-3',
        installmentNumber: 3,
        totalInstallments: 3,
        amount: 326.66,
        dueDate: '2026-12-15',
        status: 'pendente',
      },
    ],
    notes: 'Kits correia e velas de ignição.',
    createdAt: '2026-10-15T09:00:00Z',
  },
];

const INITIAL_PARTS: Part[] = [
  {
    id: 'part-1',
    sku: 'OLEO-5W30-MOTUL',
    code: 'MOT-5W30-1L',
    description: 'Óleo Motor 5W30 Sintético 1L',
    brand: 'Motul',
    category: 'Lubrificantes',
    costPrice: 38.5,
    sellPrice: 65.0,
    currentStock: 32,
    minStock: 10,
    unit: 'L',
    location: 'Prateleira A1',
    supplierName: 'Distribuidora Pellegrino',
    lastInvoiceNumber: 'NF-e 45892',
    purchaseId: 'pur-1',
  },
  {
    id: 'part-2',
    sku: 'FILT-OLEO-WO205',
    code: 'WO-205',
    description: 'Filtro de Óleo Blindado VW/Fiat',
    brand: 'Wega',
    category: 'Filtros',
    costPrice: 18.0,
    sellPrice: 38.0,
    currentStock: 14,
    minStock: 5,
    unit: 'UN',
    location: 'Prateleira A2',
    supplierName: 'Distribuidora Pellegrino',
    lastInvoiceNumber: 'NF-e 45892',
    purchaseId: 'pur-1',
  },
  {
    id: 'part-3',
    sku: 'PAST-FREIO-N1238',
    code: 'N-1238',
    description: 'Jogo Pastilha Freio Dianteira Gol/Voyage G5/G6',
    brand: 'Cobreq',
    category: 'Freios',
    costPrice: 62.0,
    sellPrice: 135.0,
    currentStock: 6,
    minStock: 3,
    unit: 'Jogo',
    location: 'Prateleira B3',
    supplierName: 'DPaschoal Autopeças',
    lastInvoiceNumber: 'NF-e 38104',
    purchaseId: 'pur-2',
  },
  {
    id: 'part-4',
    sku: 'VELA-NGK-BKR6E',
    code: 'BKR6E-D',
    description: 'Jogo de Velas de Ignição Green Plug (4 un)',
    brand: 'NGK',
    category: 'Ignição',
    costPrice: 48.0,
    sellPrice: 95.0,
    currentStock: 4,
    minStock: 4, // Alerta de estoque mínimo
    unit: 'Jogo',
    location: 'Gaveta C1',
    supplierName: 'Nakata Automotiva',
    lastInvoiceNumber: 'NF-e 29410',
    purchaseId: 'pur-3',
  },
  {
    id: 'part-5',
    sku: 'CORREIA-CT488K1',
    code: 'CT488K1',
    description: 'Kit Correia Dentada + Tensor Esticador',
    brand: 'Contitech',
    category: 'Motor',
    costPrice: 145.0,
    sellPrice: 260.0,
    currentStock: 2,
    minStock: 3, // Estoque abaixo do mínimo!
    unit: 'Kit',
    location: 'Prateleira C2',
    supplierName: 'Nakata Automotiva',
    lastInvoiceNumber: 'NF-e 29410',
    purchaseId: 'pur-3',
  },
  {
    id: 'part-6',
    sku: 'FLUIDO-DOT4-500',
    code: 'DOT4-500ML',
    description: 'Fluido de Freio DOT 4 500ml',
    brand: 'Varga/TRW',
    category: 'Freios',
    costPrice: 19.5,
    sellPrice: 42.0,
    currentStock: 18,
    minStock: 6,
    unit: 'Frasco',
    location: 'Prateleira A3',
    supplierName: 'DPaschoal Autopeças',
    lastInvoiceNumber: 'NF-e 38104',
    purchaseId: 'pur-2',
  },
];

const INITIAL_ORDERS: ServiceOrder[] = [
  {
    id: 'ord-101',
    orderNumber: 'OS-1001',
    vehicleId: 'veh-1',
    clientId: 'cli-1',
    mechanicId: 'mec-1',
    status: 'em_andamento',
    complaintDescription: 'Barulho metálico na roda dianteira direita ao frear e luz de óleo acendeu brevemente.',
    technicalDiagnostic: 'Pastilhas de freio no limite de desgaste, sem atingir o disco. Nível de óleo 1L abaixo da vareta.',
    checklist: {
      fuelLevel: 65,
      mileage: 58400,
      hasSpareWheel: true,
      hasJack: true,
      hasLugWrench: true,
      hasTriangle: true,
      hasManual: true,
      hasKeyChain: true,
      lightsWorking: true,
      hornWorking: true,
      wipersWorking: true,
      damagePoints: [
        { id: 'dp-1', x: 22, y: 78, type: 'risco', partName: 'Parachoque Dianteiro Lado Direito', notes: 'Ralado leve de estacionamento' }
      ],
      additionalNotes: 'Cliente autorizou peças de 1ª linha.'
    },
    parts: [
      { id: 'poi-1', partId: 'part-3', code: 'N-1238', description: 'Jogo Pastilha Freio Dianteira Gol/Voyage G5/G6', quantity: 1, unitCost: 62.0, unitPrice: 135.0, total: 135.0 },
      { id: 'poi-2', partId: 'part-1', code: 'MOT-5W30-1L', description: 'Óleo Motor 5W30 Sintético 1L', quantity: 4, unitCost: 38.5, unitPrice: 65.0, total: 260.0 },
      { id: 'poi-3', partId: 'part-2', code: 'WO-205', description: 'Filtro de Óleo Blindado VW/Fiat', quantity: 1, unitCost: 18.0, unitPrice: 38.0, total: 38.0 },
    ],
    services: [
      { id: 'soi-1', serviceId: 'srv-3', description: 'Troca de Pastilhas de Freio Dianteiro', mechanicId: 'mec-1', price: 90.0, commissionRate: 20, commissionValue: 18.0 },
      { id: 'soi-2', serviceId: 'srv-1', description: 'Troca de Óleo e Filtros', mechanicId: 'mec-1', price: 70.0, commissionRate: 20, commissionValue: 14.0 },
    ],
    partsTotal: 433.0,
    servicesTotal: 160.0,
    grossTotal: 593.0,
    discount: 23.0,
    netTotal: 570.0,
    partsCostTotal: 234.0, // 62 + (4 * 38.5) + 18
    mechanicsCommissionTotal: 32.0, // 18 + 14
    netProfit: 304.0, // 570 - 234 - 32 = R$ 304,00 de Lucro Real!
    profitMarginPercent: 53.3,
    isPaid: false,
    createdAt: '2026-11-17T08:30:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
    estimatedDelivery: '2026-11-18T17:30:00Z',
  },
  {
    id: 'ord-102',
    orderNumber: 'OS-1002',
    vehicleId: 'veh-2',
    clientId: 'cli-2',
    mechanicId: 'mec-2',
    status: 'pronto',
    complaintDescription: 'Revisão preventiva de 40.000 km e alinhamento.',
    technicalDiagnostic: 'Revisão executada com sucesso. Geometria ajustada.',
    checklist: {
      fuelLevel: 80,
      mileage: 42150,
      hasSpareWheel: true,
      hasJack: true,
      hasLugWrench: true,
      hasTriangle: true,
      hasManual: true,
      hasKeyChain: true,
      lightsWorking: true,
      hornWorking: true,
      wipersWorking: true,
      damagePoints: [],
    },
    parts: [
      { id: 'poi-4', partId: 'part-1', code: 'MOT-5W30-1L', description: 'Óleo Motor 5W30 Sintético 1L', quantity: 5, unitCost: 38.5, unitPrice: 65.0, total: 325.0 },
      { id: 'poi-5', partId: 'part-2', code: 'WO-205', description: 'Filtro de Óleo Blindado', quantity: 1, unitCost: 18.0, unitPrice: 38.0, total: 38.0 },
    ],
    services: [
      { id: 'soi-3', serviceId: 'srv-6', description: 'Revisão Preventiva Geral (Check 40 itens)', mechanicId: 'mec-2', price: 250.0, commissionRate: 15, commissionValue: 37.5 },
      { id: 'soi-4', serviceId: 'srv-2', description: 'Alinhamento e Balanceamento 3D', mechanicId: 'mec-2', price: 120.0, commissionRate: 15, commissionValue: 18.0 },
    ],
    partsTotal: 363.0,
    servicesTotal: 370.0,
    grossTotal: 733.0,
    discount: 33.0,
    netTotal: 700.0,
    partsCostTotal: 210.5,
    mechanicsCommissionTotal: 55.5,
    netProfit: 434.0,
    profitMarginPercent: 62.0,
    paymentMethod: 'pix',
    isPaid: true,
    paidAt: '2026-11-18T14:10:00Z',
    createdAt: '2026-11-18T09:00:00Z',
    updatedAt: '2026-11-18T14:10:00Z',
  },
  {
    id: 'ord-103',
    orderNumber: 'OS-1003',
    vehicleId: 'veh-3',
    clientId: 'cli-3',
    mechanicId: 'mec-1',
    status: 'aguardando_aprovacao',
    complaintDescription: 'Motor falhando na retomada e estalos na correia ao ligar pela manhã.',
    technicalDiagnostic: 'Correia dentada com dentes gastos e velas de ignição gastas (eletrodo aberto). Necessita troca imediata.',
    checklist: {
      fuelLevel: 40,
      mileage: 89300,
      hasSpareWheel: true,
      hasJack: true,
      hasLugWrench: true,
      hasTriangle: true,
      hasManual: false,
      hasKeyChain: true,
      lightsWorking: true,
      hornWorking: true,
      wipersWorking: true,
      damagePoints: [
        { id: 'dp-2', x: 80, y: 35, type: 'amassado', partName: 'Tampa da Caçamba', notes: 'Amassado de carga' }
      ],
    },
    parts: [
      { id: 'poi-6', partId: 'part-5', code: 'CT488K1', description: 'Kit Correia Dentada + Tensor Esticador', quantity: 1, unitCost: 145.0, unitPrice: 260.0, total: 260.0 },
      { id: 'poi-7', partId: 'part-4', code: 'BKR6E-D', description: 'Jogo de Velas de Ignição Green Plug (4 un)', quantity: 1, unitCost: 48.0, unitPrice: 95.0, total: 95.0 },
    ],
    services: [
      { id: 'soi-5', serviceId: 'srv-4', description: 'Troca de Correia Dentada e Tensor', mechanicId: 'mec-1', price: 280.0, commissionRate: 20, commissionValue: 56.0 },
      { id: 'soi-6', serviceId: 'srv-5', description: 'Limpeza de Bicos e TBI', mechanicId: 'mec-1', price: 180.0, commissionRate: 20, commissionValue: 36.0 },
    ],
    partsTotal: 355.0,
    servicesTotal: 460.0,
    grossTotal: 815.0,
    discount: 15.0,
    netTotal: 800.0,
    partsCostTotal: 193.0,
    mechanicsCommissionTotal: 92.0,
    netProfit: 515.0,
    profitMarginPercent: 64.3,
    isPaid: false,
    createdAt: '2026-11-18T11:20:00Z',
    updatedAt: '2026-11-18T11:45:00Z',
  },
  {
    id: 'ord-104',
    orderNumber: 'OS-3224',
    vehicleId: 'veh-4',
    clientId: 'cli-4',
    mechanicId: 'mec-1',
    status: 'em_andamento',
    complaintDescription: 'Barulho na suspensão dianteira ao passar em lombadas e ruído ao esterçar.',
    technicalDiagnostic: 'Buchas da bandeja e bieletas com folga acentuada. Amortecedores dianteiros com início de vazamento.',
    checklist: {
      fuelLevel: 55,
      mileage: 38200,
      hasSpareWheel: true,
      hasJack: true,
      hasLugWrench: true,
      hasTriangle: true,
      hasManual: true,
      hasKeyChain: true,
      lightsWorking: true,
      hornWorking: true,
      wipersWorking: true,
      damagePoints: [],
    },
    parts: [
      { id: 'poi-8', partId: 'part-3', code: 'N-1238', description: 'Kit Bieletas e Buchas de Suspensão', quantity: 2, unitCost: 30.0, unitPrice: 60.0, total: 120.0 },
    ],
    services: [
      { id: 'soi-7', serviceId: 'srv-2', description: 'Substituição de Bieletas e Alinhamento', mechanicId: 'mec-1', price: 180.0, commissionRate: 20, commissionValue: 36.0 },
    ],
    partsTotal: 120.0,
    servicesTotal: 180.0,
    grossTotal: 300.0,
    discount: 0,
    netTotal: 300.0,
    partsCostTotal: 60.0,
    mechanicsCommissionTotal: 36.0,
    netProfit: 204.0,
    profitMarginPercent: 68.0,
    isPaid: false,
    createdAt: '2026-11-20T08:30:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  }
];

const INITIAL_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: 'trx-1',
    type: 'receita',
    category: 'Serviço',
    description: 'Recebimento OS-1002 (Toyota Corolla - Dra. Patrícia)',
    amount: 700.0,
    dueDate: '2026-11-18',
    paymentDate: '2026-11-18',
    status: 'pago',
    paymentMethod: 'pix',
    serviceOrderId: 'ord-102',
    createdAt: '2026-11-18T14:10:00Z',
  },
  {
    id: 'trx-2',
    type: 'despesa',
    category: 'Peças',
    description: 'Boleto Distribuidora Pellegrino - NF 45892 (Óleos e Filtros)',
    amount: 1450.0,
    dueDate: '2026-11-25',
    status: 'pendente',
    supplierPurchaseId: 'pur-1',
    installmentInfo: 'Parcela 1/2',
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'trx-3',
    type: 'despesa',
    category: 'Fixo',
    description: 'Aluguel do Galpão + IPTU',
    amount: 2800.0,
    dueDate: '2026-11-20',
    status: 'pendente',
    createdAt: '2026-11-01T08:00:00Z',
  },
];

// Registros de Manutenção Preventiva com cenários de 1 dia antes, 1 semana antes e vencido
const INITIAL_MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  {
    id: 'mrec-1',
    serviceOrderId: 'ord-103',
    vehicleId: 'veh-3', // Fiat Strada (Motorista de App - uso severo)
    clientId: 'cli-3',
    serviceType: 'troca_oleo',
    serviceName: 'Troca de Óleo e Filtros (App)',
    completedDate: '2026-08-31', // Feito há 79 dias
    mileageAtService: 79300,
    usageProfile: 'app_severo',
    estimatedReturnDate: '2026-11-19', // Vence amanhã (1 DIA ANTES!)
    estimatedReturnMileage: 89300,
    intervalMonths: 3,
    intervalKm: 10000,
    notes: 'Motorista roda 3.500 km/mês. Vence amanhã!',
  },
  {
    id: 'mrec-2',
    serviceOrderId: 'ord-101',
    vehicleId: 'veh-1', // Gol (Uso Normal - 1 ano)
    clientId: 'cli-1',
    serviceType: 'troca_oleo',
    serviceName: 'Troca de Óleo e Filtros',
    completedDate: '2025-11-25', // Feito há 358 dias
    mileageAtService: 48400,
    usageProfile: 'normal',
    estimatedReturnDate: '2026-11-25', // Vence em 7 dias (1 SEMANA ANTES!)
    estimatedReturnMileage: 58400,
    intervalMonths: 12,
    intervalKm: 10000,
    notes: 'Cliente de passeio. Vence em 7 dias!',
  },
  {
    id: 'mrec-3',
    serviceOrderId: 'ord-102',
    vehicleId: 'veh-2', // Corolla (Uso Moderado)
    clientId: 'cli-2',
    serviceType: 'freios',
    serviceName: 'Revisão do Sistema de Freios',
    completedDate: '2026-05-10',
    mileageAtService: 35000,
    usageProfile: 'moderado',
    estimatedReturnDate: '2027-05-10', // Vence ano que vem (Em dia)
    estimatedReturnMileage: 55000,
    intervalMonths: 12,
    intervalKm: 20000,
  },
  {
    id: 'mrec-4',
    serviceOrderId: 'ord-103',
    vehicleId: 'veh-3', // Fiat Strada (App)
    clientId: 'cli-3',
    serviceType: 'alinhamento',
    serviceName: 'Alinhamento e Geometria',
    completedDate: '2026-08-10', // Feito há 100 dias (prazo app era 75 dias)
    mileageAtService: 75000,
    usageProfile: 'app_severo',
    estimatedReturnDate: '2026-10-24', // Vencido há ~25 dias!
    estimatedReturnMileage: 85000,
    intervalMonths: 2.5,
    intervalKm: 10000,
    notes: 'Serviço vencido',
  },
  {
    id: 'mrec-5',
    serviceOrderId: 'ord-104',
    vehicleId: 'veh-4', // Chevrolet Onix (Henrique Rosa)
    clientId: 'cli-4',
    serviceType: 'troca_oleo',
    serviceName: 'Troca de Óleo e Filtro de Óleo',
    completedDate: '2026-10-24', // Feito há cerca de 1 mês
    mileageAtService: 64000,
    usageProfile: 'normal',
    estimatedReturnDate: '2027-10-24',
    estimatedReturnMileage: 74000,
    intervalMonths: 12,
    intervalKm: 10000,
    notes: 'Óleo sintético 5W30 e filtro de óleo.',
  },
  {
    id: 'mrec-6',
    serviceOrderId: 'ord-104',
    vehicleId: 'veh-4',
    clientId: 'cli-4',
    serviceType: 'revisao_geral',
    serviceName: 'Troca de Velas de Ignição',
    completedDate: '2026-10-24',
    mileageAtService: 64000,
    usageProfile: 'normal',
    estimatedReturnDate: '2027-10-24',
    estimatedReturnMileage: 74000,
    intervalMonths: 12,
    intervalKm: 10000,
    notes: 'Jogo de velas Green Plug.',
  },
  {
    id: 'mrec-7',
    serviceOrderId: 'ord-104',
    vehicleId: 'veh-4',
    clientId: 'cli-4',
    serviceType: 'outro',
    serviceName: 'Troca de Filtro de Ar do Motor',
    completedDate: '2026-10-24',
    mileageAtService: 64000,
    usageProfile: 'normal',
    estimatedReturnDate: '2027-10-24',
    estimatedReturnMileage: 74000,
    intervalMonths: 12,
    intervalKm: 10000,
    notes: 'Filtro de ar do motor substituído.',
  },
  {
    id: 'mrec-8',
    serviceOrderId: 'ord-104',
    vehicleId: 'veh-4',
    clientId: 'cli-4',
    serviceType: 'outro',
    serviceName: 'Troca de Filtro de Ar Condicionado (Cabine)',
    completedDate: '2026-10-24',
    mileageAtService: 64000,
    usageProfile: 'normal',
    estimatedReturnDate: '2027-10-24',
    estimatedReturnMileage: 74000,
    intervalMonths: 12,
    intervalKm: 10000,
    notes: 'Filtro de cabine com carvão ativado.',
  },
  {
    id: 'mrec-9',
    serviceOrderId: 'ord-104',
    vehicleId: 'veh-4',
    clientId: 'cli-4',
    serviceType: 'outro',
    serviceName: 'Limpeza do Corpo de Borboleta (TBI)',
    completedDate: '2026-10-24',
    mileageAtService: 64000,
    usageProfile: 'normal',
    estimatedReturnDate: '2027-10-24',
    estimatedReturnMileage: 74000,
    intervalMonths: 12,
    intervalKm: 10000,
    notes: 'Descarbonização do TBI e reaprendizado.',
  },
];

// Helper seguro de LocalStorage
function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Erro ao carregar dados de ${key}:`, e);
    return fallback;
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Erro ao salvar dados em ${key}:`, e);
  }
}

export const StorageService = {
  initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
      setToStorage(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.VEHICLES)) {
      setToStorage(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MECHANICS)) {
      setToStorage(STORAGE_KEYS.MECHANICS, INITIAL_MECHANICS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PARTS)) {
      setToStorage(STORAGE_KEYS.PARTS, INITIAL_PARTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
      setToStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
      setToStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      setToStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MAINTENANCE)) {
      setToStorage(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_RECORDS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PURCHASES)) {
      setToStorage(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES);
    }
  },

  resetToDefault() {
    setToStorage(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    setToStorage(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
    setToStorage(STORAGE_KEYS.MECHANICS, INITIAL_MECHANICS);
    setToStorage(STORAGE_KEYS.PARTS, INITIAL_PARTS);
    setToStorage(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    setToStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    setToStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    setToStorage(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_RECORDS);
    setToStorage(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES);
  },

  // Clients
  getClients(): Client[] {
    const clients = getFromStorage<Client[]>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    const hasHenrique = clients.some(
      (c) => c.phone.includes('993793746') || c.id === 'cli-4' || c.name.toLowerCase().includes('henrique')
    );
    if (!hasHenrique) {
      const h = INITIAL_CLIENTS.find((c) => c.id === 'cli-4');
      if (h) {
        clients.push(h);
        setToStorage(STORAGE_KEYS.CLIENTS, clients);
      }
    }
    return clients;
  },
  saveClient(client: Client): void {
    const clients = this.getClients();
    const index = clients.findIndex((c) => c.id === client.id);
    if (index >= 0) clients[index] = client;
    else clients.push(client);
    setToStorage(STORAGE_KEYS.CLIENTS, clients);
  },
  deleteClient(id: string): void {
    const clients = this.getClients().filter((c) => c.id !== id);
    setToStorage(STORAGE_KEYS.CLIENTS, clients);
  },

  // Vehicles
  getVehicles(): Vehicle[] {
    const vehicles = getFromStorage<Vehicle[]>(STORAGE_KEYS.VEHICLES, INITIAL_VEHICLES);
    let modified = false;

    // Garante que Strada tem usageProfile: 'app_severo'
    const strada = vehicles.find((v) => v.plate === 'FLX9A12');
    if (strada && strada.usageProfile !== 'app_severo') {
      strada.usageProfile = 'app_severo';
      modified = true;
    }

    // Garante Onix 1.0 Manual para RKL2D99
    const rkl = vehicles.find((v) => v.plate === 'RKL2D99');
    if (rkl) {
      if (rkl.model === '1.0' || !rkl.brand || rkl.brand === 'Genérica' || rkl.model.includes('Sandero')) {
        rkl.brand = 'Chevrolet';
        rkl.model = 'Onix 1.0 Manual';
        rkl.engine = rkl.engine || '1.0 Flex Manual';
        modified = true;
      }
      if (!rkl.clientId) {
        rkl.clientId = 'cli-4';
        modified = true;
      }
    } else {
      const v4 = INITIAL_VEHICLES.find((v) => v.plate === 'RKL2D99');
      if (v4) {
        vehicles.push(v4);
        modified = true;
      }
    }

    // Garante Tracker Premier para TTZ8D77
    const ttz = vehicles.find((v) => v.plate === 'TTZ8D77');
    if (ttz) {
      if (!ttz.clientId) {
        ttz.clientId = 'cli-4';
        modified = true;
      }
    } else {
      const v5 = INITIAL_VEHICLES.find((v) => v.plate === 'TTZ8D77');
      if (v5) {
        vehicles.push(v5);
        modified = true;
      }
    }

    // Garante que cada veículo tenha usageProfile e averageMonthlyKm preenchidos
    vehicles.forEach((v) => {
      if (!v.usageProfile) {
        v.usageProfile = v.plate === 'FLX9A12' ? 'app_severo' : 'normal';
        modified = true;
      }
      if (!v.averageMonthlyKm) {
        v.averageMonthlyKm =
          v.usageProfile === 'app_severo'
            ? 3500
            : v.usageProfile === 'frota'
            ? 4000
            : v.usageProfile === 'severo_curto'
            ? 1200
            : v.usageProfile === 'moderado'
            ? 1600
            : 1000;
        modified = true;
      }
    });

    if (modified) {
      setToStorage(STORAGE_KEYS.VEHICLES, vehicles);
    }
    return vehicles;
  },
  saveVehicle(vehicle: Vehicle): void {
    const vehicles = this.getVehicles();
    const index = vehicles.findIndex((v) => v.id === vehicle.id);
    if (index >= 0) vehicles[index] = vehicle;
    else vehicles.push(vehicle);
    setToStorage(STORAGE_KEYS.VEHICLES, vehicles);
  },
  deleteVehicle(id: string): void {
    const vehicles = this.getVehicles().filter((v) => v.id !== id);
    setToStorage(STORAGE_KEYS.VEHICLES, vehicles);
  },

  // Mechanics
  getMechanics(): Mechanic[] {
    const list = getFromStorage<Mechanic[]>(STORAGE_KEYS.MECHANICS, INITIAL_MECHANICS);
    const hasRico = list.some((m) => m.name.toLowerCase().includes('rico'));
    if (!hasRico && list.length > 0) {
      list[0].name = 'Rico (Responsável Técnico)';
      setToStorage(STORAGE_KEYS.MECHANICS, list);
    }
    return list;
  },
  saveMechanic(mechanic: Mechanic): void {
    const mechanics = this.getMechanics();
    const index = mechanics.findIndex((m) => m.id === mechanic.id);
    if (index >= 0) mechanics[index] = mechanic;
    else mechanics.push(mechanic);
    setToStorage(STORAGE_KEYS.MECHANICS, mechanics);
  },

  // Parts
  getParts(): Part[] {
    const parts = getFromStorage<Part[]>(STORAGE_KEYS.PARTS, INITIAL_PARTS);
    let modified = false;
    parts.forEach((p) => {
      const initial = INITIAL_PARTS.find((ip) => ip.id === p.id || ip.code === p.code);
      if (initial && (!p.supplierName || !p.lastInvoiceNumber)) {
        p.supplierName = p.supplierName || initial.supplierName;
        p.lastInvoiceNumber = p.lastInvoiceNumber || initial.lastInvoiceNumber;
        p.purchaseId = p.purchaseId || initial.purchaseId;
        modified = true;
      }
    });
    if (modified) {
      setToStorage(STORAGE_KEYS.PARTS, parts);
    }
    return parts;
  },
  savePart(part: Part): void {
    const parts = this.getParts();
    const index = parts.findIndex((p) => p.id === part.id);
    if (index >= 0) parts[index] = part;
    else parts.push(part);
    setToStorage(STORAGE_KEYS.PARTS, parts);
  },
  bulkUpsertParts(newParts: Part[]): void {
    const parts = this.getParts();
    newParts.forEach((np) => {
      const idx = parts.findIndex((p) => p.code.toLowerCase() === np.code.toLowerCase() || p.id === np.id);
      if (idx >= 0) {
        // Atualiza estoque somando e atualiza preço de custo/venda
        parts[idx].currentStock += np.currentStock;
        parts[idx].costPrice = np.costPrice;
        if (np.sellPrice > 0) parts[idx].sellPrice = np.sellPrice;
        if (np.supplierName) parts[idx].supplierName = np.supplierName;
        if (np.lastInvoiceNumber) parts[idx].lastInvoiceNumber = np.lastInvoiceNumber;
        if (np.purchaseId) parts[idx].purchaseId = np.purchaseId;
      } else {
        parts.push(np);
      }
    });
    setToStorage(STORAGE_KEYS.PARTS, parts);
  },
  deletePart(id: string): void {
    const parts = this.getParts().filter((p) => p.id !== id);
    setToStorage(STORAGE_KEYS.PARTS, parts);
  },

  // Purchases & Supplier Invoices
  getPurchases(): SupplierPurchase[] {
    return getFromStorage<SupplierPurchase[]>(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES);
  },
  savePurchase(purchase: SupplierPurchase): void {
    const purchases = this.getPurchases();
    const index = purchases.findIndex((p) => p.id === purchase.id);
    if (index >= 0) purchases[index] = purchase;
    else purchases.unshift(purchase);
    setToStorage(STORAGE_KEYS.PURCHASES, purchases);
  },
  deletePurchase(id: string): void {
    const purchases = this.getPurchases().filter((p) => p.id !== id);
    setToStorage(STORAGE_KEYS.PURCHASES, purchases);
  },
  payPurchaseInstallment(purchaseId: string, installmentNumber: number, customPaidDate?: string): void {
    const purchases = this.getPurchases();
    const purchase = purchases.find((p) => p.id === purchaseId);
    if (!purchase) return;

    const inst = purchase.installments.find((i) => i.installmentNumber === installmentNumber);
    if (!inst) return;

    // Se customPaidDate foi fornecido, usa ele; senão salva a data do sistema atual
    let finalPaidIso = new Date().toISOString();
    let finalDateOnly = new Date().toISOString().split('T')[0];

    if (customPaidDate) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(customPaidDate)) {
        finalPaidIso = `${customPaidDate}T12:00:00.000Z`;
        finalDateOnly = customPaidDate;
      } else {
        finalPaidIso = customPaidDate;
        finalDateOnly = customPaidDate.split('T')[0];
      }
    }

    inst.status = 'pago';
    inst.paidAt = finalPaidIso;

    const paidCount = purchase.installments.filter((i) => i.status === 'pago').length;
    const paidAmount = purchase.installments
      .filter((i) => i.status === 'pago')
      .reduce((acc, i) => acc + i.amount, 0);

    purchase.paidInstallmentsCount = paidCount;
    purchase.paidAmount = paidAmount;
    purchase.remainingAmount = Math.max(0, purchase.totalValue - paidAmount);
    purchase.status =
      paidCount === purchase.totalInstallmentsCount
        ? 'pago'
        : paidCount > 0
        ? 'parcial'
        : 'pendente';

    this.savePurchase(purchase);

    // Marca também a transação financeira vinculada como paga com a data de pagamento
    const transactions = this.getTransactions();
    const matchingTx = transactions.find(
      (t) =>
        t.supplierPurchaseId === purchaseId ||
        (t.description.includes(purchase.nfeNumber) && t.type === 'despesa')
    );
    if (matchingTx) {
      matchingTx.status = 'pago';
      matchingTx.paymentDate = finalDateOnly;
      setToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    }
  },

  // Services Catalog
  getServices(): ServiceItem[] {
    return getFromStorage<ServiceItem[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  },
  saveService(service: ServiceItem): void {
    const services = this.getServices();
    const idx = services.findIndex((s) => s.id === service.id);
    if (idx >= 0) services[idx] = service;
    else services.push(service);
    setToStorage(STORAGE_KEYS.SERVICES, services);
  },

  // Service Orders
  getOrders(): ServiceOrder[] {
    const orders = getFromStorage<ServiceOrder[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    let ordersModified = false;
    const has3224 = orders.some((o) => o.orderNumber === 'OS-3224' || o.id === 'ord-104');
    if (!has3224) {
      const ord104 = INITIAL_ORDERS.find((o) => o.id === 'ord-104');
      if (ord104) {
        orders.push(ord104);
        ordersModified = true;
      }
    }

    // Auto-correção de digitação de balcão (ex: "pivto" -> "pivô")
    orders.forEach((o) => {
      if (o.technicalDiagnostic && /pivto/i.test(o.technicalDiagnostic)) {
        o.technicalDiagnostic = o.technicalDiagnostic.replace(/pivto/gi, 'pivô');
        ordersModified = true;
      }
      if (o.complaintDescription && /pivto/i.test(o.complaintDescription)) {
        o.complaintDescription = o.complaintDescription.replace(/pivto/gi, 'pivô');
        ordersModified = true;
      }
    });

    if (ordersModified) {
      setToStorage(STORAGE_KEYS.ORDERS, orders);
    }
    return orders;
  },
  saveOrder(order: ServiceOrder): void {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === order.id);
    if (index >= 0) orders[index] = order;
    else orders.unshift(order);
    setToStorage(STORAGE_KEYS.ORDERS, orders);
  },
  updateOrderDiagnostic(orderId: string, diagnostic: string): void {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.technicalDiagnostic = diagnostic;
      order.updatedAt = new Date().toISOString();
      setToStorage(STORAGE_KEYS.ORDERS, orders);
    }
  },
  deleteOrder(id: string): void {
    const orders = this.getOrders().filter((o) => o.id !== id);
    setToStorage(STORAGE_KEYS.ORDERS, orders);
  },

  // Stock deduction upon order approval/completion
  deductStockForOrder(order: ServiceOrder): void {
    const parts = this.getParts();
    order.parts.forEach((item) => {
      if (item.partId) {
        const part = parts.find((p) => p.id === item.partId);
        if (part) {
          part.currentStock = Math.max(0, part.currentStock - item.quantity);
        }
      }
    });
    setToStorage(STORAGE_KEYS.PARTS, parts);
  },

  // Financial Transactions
  getTransactions(): FinancialTransaction[] {
    const txs = getFromStorage<FinancialTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    let modified = false;
    txs.forEach((t) => {
      if (t.category === 'Fornecedor de Autopeças') {
        t.category = 'Peças';
        modified = true;
      } else if (t.category === 'Custos Fixos Oficina' || t.category === 'Aluguel e IPTU do Pátio/Oficina') {
        t.category = 'Fixo';
        modified = true;
      } else if (t.category === 'Serviço Concluído' || t.category === 'Ordem de Serviço') {
        t.category = 'Serviço';
        modified = true;
      } else if (t.category === 'Comissão de Mecânicos') {
        t.category = 'Comissão';
        modified = true;
      }
    });
    if (modified) {
      setToStorage(STORAGE_KEYS.TRANSACTIONS, txs);
    }
    return txs;
  },
  saveTransaction(tx: FinancialTransaction): void {
    const txs = this.getTransactions();
    const index = txs.findIndex((t) => t.id === tx.id);
    if (index >= 0) txs[index] = tx;
    else txs.unshift(tx);
    setToStorage(STORAGE_KEYS.TRANSACTIONS, txs);
  },
  deleteTransaction(id: string): void {
    const txs = this.getTransactions().filter((t) => t.id !== id);
    setToStorage(STORAGE_KEYS.TRANSACTIONS, txs);
  },

  // Maintenance Records (CRM Preventivo / Retorno do Cliente)
  getMaintenanceRecords(): MaintenanceRecord[] {
    return getFromStorage<MaintenanceRecord[]>(STORAGE_KEYS.MAINTENANCE, INITIAL_MAINTENANCE_RECORDS);
  },
  saveMaintenanceRecord(record: MaintenanceRecord): void {
    const records = this.getMaintenanceRecords();
    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) records[index] = record;
    else records.unshift(record);
    setToStorage(STORAGE_KEYS.MAINTENANCE, records);
  },
  deleteMaintenanceRecord(id: string): void {
    const records = this.getMaintenanceRecords().filter((r) => r.id !== id);
    setToStorage(STORAGE_KEYS.MAINTENANCE, records);
  },
  updateMaintenanceContactStatus(
    recordIds: string[],
    contactStatus: 'pendente' | 'avisado' | 'agendado'
  ): void {
    const records = this.getMaintenanceRecords();
    const now = new Date().toISOString();
    const updated = records.map((r) => {
      if (recordIds.includes(r.id)) {
        return {
          ...r,
          contactStatus,
          contactedAt: contactStatus === 'pendente' ? undefined : now,
        };
      }
      return r;
    });
    setToStorage(STORAGE_KEYS.MAINTENANCE, updated);
  },

  // Backup Completo
  exportAllData(): string {
    const data = {
      clients: this.getClients(),
      vehicles: this.getVehicles(),
      mechanics: this.getMechanics(),
      parts: this.getParts(),
      services: this.getServices(),
      orders: this.getOrders(),
      transactions: this.getTransactions(),
      maintenance: this.getMaintenanceRecords(),
      purchases: this.getPurchases(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },

  importAllData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.clients) setToStorage(STORAGE_KEYS.CLIENTS, data.clients);
      if (data.vehicles) setToStorage(STORAGE_KEYS.VEHICLES, data.vehicles);
      if (data.mechanics) setToStorage(STORAGE_KEYS.MECHANICS, data.mechanics);
      if (data.parts) setToStorage(STORAGE_KEYS.PARTS, data.parts);
      if (data.services) setToStorage(STORAGE_KEYS.SERVICES, data.services);
      if (data.orders) setToStorage(STORAGE_KEYS.ORDERS, data.orders);
      if (data.transactions) setToStorage(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (data.maintenance) setToStorage(STORAGE_KEYS.MAINTENANCE, data.maintenance);
      if (data.purchases) setToStorage(STORAGE_KEYS.PURCHASES, data.purchases);
      return true;
    } catch (e) {
      console.error('Falha ao importar JSON de backup:', e);
      return false;
    }
  },
};
