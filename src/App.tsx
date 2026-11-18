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
  };

  // Contagem de carros no pátio (ativos)
  const carsInShopCount = orders.filter(
    (o) => o.status !== 'finalizado' && o.status !== 'cancelado'
  ).length;

  // Contagem de alertas pendentes de manutenção preventiva (1 dia e 7 dias)
  const pendingAlertsCount = PreventiveMaintenanceService.calculateAlerts(
    maintenanceRecords,
    vehicles,
    clients
  ).filter((a) => a.status === 'urgente_1dia' || a.status === 'alerta_7dias').length;

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

    const updated: ServiceOrder = {
      ...order,
      status: newStatus,
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

  const handlePrintReceipt = (order: ServiceOrder) => {
    setReceiptOrder(order);
    setIsReceiptModalOpen(true);
  };

  // Ações de Peças & XML
  const handleSavePart = (part: Part) => {
    StorageService.savePart(part);
    setParts(StorageService.getParts());
  };

  const handleBulkImportParts = (newParts: Part[], invoiceInfo?: ParsedXMLInvoice) => {
    StorageService.bulkUpsertParts(newParts);
    setParts(StorageService.getParts());

    // Registra a conta a pagar se for importação via NF-e XML
    if (invoiceInfo) {
      const newExpense: FinancialTransaction = {
        id: 'trx-' + Date.now(),
        type: 'despesa',
        category: 'Fornecedor de Autopeças',
        description: `NF-e ${invoiceInfo.nfeNumber} - ${invoiceInfo.supplierName}`,
        amount: invoiceInfo.totalValue,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 dias para pagar
        status: 'pendente',
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
            onOpenOrder={handleOpenExistingOrder}
            onNavigateTab={setActiveTab}
            onNewOrder={handleOpenNewOrder}
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
          />
        )}

        {activeTab === 'parts' && (
          <PartsInventoryView
            parts={parts}
            onSavePart={handleSavePart}
            onBulkImportParts={handleBulkImportParts}
            onDeletePart={handleDeletePart}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsView
            clients={clients}
            vehicles={vehicles}
            orders={orders}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            onOpenOrder={handleOpenExistingOrder}
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
        onSave={handleSaveOrder}
        clients={clients}
        vehicles={vehicles}
        mechanics={mechanics}
        availableParts={parts}
        availableServices={services}
        onPrintReceipt={handlePrintReceipt}
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
