import React, { useState } from 'react';
import { Part, ParsedXMLInvoice, SupplierPurchase } from '../types';
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
  Clock,
} from 'lucide-react';
import { XMLParserService } from '../services/xmlParser';
import { ExcelParserService, ParsedExcelRow } from '../services/excelParser';

interface PartsInventoryViewProps {
  parts: Part[];
  purchases?: SupplierPurchase[];
  onSavePart: (part: Part) => void;
  onBulkImportParts: (newParts: Part[], invoiceInfo?: ParsedXMLInvoice) => void;
  onDeletePart: (id: string) => void;
  onSavePurchase?: (purchase: SupplierPurchase) => void;
  onDeletePurchase?: (id: string) => void;
  onPayPurchaseInstallment?: (purchaseId: string, installmentNumber: number) => void;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modais
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

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

  const filteredParts = parts.filter((part) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      part.description.toLowerCase().includes(s) ||
      part.code.toLowerCase().includes(s) ||
      part.brand.toLowerCase().includes(s);

    const matchesCategory = !categoryFilter || part.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

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
          {/* Barra de Ações & Filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar peça por código, descrição ou marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="">Todas Categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Botão Importar Planilha Excel */}
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02]"
              >
                <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                Importar Excel (.xlsx)
              </button>

              {/* Botão Importar XML Destacado */}
              <button
                onClick={() => setIsXmlModalOpen(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02]"
              >
                <UploadCloud className="w-4 h-4 stroke-[2.5]" />
                Importar XML (NF-e)
              </button>

              <button
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
                  });
                  setIsEditModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-lg text-xs border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Peça
              </button>
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
                    <th className="py-3 px-4 text-center">Margem</th>
                    <th className="py-3 px-4 text-center">Estoque Atual</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        Nenhuma peça encontrada no estoque. Use o botão acima para importar um XML de compra.
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part) => {
                      const isLow = part.currentStock <= part.minStock;
                      const isZero = part.currentStock === 0;
                      const marginPercent =
                        part.costPrice > 0 ? ((part.sellPrice - part.costPrice) / part.costPrice) * 100 : 0;

                      return (
                        <tr key={part.id} className="hover:bg-slate-800/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {part.code || part.sku}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{part.description}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {part.supplierName && (
                                <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/25 px-1.5 py-0.5 rounded font-mono font-medium">
                                  {part.supplierName} {part.lastInvoiceNumber ? `• ${part.lastInvoiceNumber}` : ''}
                                </span>
                              )}
                              {part.location && (
                                <span className="text-[10px] text-slate-400">Loc: {part.location}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            <span className="text-slate-200 font-medium">{part.brand}</span>
                            <div className="text-[10px] text-slate-500">{part.category}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            R$ {part.costPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-white">
                            R$ {part.sellPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-[11px] font-bold text-emerald-400 font-mono">
                              +{marginPercent.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                                isZero
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : isLow
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400'
                              }`}
                            >
                              {isLow && <AlertTriangle className="w-3 h-3" />}
                              {part.currentStock} {part.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
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
                R$ {totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500">{purchases.length} notas cadastradas</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                Total Quitado
              </span>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                R$ {totalQuitado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500">Parcelas já pagas</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                Saldo a Pagar
              </span>
              <div className="text-xl font-black text-amber-400 font-mono mt-1">
                R$ {saldoAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500">A vencer a fornecedores</span>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 bg-gradient-to-br from-slate-900 to-amber-950/20">
              <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block">
                Próximo Vencimento
              </span>
              {proximoVencimento ? (
                <>
                  <div className="text-sm font-black text-white font-mono mt-1 truncate">
                    {new Date(proximoVencimento.dueDate).toLocaleDateString('pt-BR')} • R$ {proximoVencimento.amount.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-amber-300/80 truncate block">
                    {proximoVencimento.purchase.supplierName} ({proximoVencimento.installmentNumber}/{proximoVencimento.totalInstallments})
                  </span>
                </>
              ) : (
                <div className="text-xs text-emerald-400 mt-1 font-bold">✓ Tudo em dia!</div>
              )}
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
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        Nenhuma compra registrada. Importe uma NF-e XML no botão acima.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((purchase) => {
                      const nextPending = purchase.installments.find((i) => i.status === 'pendente');
                      const percentPaid = purchase.totalValue > 0 ? (purchase.paidAmount / purchase.totalValue) * 100 : 0;
                      const isComplete = purchase.status === 'pago';

                      return (
                        <tr key={purchase.id} className="hover:bg-slate-800/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{purchase.supplierName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{purchase.supplierCnpj || 'CNPJ não inf.'}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            NF-e {purchase.nfeNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-[11px] font-mono">
                            {new Date(purchase.issueDate).toLocaleDateString('pt-BR')}
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
                            <div>1ª: {new Date(purchase.firstDueDate).toLocaleDateString('pt-BR')}</div>
                            <div className="text-slate-500 text-[10px]">Última: {new Date(purchase.lastDueDate).toLocaleDateString('pt-BR')}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {nextPending ? (
                              <div className="font-mono text-[11px]">
                                <span className="text-amber-400 font-bold block">
                                  {new Date(nextPending.dueDate).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Parc. {nextPending.installmentNumber}: R$ {nextPending.amount.toFixed(2)}
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
                                  onClick={() => onPayPurchaseInstallment(purchase.id, nextPending.installmentNumber)}
                                  className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2 py-1 rounded-lg text-[10px] shadow-sm transition-all active:scale-95"
                                  title={`Pagar parcela ${nextPending.installmentNumber}/${purchase.totalInstallmentsCount}`}
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
                                title="Ver Detalhes e Parcelas"
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
                    })
                  )}
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
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
                    value={editingPart.description}
                    onChange={(e) => setEditingPart({ ...editingPart, description: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Código / Referência</label>
                    <input
                      required
                      type="text"
                      value={editingPart.code}
                      onChange={(e) => setEditingPart({ ...editingPart, code: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Marca</label>
                    <input
                      type="text"
                      value={editingPart.brand}
                      onChange={(e) => setEditingPart({ ...editingPart, brand: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
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
                      Identifica automaticamente colunas como: Código, Descrição, Marca, Categoria, Preço de Custo, Preço de Venda e Estoque.
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
                  {new Date(selectedPurchase.issueDate).toLocaleDateString('pt-BR')}
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
                            Vencimento: {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                            {inst.paidAt && ` • Pago em ${new Date(inst.paidAt).toLocaleDateString('pt-BR')}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-white text-sm">
                            R$ {inst.amount.toFixed(2)}
                          </span>

                          {!isPaid && onPayPurchaseInstallment && (
                            <button
                              type="button"
                              onClick={() => {
                                onPayPurchaseInstallment(
                                  selectedPurchase.id,
                                  inst.installmentNumber
                                );
                                // Atualiza objeto selecionado localmente
                                const updatedInst = selectedPurchase.installments.map((i) =>
                                  i.id === inst.id
                                    ? { ...i, status: 'pago' as const, paidAt: new Date().toISOString() }
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
                              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-sm transition-all active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              Pagar Parcela
                            </button>
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
                      return (
                        <span
                          key={code}
                          className="bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg font-mono text-[11px]"
                        >
                          <strong className="text-amber-400">{code}</strong>
                          {matched && ` • ${matched.description}`}
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
    </div>
  );
};
