import React, { useState, useEffect } from 'react';
import {
  Client,
  Vehicle,
  Mechanic,
  Part,
  ServiceItem,
  ServiceOrder,
  FinancialTransaction,
  OrderStatus,
  ParsedXMLInvoice,
  MaintenanceRecord,
  SupplierPurchase,
  PaymentMethod,
} from './types';
import { StorageService } from './services/storage';
import { PreventiveMaintenanceService } from './services/preventiveMaintenance';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { KanbanBoard } from './components/KanbanBoard';
import { PartsInventoryView } from './components/PartsInventoryView';
import { ClientsView } from './components/ClientsView';
import { FinancialView } from './components/FinancialView';
import { PreventiveMaintenanceView } from './components/PreventiveMaintenanceView';
import { OrderModal } from './components/OrderModal';
import { ReceiptPrintModal } from './components/ReceiptPrintModal';

export const App: React.FC = () => {
  // Estado de Navegação
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'parts' | 'clients' | 'financial' | 'maintenance'>('dashboard');

  // Estados Globais de Dados
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);

  // Estados dos Modais
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<ServiceOrder | null>(null);

  // Inicialização do Storage
  useEffect(() => {
    StorageService.initStorage();
    loadAllData();
  }, []);

  const loadAllData = () => {
    setClients(StorageService.getClients());
    setVehicles(StorageService.getVehicles());
    setMechanics(StorageService.getMechanics());
    setParts(StorageService.getParts());
    setServices(StorageService.getServices());
    setOrders(StorageService.getOrders());
    setTransactions(StorageService.getTransactions());
    setMaintenanceRecords(StorageService.getMaintenanceRecords());
    setPurchases(StorageService.getPurchases());
  };

  // Contagem de carros no pátio (ativos)
  const carsInShopCount = orders.filter(
    (o) => o.status !== 'finalizado' && o.status !== 'cancelado'
  ).length;

  // Contagem de veículos com alertas pendentes de ação preventiva (urgente 1 dia, 7 dias e vencidos)
  const allAlerts = PreventiveMaintenanceService.calculateAlerts(
    maintenanceRecords,
    vehicles,
    clients
  );
  const groupedAlerts = PreventiveMaintenanceService.groupAlertsByVehicle(allAlerts);
  const pendingAlertsCount = groupedAlerts.filter(
    (g) => g.worstStatus === 'urgente_1dia' || g.worstStatus === 'alerta_7dias' || g.worstStatus === 'vencido'
  ).length;

  // Ações de Ordem de Serviço
  const handleOpenNewOrder = () => {
    setEditingOrder(null);
    setIsOrderModalOpen(true);
  };

  const handleOpenExistingOrder = (order: ServiceOrder) => {
    setEditingOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleSaveOrder = (savedOrder: ServiceOrder) => {
    // Se a ordem for aprovada, executada ou finalizada, desconta peças do estoque
    if (
      ['aprovado', 'em_andamento', 'pronto', 'finalizado'].includes(savedOrder.status) &&
      (!editingOrder || ['orcamento', 'aguardando_aprovacao'].includes(editingOrder.status))
    ) {
      StorageService.deductStockForOrder(savedOrder);
      setParts(StorageService.getParts());
    }

    // Se foi marcada como PAGA, registra a transação financeira de receita automaticamente!
    if (savedOrder.isPaid && (!editingOrder || !editingOrder.isPaid)) {
      const newTx: FinancialTransaction = {
        id: 'trx-' + Date.now(),
        type: 'receita',
        category: 'Ordem de Serviço',
        description: `Recebimento ${savedOrder.orderNumber}`,
        amount: savedOrder.netTotal,
        dueDate: new Date().toISOString().split('T')[0],
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'pago',
        serviceOrderId: savedOrder.id,
        createdAt: new Date().toISOString(),
      };
      StorageService.saveTransaction(newTx);
      setTransactions(StorageService.getTransactions());
    }

    // Se a OS for finalizada, memoriza os serviços preventivos realizados no histórico!
    if (savedOrder.status === 'finalizado') {
      const v = vehicles.find((veh) => veh.id === savedOrder.vehicleId);
      if (v) {
        savedOrder.services.forEach((s) => {
          const mRec = PreventiveMaintenanceService.createMaintenanceRecord(savedOrder, s.description, v);
          StorageService.saveMaintenanceRecord(mRec);
        });
        setMaintenanceRecords(StorageService.getMaintenanceRecords());
      }
    }

    StorageService.saveOrder(savedOrder);
    setOrders(StorageService.getOrders());
    setIsOrderModalOpen(false);
    setEditingOrder(null);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const isApprovedOrActive = newStatus === 'aprovado' || newStatus === 'em_andamento' || newStatus === 'pronto' || newStatus === 'finalizado';
    const updated: ServiceOrder = {
      ...order,
      status: newStatus,
      serviceDate: (isApprovedOrActive && !order.serviceDate) ? new Date().toISOString().split('T')[0] : order.serviceDate,
      updatedAt: new Date().toISOString(),
      finishedAt: newStatus === 'finalizado' ? new Date().toISOString() : order.finishedAt,
    };

    if (newStatus === 'aprovado' || newStatus === 'em_andamento') {
      StorageService.deductStockForOrder(updated);
      setParts(StorageService.getParts());
    }

    // Se finalizou via Kanban, memoriza serviços preventivos
    if (newStatus === 'finalizado') {
      const v = vehicles.find((veh) => veh.id === updated.vehicleId);
      if (v) {
        updated.services.forEach((s) => {
          const mRec = PreventiveMaintenanceService.createMaintenanceRecord(updated, s.description, v);
          StorageService.saveMaintenanceRecord(mRec);
        });
        setMaintenanceRecords(StorageService.getMaintenanceRecords());
      }
    }

    StorageService.saveOrder(updated);
    setOrders(StorageService.getOrders());
  };

  const handleQuickCheckout = (order: ServiceOrder, paymentMethod: PaymentMethod, isPaid: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const updatedOrder: ServiceOrder = {
      ...order,
      status: 'finalizado',
      paymentMethod,
      isPaid,
      paidAt: isPaid ? now : undefined,
      finishedAt: now,
      updatedAt: now,
    };

    // Deduz estoque caso ainda não tenha deduzido
    StorageService.deductStockForOrder(updatedOrder);
    setParts(StorageService.getParts());

    // Salva a OS
    StorageService.saveOrder(updatedOrder);
    setOrders(StorageService.getOrders());

    // Cria sozinho a linha de entrada no Financeiro (sem ir pra tela do Financeiro)
    const client = clients.find((c) => c.id === order.clientId);
    const vehicle = vehicles.find((v) => v.id === order.vehicleId);
    const clientName = client?.name || 'Cliente';
    const vehName = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Veículo';

    const newTx: FinancialTransaction = {
      id: 'trx-' + Date.now(),
      type: 'receita',
      category: 'Serviço',
      description: `Recebimento ${order.orderNumber} (${vehName} - ${clientName})`,
      amount: order.netTotal,
      dueDate: today,
      paymentDate: isPaid ? today : undefined,
      status: isPaid ? 'pago' : 'pendente',
      serviceOrderId: order.id,
      paymentMethod,
      createdAt: now,
    };

    StorageService.saveTransaction(newTx);
    setTransactions(StorageService.getTransactions());

    // Memoriza os serviços preventivos para retorno do cliente
    if (vehicle) {
      order.services.forEach((s) => {
        const mRec = PreventiveMaintenanceService.createMaintenanceRecord(updatedOrder, s.description, vehicle);
        StorageService.saveMaintenanceRecord(mRec);
      });
      setMaintenanceRecords(StorageService.getMaintenanceRecords());
    }
  };

  const handlePrintReceipt = (order: ServiceOrder) => {
    setReceiptOrder(order);
    setIsReceiptModalOpen(true);
  };

  // Ações de Compras de Fornecedores & Parcelas
  const handleSavePurchase = (purchase: SupplierPurchase) => {
    StorageService.savePurchase(purchase);
    setPurchases(StorageService.getPurchases());
    setTransactions(StorageService.getTransactions());
  };

  const handleDeletePurchase = (id: string) => {
    StorageService.deletePurchase(id);
    setPurchases(StorageService.getPurchases());
    setTransactions(StorageService.getTransactions());
  };

  const handlePayPurchaseInstallment = (purchaseId: string, installmentNumber: number, customPaidDate?: string) => {
    StorageService.payPurchaseInstallment(purchaseId, installmentNumber, customPaidDate);
    setPurchases(StorageService.getPurchases());
    setTransactions(StorageService.getTransactions());
  };

  // Ações de Peças & XML
  const handleSavePart = (part: Part) => {
    StorageService.savePart(part);
    setParts(StorageService.getParts());
  };

  const handleBulkImportParts = (newParts: Part[], invoiceInfo?: ParsedXMLInvoice) => {
    StorageService.bulkUpsertParts(newParts);
    setParts(StorageService.getParts());

    // Registra a compra e a conta a pagar se for importação via NF-e XML
    if (invoiceInfo) {
      const purchaseId = 'pur-' + Date.now();
      const firstDue = invoiceInfo.firstDueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const instCount = invoiceInfo.installmentsCount || 2;
      const installmentAmount = Number((invoiceInfo.totalValue / instCount).toFixed(2));

      const installments = Array.from({ length: instCount }).map((_, idx) => {
        const due = new Date(new Date(firstDue).getTime() + idx * 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        return {
          id: `inst-${purchaseId}-${idx + 1}`,
          installmentNumber: idx + 1,
          totalInstallments: instCount,
          amount: installmentAmount,
          dueDate: due,
          status: 'pendente' as const,
        };
      });

      const newPurchase: SupplierPurchase = {
        id: purchaseId,
        nfeNumber: invoiceInfo.nfeNumber,
        supplierName: invoiceInfo.supplierName,
        supplierCnpj: invoiceInfo.supplierCnpj,
        issueDate: invoiceInfo.issueDate || new Date().toISOString().split('T')[0],
        totalValue: invoiceInfo.totalValue,
        itemsCount: invoiceInfo.items?.length || newParts.length,
        paidInstallmentsCount: 0,
        totalInstallmentsCount: instCount,
        paidAmount: 0,
        remainingAmount: invoiceInfo.totalValue,
        firstDueDate: firstDue,
        lastDueDate: installments[installments.length - 1].dueDate,
        status: 'pendente',
        partCodes: newParts.map((p) => p.code),
        installments,
        createdAt: new Date().toISOString(),
      };

      StorageService.savePurchase(newPurchase);
      setPurchases(StorageService.getPurchases());

      // Registra despesa financeira na categoria Peças
      const newExpense: FinancialTransaction = {
        id: 'trx-' + Date.now(),
        type: 'despesa',
        category: 'Peças',
        description: `Boleto ${invoiceInfo.supplierName} - NF-e ${invoiceInfo.nfeNumber}`,
        amount: invoiceInfo.totalValue,
        dueDate: firstDue,
        status: 'pendente',
        supplierPurchaseId: purchaseId,
        installmentInfo: `Parcela 1/${instCount}`,
        createdAt: new Date().toISOString(),
      };
      StorageService.saveTransaction(newExpense);
      setTransactions(StorageService.getTransactions());
    }
  };

  const handleDeletePart = (id: string) => {
    StorageService.deletePart(id);
    setParts(StorageService.getParts());
  };

  // Ações de Clientes & Veículos
  const handleSaveClient = (client: Client, newVehicle?: Vehicle) => {
    StorageService.saveClient(client);
    if (newVehicle) {
      StorageService.saveVehicle(newVehicle);
      setVehicles(StorageService.getVehicles());
    }
    setClients(StorageService.getClients());
  };

  const handleSaveVehicle = (vehicle: Vehicle) => {
    StorageService.saveVehicle(vehicle);
    setVehicles(StorageService.getVehicles());
  };

  const handleDeleteClient = (id: string) => {
    StorageService.deleteClient(id);
    setClients(StorageService.getClients());
  };

  // Ações Financeiras
  const handleSaveTransaction = (tx: FinancialTransaction) => {
    StorageService.saveTransaction(tx);
    setTransactions(StorageService.getTransactions());
  };

  const handleDeleteTransaction = (id: string) => {
    StorageService.deleteTransaction(id);
    setTransactions(StorageService.getTransactions());
  };

  // Ações de Manutenção Preventiva & Retorno
  const handleSaveMaintenanceRecord = (record: MaintenanceRecord) => {
    StorageService.saveMaintenanceRecord(record);
    setMaintenanceRecords(StorageService.getMaintenanceRecords());
  };

  const handleDeleteMaintenanceRecord = (id: string) => {
    StorageService.deleteMaintenanceRecord(id);
    setMaintenanceRecords(StorageService.getMaintenanceRecords());
  };

  const handleUpdateContactStatus = (
    recordIds: string[],
    contactStatus: 'pendente' | 'avisado' | 'agendado'
  ) => {
    StorageService.updateMaintenanceContactStatus(recordIds, contactStatus);
    setMaintenanceRecords(StorageService.getMaintenanceRecords());
  };

  const handleOpenNewOrderFromAlert = (
    vehicle: Vehicle,
    client: Client,
    serviceNames: string[]
  ) => {
    const draftServices = serviceNames.map((svcName) => {
      const matched = services.find((s) => s.name.toLowerCase().includes(svcName.toLowerCase()));
      const price = matched?.standardPrice || 160;
      return {
        id: 'os-svc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        serviceId: matched?.id,
        description: svcName,
        mechanicId: mechanics[0]?.id || '',
        price,
        commissionRate: 15,
        commissionValue: price * 0.15,
      };
    });

    const servicesTotal = draftServices.reduce((acc, s) => acc + s.price, 0);
    const mechanicsCommissionTotal = draftServices.reduce((acc, s) => acc + s.commissionValue, 0);
    const netTotal = servicesTotal;
    const netProfit = netTotal - mechanicsCommissionTotal;
    const profitMarginPercent = netTotal > 0 ? (netProfit / netTotal) * 100 : 0;

    const draftOrder: ServiceOrder = {
      id: '',
      orderNumber: `OS-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: client.id,
      vehicleId: vehicle.id,
      mechanicId: mechanics[0]?.id || '',
      status: 'orcamento',
      complaintDescription: `Revisão Preventiva Recomendada: ${serviceNames.join(' + ')}`,
      technicalDiagnostic: `Cliente retornou para realização de manutenção preventiva periódica (${serviceNames.join(', ')}).`,
      checklist: {
        mileage: vehicle.mileage || 50000,
        fuelLevel: 50,
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
      parts: [],
      services: draftServices,
      partsTotal: 0,
      servicesTotal,
      grossTotal: servicesTotal,
      discount: 0,
      netTotal,
      partsCostTotal: 0,
      mechanicsCommissionTotal,
      netProfit,
      profitMarginPercent,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingOrder(draftOrder);
    setIsOrderModalOpen(true);
  };

  const handleOpenNewOrderForVehicle = (client: Client, vehicle: Vehicle) => {
    const draftOrder: ServiceOrder = {
      id: '',
      orderNumber: `OS-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: client.id,
      vehicleId: vehicle.id,
      mechanicId: mechanics[0]?.id || '',
      status: 'orcamento',
      complaintDescription: `Atendimento / Revisão para ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
      technicalDiagnostic: '',
      checklist: {
        mileage: vehicle.mileage || 50000,
        fuelLevel: 50,
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
      parts: [],
      services: [],
      partsTotal: 0,
      servicesTotal: 0,
      grossTotal: 0,
      discount: 0,
      netTotal: 0,
      partsCostTotal: 0,
      mechanicsCommissionTotal: 0,
      netProfit: 0,
      profitMarginPercent: 0,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingOrder(draftOrder);
    setIsOrderModalOpen(true);
  };

  const handleSchedulePreventive = (
    order: ServiceOrder,
    vehicle?: Vehicle,
    client?: Client,
    observation?: string
  ) => {
    if (!vehicle || !client) return;

    const obsText = observation || order.technicalDiagnostic || order.complaintDescription;
    const serviceType = PreventiveMaintenanceService.detectServiceType(obsText);
    const serviceName =
      obsText.includes('Pastilha') || obsText.includes('freio')
        ? 'Revisão de Pastilhas de Freio / Óleo'
        : 'Revisão Preventiva (Retorno de O.S.)';

    const today = new Date().toISOString().split('T')[0];
    const profile = vehicle.usageProfile || 'normal';
    const params = PreventiveMaintenanceService.getIntervalParams(
      serviceType,
      profile,
      vehicle.averageMonthlyKm
    );

    const baseDate = new Date();
    const returnDateObj = new Date(baseDate.getTime() + params.intervalDays * 24 * 60 * 60 * 1000);
    const estimatedReturnDate = returnDateObj.toISOString().split('T')[0];
    const currentMileage = order.checklist?.mileage || vehicle.mileage || 50000;
    const estimatedReturnMileage = currentMileage + params.intervalKm;

    const newRecord: MaintenanceRecord = {
      id: 'mrec-' + Date.now(),
      serviceOrderId: order.id,
      vehicleId: vehicle.id,
      clientId: client.id,
      serviceType,
      serviceName,
      completedDate: today,
      mileageAtService: currentMileage,
      usageProfile: profile,
      estimatedReturnDate,
      estimatedReturnMileage,
      intervalMonths: params.intervalMonths,
      intervalKm: params.intervalKm,
      notes: `Alerta gerado a partir do prontuário da ${order.orderNumber}: ${obsText}`,
      contactStatus: 'pendente',
    };

    StorageService.saveMaintenanceRecord(newRecord);
    setMaintenanceRecords(StorageService.getMaintenanceRecords());
    setActiveTab('maintenance');
  };

  const handleUpdateOrderDiagnostic = (orderId: string, diagnostic: string) => {
    StorageService.updateOrderDiagnostic(orderId, diagnostic);
    setOrders(StorageService.getOrders());
  };

  // Backup & Reset
  const handleResetData = () => {
    if (window.confirm('Deseja recarregar os dados de demonstração da oficina?')) {
      StorageService.resetToDefault();
      loadAllData();
    }
  };

  const handleExportData = () => {
    const json = StorageService.exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-oficina-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Header Principal */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewOrder={handleOpenNewOrder}
        carsInShopCount={carsInShopCount}
        totalOrdersCount={orders.length}
        pendingAlertsCount={pendingAlertsCount}
        onResetData={handleResetData}
        onExportData={handleExportData}
      />

      {/* Conteúdo Principal da Aba Ativa */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            orders={orders}
            parts={parts}
            clients={clients}
            vehicles={vehicles}
            purchases={purchases}
            onOpenOrder={handleOpenExistingOrder}
            onNavigateTab={setActiveTab}
            onNewOrder={handleOpenNewOrder}
            onPayPurchaseInstallment={handlePayPurchaseInstallment}
          />
        )}

        {activeTab === 'orders' && (
          <KanbanBoard
            orders={orders}
            clients={clients}
            vehicles={vehicles}
            mechanics={mechanics}
            onOpenOrder={handleOpenExistingOrder}
            onNewOrder={handleOpenNewOrder}
            onUpdateStatus={handleUpdateOrderStatus}
            onPrintReceipt={handlePrintReceipt}
            onQuickCheckout={handleQuickCheckout}
          />
        )}

        {activeTab === 'parts' && (
          <PartsInventoryView
            parts={parts}
            purchases={purchases}
            onSavePart={handleSavePart}
            onBulkImportParts={handleBulkImportParts}
            onDeletePart={handleDeletePart}
            onSavePurchase={handleSavePurchase}
            onDeletePurchase={handleDeletePurchase}
            onPayPurchaseInstallment={handlePayPurchaseInstallment}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsView
            clients={clients}
            vehicles={vehicles}
            orders={orders}
            onSaveClient={handleSaveClient}
            onSaveVehicle={handleSaveVehicle}
            onDeleteClient={handleDeleteClient}
            onOpenOrder={handleOpenExistingOrder}
            onNewOrderForVehicle={handleOpenNewOrderForVehicle}
            onSchedulePreventive={handleSchedulePreventive}
            onUpdateOrderDiagnostic={handleUpdateOrderDiagnostic}
          />
        )}

        {activeTab === 'financial' && (
          <FinancialView
            transactions={transactions}
            mechanics={mechanics}
            orders={orders}
            onSaveTransaction={handleSaveTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'maintenance' && (
          <PreventiveMaintenanceView
            records={maintenanceRecords}
            vehicles={vehicles}
            clients={clients}
            onSaveRecord={handleSaveMaintenanceRecord}
            onDeleteRecord={handleDeleteMaintenanceRecord}
            onUpdateContactStatus={handleUpdateContactStatus}
            onOpenNewOrderFromAlert={handleOpenNewOrderFromAlert}
          />
        )}
      </main>

      {/* Modal de Nova/Editar Ordem de Serviço */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
        }}
        order={editingOrder}
        orders={orders}
        onSave={handleSaveOrder}
        clients={clients}
        vehicles={vehicles}
        mechanics={mechanics}
        availableParts={parts}
        availableServices={services}
        onPrintReceipt={handlePrintReceipt}
        onQuickCheckout={handleQuickCheckout}
        onSaveClient={handleSaveClient}
        onSaveVehicle={handleSaveVehicle}
      />

      {/* Modal de Impressão de Recibo / OS */}
      <ReceiptPrintModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setReceiptOrder(null);
        }}
        order={receiptOrder}
        clients={clients}
        vehicles={vehicles}
        mechanics={mechanics}
      />
    </div>
  );
};

export default App;
