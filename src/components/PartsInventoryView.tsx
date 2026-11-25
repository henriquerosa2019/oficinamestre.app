import React, { useState, useMemo } from 'react';
import { Part, ParsedXMLInvoice, SupplierPurchase, SupplierPaymentTerm, PurchaseInstallment } from '../types';
import {
  Package,
  Plus,
  Search,
  UploadCloud,
  FileCode,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  Eye,
  Check,
  CheckCircle,
  Filter,
  FileText,
  Truck,
  Phone,
  MapPin,
} from 'lucide-react';
import { XMLParserService } from '../services/xmlParser';
import { ExcelParserService, ParsedExcelRow } from '../services/excelParser';
import {
  getPurchaseDueAnalysis,
  filterPurchasesByDue,
  formatDatePtBR,
  InvoiceDueFilter,
} from '../utils/invoiceAlerts';
import { SupplierInvoicesReportModal } from './SupplierInvoicesReportModal';

interface PartsInventoryViewProps {
  parts: Part[];
  purchases?: SupplierPurchase[];
  onSavePart: (part: Part) => void;
  onBulkImportParts: (newParts: Part[], invoiceInfo?: ParsedXMLInvoice) => void;
  onDeletePart: (id: string) => void;
  onSavePurchase?: (purchase: SupplierPurchase) => void;
  onDeletePurchase?: (id: string) => void;
  onPayPurchaseInstallment?: (
    purchaseId: string,
    installmentNumber: number,
    customPaidDate?: string
  ) => void;
}

export const PartsInventoryView: React.FC<PartsInventoryViewProps> = ({
  parts,
  purchases = [],
  onSavePart,
  onBulkImportParts,
  onDeletePart,
  onSavePurchase,
  onDeletePurchase,
  onPayPurchaseInstallment,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'parts' | 'purchases'>('parts');
  const [selectedPurchase, setSelectedPurchase] = useState<SupplierPurchase | null>(null);
  const [isPurchaseDetailsOpen, setIsPurchaseDetailsOpen] = useState(false);
  const [dueFilter, setDueFilter] = useState<InvoiceDueFilter>('todas');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [installmentCustomDates, setInstallmentCustomDates] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'critical' | 'zero'>('all');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modais
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [createPurchaseRecord, setCreatePurchaseRecord] = useState(true);

  // Estados do Importador XML
  const [parsedInvoice, setParsedInvoice] = useState<ParsedXMLInvoice | null>(null);
  const [xmlError, setXmlError] = useState('');
  const [markupPercent, setMarkupPercent] = useState(65); // Margem padrão de 65% na oficina

  // Estados do Importador Excel
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [parsedExcelRows, setParsedExcelRows] = useState<ParsedExcelRow[] | null>(null);
  const [excelError, setExcelError] = useState('');

  // Filtros
  const categories = Array.from(new Set(parts.map((p) => p.category)));

  // Lista única de Fornecedores e Notas Fiscais para filtro rápido
  const supplierInvoices = useMemo(() => {
    const map = new Map<string, { key: string; label: string; supplier: string; invoice: string; count: number }>();
    parts.forEach((p) => {
      if (p.lastInvoiceNumber || p.supplierName) {
        const key = p.lastInvoiceNumber || p.supplierName || '';
        const displayLabel = p.lastInvoiceNumber && p.supplierName 
          ? `${p.lastInvoiceNumber} • ${p.supplierName}` 
          : p.lastInvoiceNumber || p.supplierName || '';
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, {
            key,
            label: displayLabel,
            supplier: p.supplierName || '',
            invoice: p.lastInvoiceNumber || '',
            count: 1,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [parts]);

  // Métricas do estoque (Imobilizado, Preço de venda, Retorno potencial e itens críticos)
  const stockMetrics = useMemo(() => {
    let totalPhysicalUnits = 0;
    let totalCost = 0;
    let totalSell = 0;
    let zeroCount = 0;
    let criticalCount = 0;

    parts.forEach((p) => {
      totalPhysicalUnits += p.currentStock;
      totalCost += p.costPrice * p.currentStock;
      totalSell += p.sellPrice * p.currentStock;
      if (p.currentStock === 0) zeroCount++;
      else if (p.currentStock <= p.minStock) criticalCount++;
    });

    const potentialGain = totalSell - totalCost;
    const averageMarkup = totalCost > 0 ? (potentialGain / totalCost) * 100 : 0;

    return {
      totalPhysicalUnits,
      totalCost,
      totalSell,
      potentialGain,
      averageMarkup,
      zeroCount,
      criticalCount,
      totalCritical: zeroCount + criticalCount,
    };
  }, [parts]);

  // Ajuste rápido de quantidade (+ / -) direto na tabela
  const handleQuickAdjustStock = (part: Part, delta: number) => {
    const newStock = Math.max(0, part.currentStock + delta);
    onSavePart({
      ...part,
      currentStock: newStock,
    });
  };

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const s = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        part.description.toLowerCase().includes(s) ||
        part.code.toLowerCase().includes(s) ||
        part.brand.toLowerCase().includes(s) ||
        (part.sku && part.sku.toLowerCase().includes(s)) ||
        (part.supplierName && part.supplierName.toLowerCase().includes(s)) ||
        (part.lastInvoiceNumber && part.lastInvoiceNumber.toLowerCase().includes(s)) ||
        (part.location && part.location.toLowerCase().includes(s));

      const matchesCategory = !categoryFilter || part.category === categoryFilter;

      let matchesStock = true;
      if (stockStatusFilter === 'critical') {
        matchesStock = part.currentStock <= part.minStock;
      } else if (stockStatusFilter === 'zero') {
        matchesStock = part.currentStock === 0;
      }

      let matchesSupplier = true;
      if (supplierFilter) {
        matchesSupplier =
          part.lastInvoiceNumber === supplierFilter ||
          part.supplierName === supplierFilter ||
          Boolean(part.lastInvoiceNumber && part.lastInvoiceNumber.includes(supplierFilter)) ||
          Boolean(part.supplierName && part.supplierName.includes(supplierFilter));
      }

      return matchesSearch && matchesCategory && matchesStock && matchesSupplier;
    });
  }, [parts, searchTerm, categoryFilter, stockStatusFilter, supplierFilter]);

  // Processar arquivo XML enviado pelo usuário
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = XMLParserService.parseNFeXML(text, markupPercent);
        setParsedInvoice(parsed);
        setXmlError('');
      } catch (err: any) {
        setXmlError(err.message || 'Erro ao processar arquivo XML.');
      }
    };
    reader.readAsText(file);
  };

  // Carregar XML de demonstração (DPaschoal / Pellegrino)
  const handleLoadSampleXml = () => {
    const sample = XMLParserService.getSampleInvoiceXML();
    try {
      const parsed = XMLParserService.parseNFeXML(sample, markupPercent);
      setParsedInvoice(parsed);
      setXmlError('');
    } catch (err: any) {
      setXmlError(err.message);
    }
  };

  // Re-calcular preço sugerido quando muda a margem
  const handleMarkupChange = (newMarkup: number) => {
    setMarkupPercent(newMarkup);
    if (!parsedInvoice) return;

    const updatedItems = parsedInvoice.items.map((item) => {
      const suggestedSellPrice = Math.round(item.unitCost * (1 + newMarkup / 100) * 100) / 100;
      return { ...item, suggestedSellPrice };
    });

    setParsedInvoice({ ...parsedInvoice, items: updatedItems });
  };

  // Confirmar a importação para o estoque
  const handleConfirmXmlImport = () => {
    if (!parsedInvoice) return;

    const newParts: Part[] = parsedInvoice.items.map((item) => ({
      id: 'part-' + Math.random().toString(36).substring(2, 9),
      sku: item.code,
      code: item.code,
      description: item.description,
      brand: parsedInvoice.supplierName.split(' ')[0] || 'Genérica',
      category: 'Entrada XML',
      costPrice: item.unitCost,
      sellPrice: item.suggestedSellPrice,
      currentStock: item.quantity,
      minStock: 2,
      unit: 'UN',
      location: 'Estoque Central',
      supplierName: parsedInvoice.supplierName,
      lastInvoiceNumber: parsedInvoice.nfeNumber ? `NF-e ${parsedInvoice.nfeNumber}` : undefined,
      supplierPaymentTerms: '30_60d',
    }));

    onBulkImportParts(newParts, parsedInvoice);
    setIsXmlModalOpen(false);
    setParsedInvoice(null);
  };

  // Handlers do Importador Excel
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const rows = ExcelParserService.parseExcelFile(buffer);
        setParsedExcelRows(rows);
        setExcelError('');
      } catch (err: any) {
        setExcelError(err.message || 'Erro ao processar planilha Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLoadSampleExcel = () => {
    const sample = ExcelParserService.getSampleExcelRows();
    setParsedExcelRows(sample);
    setExcelError('');
  };

  const handleConfirmExcelImport = () => {
    if (!parsedExcelRows) return;
    const newParts = ExcelParserService.convertToParts(parsedExcelRows);
    onBulkImportParts(newParts);
    setIsExcelModalOpen(false);
    setParsedExcelRows(null);
  };

  // Salvar peça manual
  const handleSaveManualPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    // Se informou fornecedor, custo e marcou para registrar conta a pagar
    if (
      createPurchaseRecord &&
      editingPart.supplierName?.trim() &&
      editingPart.costPrice > 0 &&
      onSavePurchase
    ) {
      const purchaseId = 'pur-' + Date.now();
      const totalVal = Number(
        (editingPart.costPrice * (editingPart.currentStock || 1)).toFixed(2)
      );
      const term: SupplierPaymentTerm = editingPart.supplierPaymentTerms || '30d';

      let instCount = 1;
      let offsets = [30];
      if (term === 'a_vista') {
        instCount = 1;
        offsets = [0];
      } else if (term === '30d') {
        instCount = 1;
        offsets = [30];
      } else if (term === '30_60d') {
        instCount = 2;
        offsets = [30, 60];
      } else if (term === '30_60_90d') {
        instCount = 3;
        offsets = [30, 60, 90];
      }

      const instAmount = Number((totalVal / instCount).toFixed(2));
      const now = Date.now();
      const installments: PurchaseInstallment[] = offsets.map((off, idx) => {
        const due = new Date(now + off * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return {
          id: `inst-${purchaseId}-${idx + 1}`,
          installmentNumber: idx + 1,
          totalInstallments: instCount,
          amount:
            idx === instCount - 1
              ? Number((totalVal - instAmount * (instCount - 1)).toFixed(2))
              : instAmount,
          dueDate: due,
          status: term === 'a_vista' ? 'pago' : 'pendente',
          paidAt: term === 'a_vista' ? new Date().toISOString() : undefined,
        };
      });

      const purchase: SupplierPurchase = {
        id: purchaseId,
        nfeNumber: editingPart.lastInvoiceNumber || `PED-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierName: editingPart.supplierName.trim(),
        issueDate: new Date().toISOString().split('T')[0],
        totalValue: totalVal,
        itemsCount: 1,
        paymentMethod: term === 'a_vista' ? 'pix' : 'a_prazo',
        paidInstallmentsCount: term === 'a_vista' ? 1 : 0,
        totalInstallmentsCount: instCount,
        paidAmount: term === 'a_vista' ? totalVal : 0,
        remainingAmount: term === 'a_vista' ? 0 : totalVal,
        firstDueDate: installments[0].dueDate,
        lastDueDate: installments[installments.length - 1].dueDate,
        status: term === 'a_vista' ? 'quitado' : 'pendente',
        partCodes: [editingPart.code],
        installments,
        notes: `Entrada de ${editingPart.currentStock || 1} un de ${editingPart.description}. Tel: ${editingPart.supplierPhone || 'N/A'}. End: ${editingPart.supplierAddress || 'N/A'}. Condição: ${term}`,
        createdAt: new Date().toISOString(),
      };

      onSavePurchase(purchase);
      editingPart.purchaseId = purchaseId;
    }

    onSavePart(editingPart);
    setIsEditModalOpen(false);
    setEditingPart(null);
  };

  // Cálculos de Compras de Fornecedores
  const totalCompras = purchases.reduce((acc, p) => acc + p.totalValue, 0);
  const totalQuitado = purchases.reduce((acc, p) => acc + p.paidAmount, 0);
  const saldoAPagar = purchases.reduce((acc, p) => acc + p.remainingAmount, 0);

  const allPendingInstallments = purchases
    .flatMap((p) => p.installments.map((i) => ({ ...i, purchase: p })))
    .filter((i) => i.status === 'pendente')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const proximoVencimento = allPendingInstallments[0];

  return (
    <div className="space-y-4">
      {/* Abas Superiores de Estoque: Catálogo vs Compras & Notas de Fornecedores */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('parts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'parts'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catálogo de Peças</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSubTab === 'parts' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {parts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'purchases'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Compras & Notas de Fornecedores</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSubTab === 'purchases' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {purchases.length}
          </span>
        </button>
      </div>

      {activeSubTab === 'parts' ? (
        <>
          {/* Resumo do Estoque Físico & Capital Imobilizado */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Card 1: Unidades Físicas & Alertas */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  Estoque Físico Total
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {parts.length} SKUs
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm sm:text-base font-black text-white font-mono">
                  {stockMetrics.totalPhysicalUnits} <span className="text-xs font-normal text-slate-400">unidades</span>
                </span>
                {stockMetrics.totalCritical > 0 && (
                  <button
                    type="button"
                    onClick={() => setStockStatusFilter(stockStatusFilter === 'critical' ? 'all' : 'critical')}
                    className="text-[10px] font-bold text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                    title="Filtrar itens que precisam de reposição"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    {stockMetrics.zeroCount > 0 ? `${stockMetrics.zeroCount} zerados` : ''}
                    {stockMetrics.criticalCount > 0 ? ` • ${stockMetrics.criticalCount} baixos` : ''}
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: Valor Imobilizado (Custo) */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                  Imobilizado a Custo
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Investimento</span>
              </div>
              <div className="mt-2">
                <span className="text-sm sm:text-base font-black text-white font-mono">
                  R$ {stockMetrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Card 3: Preço de Venda Total */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Preço de Venda Total
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Retorno bruto</span>
              </div>
              <div className="mt-2">
                <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                  R$ {stockMetrics.totalSell.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Card 4: Ganho Bruto Potencial com Markup Médio */}
            <div className="bg-slate-900 border border-amber-500/30 p-3 rounded-xl bg-gradient-to-br from-slate-900 to-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  Ganho Bruto Potencial
                </span>
                <span
                  className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-1.5 py-0.2 rounded border border-emerald-500/40"
                  title="Markup médio sobre o custo total do estoque"
                >
                  +{stockMetrics.averageMarkup.toFixed(1)}% mkp
                </span>
              </div>
              <div className="mt-2">
                <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                  R$ {stockMetrics.potentialGain.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Ações & Filtros */}
          <div className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-3">
            {/* Linha 1: Busca, Categoria, NF-e/Fornecedor e Ações */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {/* Busca Textual */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar peça por código, descrição, marca ou NF-e..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filtro por Categoria */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Todas Categorias ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Filtro por NF-e / Fornecedor */}
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                  title="Filtrar por Nota Fiscal de Entrada ou Fornecedor"
                >
                  <option value="">Todas NF-e / Fornecedores</option>
                  {supplierInvoices.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label} ({s.count} itens)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botão Importar Planilha Excel */}
                <button
                  type="button"
                  onClick={() => setIsExcelModalOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02]"
                >
                  <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                  Importar Excel (.xlsx)
                </button>

                {/* Botão Importar XML Destacado */}
                <button
                  type="button"
                  onClick={() => setIsXmlModalOpen(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02]"
                >
                  <UploadCloud className="w-4 h-4 stroke-[2.5]" />
                  Importar XML (NF-e)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingPart({
                      id: 'part-' + Date.now(),
                      sku: '',
                      code: '',
                      description: '',
                      brand: '',
                      category: 'Geral',
                      costPrice: 0,
                      sellPrice: 0,
                      currentStock: 1,
                      minStock: 2,
                      unit: 'UN',
                      location: 'Prateleira A1',
                      supplierName: '',
                      supplierPhone: '',
                      supplierAddress: '',
                      supplierPaymentTerms: '30d',
                    });
                    setCreatePurchaseRecord(true);
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-lg text-xs border border-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Peça
                </button>
              </div>
            </div>

            {/* Linha 2: Filtros Rápidos de Situação de Estoque */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-1 bg-slate-800/70 p-1 rounded-lg border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('all')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    stockStatusFilter === 'all'
                      ? 'bg-slate-700 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todas as Peças ({parts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('critical')}
                  className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                    stockStatusFilter === 'critical'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                  title="Mostrar apenas peças zeradas ou abaixo do estoque mínimo"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Apenas Zerados / Baixos ({stockMetrics.totalCritical})
                </button>
                {stockMetrics.zeroCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStockStatusFilter('zero')}
                    className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      stockStatusFilter === 'zero'
                        ? 'bg-red-500 text-white font-bold shadow-sm'
                        : 'text-red-400 hover:text-red-300'
                    }`}
                    title="Mostrar apenas peças com estoque zerado"
                  >
                    Estoque Zerado ({stockMetrics.zeroCount})
                  </button>
                )}
              </div>

              {(searchTerm || categoryFilter || supplierFilter || stockStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('');
                    setSupplierFilter('');
                    setStockStatusFilter('all');
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
                >
                  Limpar filtros ({filteredParts.length} de {parts.length} exibidos)
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Peças */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Código / SKU</th>
                    <th className="py-3 px-4">Descrição da Peça</th>
                    <th className="py-3 px-4">Marca / Categoria</th>
                    <th className="py-3 px-4 text-right">Preço de Custo</th>
                    <th className="py-3 px-4 text-right">Preço de Venda</th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span>Markup / Margem</span>
                        <span className="text-[9px] text-slate-500 font-normal lowercase tracking-normal" title="Markup sobre o custo • Margem real sobre o preço de venda">
                          (mkp s/ custo • mg s/ venda)
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">Estoque Atual</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        Nenhuma peça encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part) => {
                      const isLow = part.currentStock <= part.minStock;
                      const isZero = part.currentStock === 0;
                      const markupVal =
                        part.costPrice > 0 ? ((part.sellPrice - part.costPrice) / part.costPrice) * 100 : 0;
                      const grossMarginVal =
                        part.sellPrice > 0 ? ((part.sellPrice - part.costPrice) / part.sellPrice) * 100 : 0;

                      return (
                        <tr
                          key={part.id}
                          className={`hover:bg-slate-800/60 transition-colors ${
                            isZero ? 'bg-red-500/[0.04]' : isLow ? 'bg-amber-500/[0.02]' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {part.code || part.sku}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{part.description}</span>
                              {isZero && (
                                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                                  Zerado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {part.supplierName && (
                                <button
                                  type="button"
                                  onClick={() => setSupplierFilter(part.lastInvoiceNumber || part.supplierName || '')}
                                  className="text-[10px] text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 px-1.5 py-0.5 rounded font-mono font-medium transition-colors flex items-center gap-1"
                                  title={`Fornecedor: ${part.supplierName}${part.supplierAddress ? ` | End: ${part.supplierAddress}` : ''}${part.supplierPhone ? ` | Tel: ${part.supplierPhone}` : ''}`}
                                >
                                  <Truck className="w-3 h-3 text-purple-400" />
                                  <span>{part.supplierName} {part.lastInvoiceNumber ? `• ${part.lastInvoiceNumber}` : ''}</span>
                                  {part.supplierPhone && (
                                    <span className="text-slate-400">({part.supplierPhone})</span>
                                  )}
                                </button>
                              )}
                              {part.supplierPaymentTerms && (
                                <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                                  {part.supplierPaymentTerms === 'a_vista'
                                    ? 'À Vista'
                                    : part.supplierPaymentTerms === '30d'
                                    ? '30 d'
                                    : part.supplierPaymentTerms === '30_60d'
                                    ? '30/60d'
                                    : '30/60/90d'}
                                </span>
                              )}
                              {part.location && (
                                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
                                  Loc: {part.location}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            <span className="text-slate-200 font-medium">{part.brand}</span>
                            <div className="text-[10px] text-slate-500">{part.category}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            R$ {part.costPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-white">
                            R$ {part.sellPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="font-mono">
                              <span
                                className="text-[11px] font-bold text-emerald-400 block"
                                title={`Markup sobre custo: +${markupVal.toFixed(1)}%`}
                              >
                                +{markupVal.toFixed(0)}% <span className="text-[9px] text-slate-500 font-normal">mkp</span>
                              </span>
                              <span
                                className="text-[10px] text-slate-400 block"
                                title={`Margem bruta sobre preço de venda: ${grossMarginVal.toFixed(1)}%`}
                              >
                                {grossMarginVal.toFixed(0)}% mg
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {/* Ajuste Rápido de Quantidade (- / +) */}
                            <div className="inline-flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 shadow-inner">
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustStock(part, -1)}
                                disabled={part.currentStock <= 0}
                                className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-black transition-colors"
                                title="Reduzir 1 unidade (baixa rápida de balcão)"
                              >
                                -
                              </button>
                              <span
                                className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs min-w-[42px] text-center ${
                                  isZero
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : isLow
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400'
                                }`}
                                title={
                                  isZero
                                    ? 'Item Zerado! Reposição prioritária'
                                    : isLow
                                    ? `Estoque abaixo do mínimo (${part.minStock})`
                                    : `Estoque regular (Mínimo: ${part.minStock})`
                                }
                              >
                                {part.currentStock} {part.unit}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustStock(part, 1)}
                                className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-black transition-colors"
                                title="Adicionar 1 unidade (entrada rápida de balcão)"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Atalho para Compras / Notas de Fornecedores */}
                              {part.supplierName && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSubTab('purchases');
                                    if (part.supplierName) {
                                      setSearchTerm(part.lastInvoiceNumber || part.supplierName);
                                    }
                                  }}
                                  className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/15 rounded transition-colors"
                                  title={`Ver notas de compra de ${part.supplierName}`}
                                >
                                  <FileCode className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPart(part);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                title="Editar Peça"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeletePart(part.id)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                title="Excluir Peça"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {/* Rodapé com Totais do Estoque */}
                {filteredParts.length > 0 && (
                  <tfoot className="bg-slate-950 border-t border-slate-800 text-xs font-bold text-white">
                    {(() => {
                      const visUnits = filteredParts.reduce((acc, p) => acc + p.currentStock, 0);
                      const visCost = filteredParts.reduce((acc, p) => acc + p.costPrice * p.currentStock, 0);
                      const visSell = filteredParts.reduce((acc, p) => acc + p.sellPrice * p.currentStock, 0);
                      const visGain = visSell - visCost;
                      const visMkp = visCost > 0 ? (visGain / visCost) * 100 : 0;

                      return (
                        <tr>
                          <td colSpan={3} className="py-3 px-4 text-slate-400">
                            Total ({filteredParts.length} SKUs • {visUnits} unidades físicas):
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            R$ {visCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-white">
                            R$ {visSell.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-emerald-400 text-[11px]">
                            +{visMkp.toFixed(0)}% mkp
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-amber-400">
                            {visUnits} un
                          </td>
                          <td></td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      ) : (
        /* VISÃO DE COMPRAS & NOTAS DE FORNECEDORES */
        <div className="space-y-4">
          {/* Métricas de Compras */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total em Compras
              </span>
              <div className="text-xl font-black text-white font-mono mt-1">
                R$ {totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500">{purchases.length} notas cadastradas</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                Total Quitado
              </span>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                R$ {totalQuitado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500">Parcelas já pagas</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                Saldo a Pagar
              </span>
              <div className="text-xl font-black text-amber-400 font-mono mt-1">
                R$ {saldoAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500">A vencer a fornecedores</span>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 bg-gradient-to-br from-slate-900 to-amber-950/20 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block">
                  Próximo Vencimento
                </span>
                {proximoVencimento ? (
                  <div className="mt-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-black text-amber-400 font-mono">
                        {formatDatePtBR(proximoVencimento.dueDate)}
                      </span>
                      <span className="text-base font-black text-white font-mono shrink-0">
                        R$ {proximoVencimento.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                      {proximoVencimento.purchase.supplierName} (Parc. {proximoVencimento.installmentNumber}/{proximoVencimento.totalInstallments})
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-400 mt-1 font-bold">✓ Tudo em dia!</div>
                )}
              </div>
            </div>
          </div>

          {/* Tabela de Compras & Notas de Fornecedores */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Notas Fiscais de Entrada & Parcelas
                </h3>
                <p className="text-[11px] text-slate-400">
                  Gerenciamento inteligente de parcelas e quitação de fornecedores
                </p>
              </div>

              <button
                onClick={() => setIsXmlModalOpen(true)}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Nova NF-e (XML)
              </button>
            </div>

            {/* Barra de Filtros de Vencimento de Notas Fiscais Simplificada & Botão de Relatório */}
            <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  Vencimento:
                </span>
                {[
                  { id: 'todas', label: 'Todas as Notas' },
                  { id: 'vencidas', label: '🚨 Vencidas', highlight: 'text-red-400 font-bold' },
                  { id: 'vence_hoje', label: '⚠️ Vence Hoje', highlight: 'text-amber-400 font-black animate-pulse' },
                  { id: 'em_semana', label: '📅 Próximos 7 dias', highlight: 'text-amber-300 font-bold' },
                  { id: 'quitadas', label: '✓ Quitadas' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDueFilter(f.id as InvoiceDueFilter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      dueFilter === f.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <span className={dueFilter === f.id ? 'text-slate-950 font-black' : (f.highlight || '')}>
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Botão Gerar Relatório ao canto direito da linha */}
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all ml-auto hover:scale-[1.02] active:scale-95"
                title="Gerar Relatório de Vencimentos (Vencidas, Vence Hoje e Próximos 7 Dias)"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Gerar Relatório</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Fornecedor / CNPJ</th>
                    <th className="py-3 px-4">NF-e Nº</th>
                    <th className="py-3 px-4">Emissão</th>
                    <th className="py-3 px-4 text-right">Valor da Nota</th>
                    <th className="py-3 px-4 text-center">Status de Pagamento</th>
                    <th className="py-3 px-4 text-center">Vencimento (1ª e Última)</th>
                    <th className="py-3 px-4 text-center">Próxima Parcela</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(() => {
                    const filteredList = filterPurchasesByDue(purchases, dueFilter);

                    if (filteredList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-slate-500">
                            Nenhuma nota fiscal encontrada para o filtro "{dueFilter}".
                          </td>
                        </tr>
                      );
                    }

                    return filteredList.map(({ purchase, analysis }) => {
                      const nextPending = analysis.nextPendingInstallment;
                      const percentPaid =
                        purchase.totalValue > 0
                          ? (purchase.paidAmount / purchase.totalValue) * 100
                          : 0;
                      const isComplete = analysis.urgency === 'quitado';

                      // Vínculo com peças do estoque
                      const linkedParts = parts.filter(
                        (p) =>
                          p.purchaseId === purchase.id ||
                          (purchase.partCodes && purchase.partCodes.includes(p.code)) ||
                          (p.lastInvoiceNumber && p.lastInvoiceNumber.includes(purchase.nfeNumber))
                      );
                      const lowStockParts = linkedParts.filter((p) => p.currentStock <= p.minStock);

                      return (
                        <tr key={purchase.id} className="hover:bg-slate-800/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{purchase.supplierName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {purchase.supplierCnpj || 'CNPJ não inf.'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-amber-400 block">
                              NF-e {purchase.nfeNumber}
                            </span>
                            {linkedParts.length > 0 && (
                              <div className="mt-1">
                                {lowStockParts.length > 0 ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30"
                                    title={`Atenção: ${lowStockParts.length} peça(s) desta nota estão com estoque baixo ou no limite: ${lowStockParts.map((p) => `${p.code} (${p.currentStock}/${p.minStock} ${p.unit})`).join(', ')}`}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                    {lowStockParts.length} {lowStockParts.length === 1 ? 'item em alerta' : 'itens em alerta'}
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
                                    title={`${linkedParts.length} peça(s) vinculadas com estoque regular`}
                                  >
                                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                                    {linkedParts.length} {linkedParts.length === 1 ? 'item ok' : 'itens ok'}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-[11px] font-mono">
                            {formatDatePtBR(purchase.issueDate)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white">
                            R$ {purchase.totalValue.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isComplete
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : purchase.paidInstallmentsCount > 0
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-red-500/15 text-red-400 border border-red-500/25'
                                }`}
                              >
                                {isComplete
                                  ? 'Quitado'
                                  : `Pago parcela ${purchase.paidInstallmentsCount}/${purchase.totalInstallmentsCount}`}
                              </span>
                              <div className="w-20 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden border border-slate-700">
                                <div
                                  className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                  style={{ width: `${percentPaid}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-300">
                            <div>1ª: {formatDatePtBR(purchase.firstDueDate)}</div>
                            <div className="text-slate-400 text-[10px]">
                              Última: {formatDatePtBR(purchase.lastDueDate)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {nextPending ? (
                              <div className="flex flex-col items-center gap-1 font-mono text-[11px]">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${analysis.badgeClass}`}>
                                  {analysis.badgeLabel}
                                </span>
                                <span className="text-amber-300 font-bold">
                                  {analysis.dueDateFormatted}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Parc. {nextPending.installmentNumber}/{purchase.totalInstallmentsCount}: R$ {nextPending.amount.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-bold">✓ Quitado</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {nextPending && onPayPurchaseInstallment && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPayPurchaseInstallment(purchase.id, nextPending.installmentNumber)
                                  }
                                  className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2 py-1 rounded-lg text-[10px] shadow-sm transition-all active:scale-95"
                                  title={`Pagar parcela ${nextPending.installmentNumber}/${purchase.totalInstallmentsCount} (salva data atual do sistema)`}
                                >
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  Pagar Parc. {nextPending.installmentNumber}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPurchase(purchase);
                                  setIsPurchaseDetailsOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                title="Ver Detalhes, Peças e Informar Data de Pagamento"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {onDeletePurchase && (
                                <button
                                  type="button"
                                  onClick={() => onDeletePurchase(purchase.id)}
                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Excluir Compra"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO DE XML (NF-e) */}
      {isXmlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Importar Nota Fiscal de Entrada (XML)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cadastra ou alimenta o estoque sem digitação manual de notas de distribuidores
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsXmlModalOpen(false);
                  setParsedInvoice(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200">
              {/* Área de Seleção de Arquivo */}
              {!parsedInvoice ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl p-8 text-center transition-colors bg-slate-950/40">
                    <UploadCloud className="w-12 h-12 text-amber-400 mx-auto mb-3 animate-bounce" />
                    <h4 className="text-sm font-bold text-white mb-1">
                      Selecione ou arraste o arquivo .XML da NF-e
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                      Compatível com modelo 55 emitido por qualquer distribuidora de autopeças (DPaschoal, Pellegrino, etc.)
                    </p>
                    <label className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow-md transition-all">
                      <span>Procurar Arquivo XML</span>
                      <input type="file" accept=".xml" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>

                  {xmlError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                      {xmlError}
                    </div>
                  )}

                  {/* Atalho para testar com XML exemplo */}
                  <div className="pt-2 text-center">
                    <p className="text-xs text-slate-500 mb-2">Não tem um arquivo XML de autopeças agora?</p>
                    <button
                      type="button"
                      onClick={handleLoadSampleXml}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold underline underline-offset-4"
                    >
                      Carregar XML de Exemplo (Distribuidora de Peças)
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview dos Itens do XML */
                <div className="space-y-4">
                  {/* Cabeçalho da Nota */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Distribuidora / Fornecedor:</span>
                      <span className="font-bold text-white text-sm">{parsedInvoice.supplierName}</span>
                      <span className="text-slate-500 block">CNPJ: {parsedInvoice.supplierCnpj}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">NF-e Nº:</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        {parsedInvoice.nfeNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Total da Nota:</span>
                      <span className="font-mono font-bold text-white text-sm">
                        R$ {parsedInvoice.totalValue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Controle de Markup / Margem */}
                  <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
                    <div>
                      <span className="font-bold text-white block">Margem de Venda Automática (Markup):</span>
                      <span className="text-slate-400 text-[11px]">
                        Define a margem padrão aplicada sobre o custo para sugerir o preço de venda
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[50, 65, 80, 100].map((mk) => (
                        <button
                          key={mk}
                          type="button"
                          onClick={() => handleMarkupChange(mk)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                            markupPercent === mk
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {mk}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lista de Peças Identificadas */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-300 uppercase mb-2">
                      {parsedInvoice.items.length} Itens Localizados no XML:
                    </h5>
                    <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 max-h-56 overflow-y-auto">
                      {parsedInvoice.items.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-950/40 flex items-center justify-between text-xs">
                          <div className="truncate pr-3">
                            <span className="font-bold text-white block truncate">{item.description}</span>
                            <span className="text-slate-500 text-[11px]">
                              Cód: {item.code} | Quantidade na nota: <strong>{item.quantity} UN</strong>
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-slate-400 text-[11px]">
                              Custo Unit: R$ {item.unitCost.toFixed(2)}
                            </div>
                            <div className="font-bold text-amber-400 font-mono">
                              Venda Sugerida: R$ {item.suggestedSellPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              {parsedInvoice && (
                <button
                  type="button"
                  onClick={() => setParsedInvoice(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Escolher outro XML
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsXmlModalOpen(false);
                    setParsedInvoice(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                {parsedInvoice && (
                  <button
                    type="button"
                    onClick={handleConfirmXmlImport}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg shadow transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar e Alimentar Estoque
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO/EDIÇÃO MANUAL DE PEÇA */}
      {isEditModalOpen && editingPart && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <form onSubmit={handleSaveManualPart}>
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Cadastro de Peça</h3>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Descrição</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Pastilha de Freio Dianteira..."
                    value={editingPart.description}
                    onChange={(e) => setEditingPart({ ...editingPart, description: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Código / Referência</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: N-1238, FCI-1200..."
                      value={editingPart.code}
                      onChange={(e) => setEditingPart({ ...editingPart, code: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Marca</label>
                    <input
                      type="text"
                      placeholder="Ex: Cobreq, Fram, Bosch..."
                      value={editingPart.brand}
                      onChange={(e) => setEditingPart({ ...editingPart, brand: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Preço Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPart.costPrice}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, costPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Preço Venda (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPart.sellPrice}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, sellPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Estoque Atual</label>
                    <input
                      type="number"
                      value={editingPart.currentStock}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, currentStock: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Estoque Mínimo</label>
                    <input
                      type="number"
                      value={editingPart.minStock}
                      onChange={(e) =>
                        setEditingPart({ ...editingPart, minStock: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Localização (Loc. Prateleira)</label>
                    <input
                      type="text"
                      value={editingPart.location || ''}
                      onChange={(e) => setEditingPart({ ...editingPart, location: e.target.value })}
                      placeholder="Ex: Prateleira A1, Gaveta B2..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Unidade</label>
                    <input
                      type="text"
                      value={editingPart.unit || 'UN'}
                      onChange={(e) => setEditingPart({ ...editingPart, unit: e.target.value })}
                      placeholder="UN, L, Jogo, Par..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Seção Fornecedor & Condições de Pagamento */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <Truck className="w-4 h-4" />
                    <span>Dados do Fornecedor & Condição de Pagamento</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Nome do Fornecedor / Distribuidora</label>
                      <input
                        type="text"
                        list="parts-suppliers-datalist"
                        value={editingPart.supplierName || ''}
                        onChange={(e) => setEditingPart({ ...editingPart, supplierName: e.target.value })}
                        placeholder="Ex: DPaschoal, Caninana Autopeças..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <datalist id="parts-suppliers-datalist">
                        {Array.from(new Set(parts.map((p) => p.supplierName).filter(Boolean))).map((s) => (
                          <option key={s} value={s!} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Telefone / WhatsApp do Fornecedor</label>
                      <input
                        type="text"
                        value={editingPart.supplierPhone || ''}
                        onChange={(e) => setEditingPart({ ...editingPart, supplierPhone: e.target.value })}
                        placeholder="(11) 98765-4321"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Endereço do Fornecedor</label>
                    <input
                      type="text"
                      value={editingPart.supplierAddress || ''}
                      onChange={(e) => setEditingPart({ ...editingPart, supplierAddress: e.target.value })}
                      placeholder="Rua, Número, Bairro, Cidade - UF"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 font-semibold">
                      Forma de Pagamento ao Fornecedor
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'a_vista', label: 'À Vista', desc: 'Hoje (1x)' },
                        { id: '30d', label: '30 d', desc: 'Boleto 30 dias' },
                        { id: '30_60d', label: '30/60d', desc: '2x (30 e 60d)' },
                        { id: '30_60_90d', label: '30/60/90d', desc: '3x (30, 60 e 90d)' },
                      ].map((term) => {
                        const isSelected = (editingPart.supplierPaymentTerms || '30d') === term.id;
                        return (
                          <button
                            key={term.id}
                            type="button"
                            onClick={() =>
                              setEditingPart({
                                ...editingPart,
                                supplierPaymentTerms: term.id as any,
                              })
                            }
                            className={`p-2 rounded-xl text-left border transition-all ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <div className="text-xs font-bold">{term.label}</div>
                            <div className="text-[10px] text-slate-400">{term.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {editingPart.supplierName && editingPart.costPrice > 0 && (
                    <label className="flex items-center gap-2 p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={createPurchaseRecord}
                        onChange={(e) => setCreatePurchaseRecord(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 w-4 h-4"
                      />
                      <span className="text-slate-300 text-xs">
                        Lançar conta a pagar de <strong>R$ {((editingPart.costPrice || 0) * (editingPart.currentStock || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> no Contas a Pagar / Financeiro
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO DE PLANILHA EXCEL (.XLSX / .CSV) */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Importar Peças via Planilha Excel (.xlsx / .csv)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cadastre ou atualize centenas de itens de uma só vez a partir da sua tabela
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setParsedExcelRows(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200">
              {!parsedExcelRows ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-8 text-center transition-colors bg-slate-950/40">
                    <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-white mb-1">
                      Selecione ou arraste sua planilha Excel (.xlsx, .xls ou .csv)
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                      Identifica automaticamente colunas como: Código, Descrição, Marca, Categoria, Preço de Custo, Preço de Venda, Estoque, Fornecedor, Telefone, Endereço e Forma de Pagamento (À vista, 30 d, 30/60d, 30/60/90d).
                    </p>
                    <label className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow-md transition-all">
                      <span>Procurar Arquivo Excel</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleExcelUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {excelError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                      {excelError}
                    </div>
                  )}

                  {/* Atalhos: Baixar modelo ou testar com exemplo */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => ExcelParserService.downloadTemplateExcel()}
                      className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      Baixar Modelo de Planilha (.xlsx)
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadSampleExcel}
                      className="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-4"
                    >
                      Carregar Planilha de Demonstração
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview dos itens parseados do Excel */
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="font-bold text-white block">
                        {parsedExcelRows.length} itens identificados na planilha:
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Confira os dados antes de confirmar a gravação no estoque
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setParsedExcelRows(null)}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Trocar Arquivo
                    </button>
                  </div>

                  {/* Tabela de Preview */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Descrição</th>
                          <th className="py-2.5 px-3">Marca / Categoria</th>
                          <th className="py-2.5 px-3 text-right">Custo</th>
                          <th className="py-2.5 px-3 text-right">Venda</th>
                          <th className="py-2.5 px-3 text-center">Qtd Estoque</th>
                          <th className="py-2.5 px-3">Fornecedor</th>
                          <th className="py-2.5 px-3 text-center">Cond. Pagto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {parsedExcelRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/50">
                            <td className="py-2 px-3 font-mono font-bold text-amber-400">{row.code}</td>
                            <td className="py-2 px-3 font-semibold text-white">{row.description}</td>
                            <td className="py-2 px-3 text-slate-400">
                              {row.brand} <span className="text-[10px] text-slate-500">({row.category})</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">
                              R$ {row.costPrice.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-emerald-400">
                              R$ {row.sellPrice.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-white">
                              {row.currentStock} {row.unit}
                            </td>
                            <td className="py-2 px-3">
                              {row.supplierName ? (
                                <div>
                                  <div className="font-semibold text-slate-200">{row.supplierName}</div>
                                  {row.supplierPhone && (
                                    <div className="text-[10px] text-slate-500 font-mono">{row.supplierPhone}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {row.supplierPaymentTerms ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                  {row.supplierPaymentTerms === 'a_vista'
                                    ? 'À vista'
                                    : row.supplierPaymentTerms === '30d'
                                    ? '30 d'
                                    : row.supplierPaymentTerms === '30_60d'
                                    ? '30/60d'
                                    : '30/60/90d'}
                                </span>
                              ) : (
                                <span className="text-slate-600 text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              {parsedExcelRows && (
                <button
                  type="button"
                  onClick={() => setParsedExcelRows(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Voltar
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsExcelModalOpen(false);
                    setParsedExcelRows(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                {parsedExcelRows && (
                  <button
                    type="button"
                    onClick={handleConfirmExcelImport}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar e Gravar no Estoque
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DA COMPRA & PARCELAS */}
      {isPurchaseDetailsOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">
                    NF-e {selectedPurchase.nfeNumber}
                  </h3>
                  <span className="text-xs bg-purple-500/20 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-500/30">
                    {selectedPurchase.supplierName}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  CNPJ: {selectedPurchase.supplierCnpj || 'Não informado'} • Emitida em{' '}
                  {formatDatePtBR(selectedPurchase.issueDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPurchaseDetailsOpen(false);
                  setSelectedPurchase(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Resumo Financeiro da Nota */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Valor Total da Nota</span>
                  <span className="text-base font-black text-white font-mono">
                    R$ {selectedPurchase.totalValue.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-emerald-400 block uppercase">Total Quitado</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    R$ {selectedPurchase.paidAmount.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-400 block uppercase">Saldo Restante</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    R$ {selectedPurchase.remainingAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Lista de Parcelas */}
              <div>
                <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  Cronograma de Parcelas ({selectedPurchase.paidInstallmentsCount}/
                  {selectedPurchase.totalInstallmentsCount} Pagas)
                </h4>

                <div className="space-y-2">
                  {selectedPurchase.installments.map((inst) => {
                    const isPaid = inst.status === 'pago';

                    return (
                      <div
                        key={inst.id}
                        className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">
                              Parcela {inst.installmentNumber} de {inst.totalInstallments}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                isPaid
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {isPaid ? 'Pago' : 'Pendente'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            Vencimento: {formatDatePtBR(inst.dueDate)}
                            {inst.paidAt && ` • Pago em ${formatDatePtBR(inst.paidAt)}`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">
                            R$ {inst.amount.toFixed(2)}
                          </span>

                          {!isPaid && onPayPurchaseInstallment && (
                            <div className="flex items-center gap-1.5">
                              <div
                                className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
                                title="Data em que o pagamento foi realizado"
                              >
                                <Calendar className="w-3 h-3 text-amber-400" />
                                <input
                                  type="date"
                                  value={
                                    installmentCustomDates[inst.id] ||
                                    new Date().toISOString().split('T')[0]
                                  }
                                  onChange={(e) =>
                                    setInstallmentCustomDates({
                                      ...installmentCustomDates,
                                      [inst.id]: e.target.value,
                                    })
                                  }
                                  className="bg-transparent text-xs text-white focus:outline-none font-mono"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const chosenDate =
                                    installmentCustomDates[inst.id] ||
                                    new Date().toISOString().split('T')[0];
                                  onPayPurchaseInstallment(
                                    selectedPurchase.id,
                                    inst.installmentNumber,
                                    chosenDate
                                  );
                                  // Atualiza objeto selecionado localmente
                                  const updatedInst = selectedPurchase.installments.map((i) =>
                                    i.id === inst.id
                                      ? {
                                          ...i,
                                          status: 'pago' as const,
                                          paidAt: `${chosenDate}T12:00:00.000Z`,
                                        }
                                      : i
                                  );
                                  const paidCnt = updatedInst.filter((i) => i.status === 'pago').length;
                                  const paidAmt = updatedInst
                                    .filter((i) => i.status === 'pago')
                                    .reduce((acc, i) => acc + i.amount, 0);
                                  setSelectedPurchase({
                                    ...selectedPurchase,
                                    installments: updatedInst,
                                    paidInstallmentsCount: paidCnt,
                                    paidAmount: paidAmt,
                                    remainingAmount: Math.max(0, selectedPurchase.totalValue - paidAmt),
                                    status:
                                      paidCnt === selectedPurchase.totalInstallmentsCount
                                        ? 'pago'
                                        : 'parcial',
                                  });
                                }}
                                className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow-sm transition-all active:scale-95"
                                title="Confirmar pagamento da parcela com a data informada"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                Pagar Parcela
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Peças vinculadas à nota */}
              {selectedPurchase.partCodes && selectedPurchase.partCodes.length > 0 && (
                <div>
                  <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-purple-400" />
                    Itens / Peças Adquiridas nesta Nota
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPurchase.partCodes.map((code) => {
                      const matched = parts.find((p) => p.code === code);
                      const isLow = matched && matched.currentStock <= matched.minStock;
                      return (
                        <span
                          key={code}
                          className={`border px-2.5 py-1.5 rounded-lg font-mono text-[11px] flex items-center gap-1.5 ${
                            isLow
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <strong className="text-amber-400">{code}</strong>
                          {matched && (
                            <span>
                              • {matched.description} (Estoque: <strong className={isLow ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{matched.currentStock} {matched.unit}</strong> / Mín: {matched.minStock} {matched.unit})
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsPurchaseDetailsOpen(false);
                  setSelectedPurchase(null);
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RELATÓRIO DE VENCIMENTOS DE FORNECEDORES */}
      <SupplierInvoicesReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        purchases={purchases}
        parts={parts}
      />
    </div>
  );
};
