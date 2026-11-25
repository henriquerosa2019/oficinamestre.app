import React, { useState } from 'react';
import { SupplierPurchase, Part } from '../types';
import {
  getPurchaseDueAnalysis,
} from '../utils/invoiceAlerts';
import { WhatsAppService } from '../services/whatsapp';
import {
  Printer,
  X,
  FileText,
  CheckCircle,
  Copy,
  Check,
} from 'lucide-react';
import logoImg from '../assets/logo.png';

interface SupplierInvoicesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: SupplierPurchase[];
  parts: Part[];
}

export const SupplierInvoicesReportModal: React.FC<SupplierInvoicesReportModalProps> = ({
  isOpen,
  onClose,
  purchases,
  parts,
}) => {
  const [scope, setScope] = useState<'critical' | 'all_pending'>('critical');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Analisa todas as compras e suas parcelas pendentes
  const analyzedList = purchases.map((p) => ({
    purchase: p,
    analysis: getPurchaseDueAnalysis(p),
  }));

  // Filtra por urgência: Vencidas, Vence Hoje e Próximos 7 Dias
  const overdueList = analyzedList.filter((item) => item.analysis.isOverdue);
  const todayList = analyzedList.filter((item) => item.analysis.isToday);
  const next7DaysList = analyzedList.filter(
    (item) =>
      !item.analysis.isOverdue &&
      !item.analysis.isToday &&
      item.analysis.diffDays !== null &&
      item.analysis.diffDays >= 0 &&
      item.analysis.diffDays <= 7
  );

  const criticalList = [...overdueList, ...todayList, ...next7DaysList];
  const allPendingList = analyzedList.filter(
    (item) => item.analysis.nextPendingInstallment !== null
  );

  // Lista a ser exibida no relatório conforme o escopo selecionado
  const displayedList = scope === 'critical' ? criticalList : allPendingList;

  // Totais financeiros
  const overdueTotal = overdueList.reduce(
    (acc, i) => acc + (i.analysis.nextPendingInstallment?.amount || 0),
    0
  );
  const todayTotal = todayList.reduce(
    (acc, i) => acc + (i.analysis.nextPendingInstallment?.amount || 0),
    0
  );
  const next7DaysTotal = next7DaysList.reduce(
    (acc, i) => acc + (i.analysis.nextPendingInstallment?.amount || 0),
    0
  );

  const totalGeralExibido = displayedList.reduce(
    (acc, i) => acc + (i.analysis.nextPendingInstallment?.amount || 0),
    0
  );

  const now = new Date();
  const emissionDateStr = `${String(now.getDate()).padStart(2, '0')}/${String(
    now.getMonth() + 1
  ).padStart(2, '0')}/${now.getFullYear()}`;
  const emissionTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = async () => {
    let reportText = `📋 *RELATÓRIO DE VENCIMENTOS DE FORNECEDORES*\n`;
    reportText += `🏢 *Oficina do Rico - Auto Mecânica*\n`;
    reportText += `📅 *Emissão:* ${emissionDateStr} às ${emissionTimeStr}\n`;
    reportText += `🎯 *Filtro:* ${
      scope === 'critical'
        ? 'Janela Prioritária (Vencidas, Vence Hoje e Próximos 7 Dias)'
        : 'Todas as Parcelas Pendentes a Pagar'
    }\n\n`;

    reportText += `💰 *RESUMO GERAL:*\n`;
    reportText += `• 🚨 *Vencidas:* R$ ${overdueTotal.toFixed(2)} (${overdueList.length} notas)\n`;
    reportText += `• ⚠️ *Vence Hoje:* R$ ${todayTotal.toFixed(2)} (${todayList.length} notas)\n`;
    reportText += `• 📅 *Próximos 7 Dias:* R$ ${next7DaysTotal.toFixed(2)} (${next7DaysList.length} notas)\n`;
    reportText += `• ⭐ *TOTAL NO PERÍODO:* *R$ ${totalGeralExibido.toFixed(2)}*\n\n`;

    if (displayedList.length === 0) {
      reportText += `✓ *Nenhuma duplicata a vencer nesta janela de datas!*\n`;
    } else {
      reportText += `📑 *DISCRIMINAÇÃO DAS PARCELAS:*\n`;
      displayedList.forEach(({ purchase, analysis }, idx) => {
        const next = analysis.nextPendingInstallment;
        if (!next) return;
        reportText += `-----------------------------------\n`;
        reportText += `*${idx + 1}. ${purchase.supplierName}* (NF-e ${purchase.nfeNumber})\n`;
        reportText += `• Vencimento: *${analysis.dueDateFormatted}* (${analysis.badgeLabel})\n`;
        reportText += `• Parcela: ${next.installmentNumber}/${purchase.totalInstallmentsCount}\n`;
        reportText += `• Valor: *R$ ${next.amount.toFixed(2)}*\n`;
      });
      reportText += `-----------------------------------\n`;
    }

    reportText += `\n_Relatório gerado automaticamente pelo OficinaMestre Pro._`;

    const success = await WhatsAppService.copyToClipboard(reportText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      {/* Estilos dedicados para impressão limpa em folha A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-supplier-report,
          #printable-supplier-report * {
            visibility: visible !important;
          }
          #printable-supplier-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[94vh]">
        {/* Barra superior de controle (não sai na impressão) */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                Relatório de Vencimentos de Fornecedores (NF-e)
              </h3>
              <p className="text-[11px] text-slate-400">
                Previsão de pagamentos: Notas Vencidas, Vence Hoje e Próximos 7 Dias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Escopo do Relatório */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScope('critical')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  scope === 'critical'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Janela Crítica (7 Dias)
              </button>
              <button
                type="button"
                onClick={() => setScope('all_pending')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  scope === 'all_pending'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas as Parcelas ({allPendingList.length})
              </button>
            </div>

            {/* Botão Copiar para WhatsApp */}
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg text-xs transition-colors border border-slate-700 shadow-sm"
              title="Copiar texto formatado para colar no WhatsApp ou enviar por e-mail"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Resumo</span>
                </>
              )}
            </button>

            {/* Botão Imprimir / Salvar PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition-all shadow-md hover:scale-[1.02] active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            {/* Botão Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
              title="Fechar Relatório"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Área Visual do Documento / Prévia de Impressão */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 flex justify-center">
          <div
            id="printable-supplier-report"
            className="p-8 bg-white text-slate-900 font-sans text-xs w-[800px] max-w-full mx-auto box-border shadow-xl rounded-sm"
            style={{
              fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif',
              backgroundColor: '#ffffff',
              color: '#0f172a',
            }}
          >
            {/* Cabeçalho Oficial da Oficina */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={logoImg}
                  alt="Oficina do Rico"
                  className="w-20 h-20 object-contain shrink-0"
                  style={{ width: '80px', height: '80px' }}
                />
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase m-0 leading-none">
                    OFICINA DO RICO
                  </h1>
                  <p className="text-xs font-bold text-amber-700 m-0 mt-1 uppercase tracking-wide">
                    Rico Auto Mecânica • Gestão Integrada
                  </p>
                  <p className="text-[10px] text-slate-600 m-0 mt-0.5">
                    📍 Rua Barão do Bom Retiro, 1406 - Engenho Novo - Rio de Janeiro - RJ
                  </p>
                  <p className="text-[10.5px] text-slate-800 font-semibold m-0 mt-0.5">
                    📱 Tel / WhatsApp: (21) 96463-2820 • Mecânico Responsável: Rico
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Documento Financeiro
                </span>
                <span className="text-sm font-black text-slate-950 font-mono block">
                  DEMONSTRATIVO NF-e
                </span>
                <span className="text-[10px] text-slate-600 font-mono block mt-1">
                  Emissão: {emissionDateStr} às {emissionTimeStr}
                </span>
              </div>
            </div>

            {/* Título do Relatório & Escopo */}
            <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider m-0">
                  Relatório de Vencimentos de Fornecedores & Autopeças
                </h2>
                <p className="text-[11px] text-slate-600 m-0 mt-0.5">
                  Escopo:{' '}
                  <strong>
                    {scope === 'critical'
                      ? 'Janela Prioritária: Notas Vencidas, Vence Hoje e Próximos 7 Dias'
                      : 'Todas as Notas com Parcelas Pendentes'}
                  </strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">
                  Total de Títulos Listados
                </span>
                <span className="text-sm font-black text-slate-950 font-mono">
                  {displayedList.length} parcela{displayedList.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Painel de Indicadores de Vencimento */}
            <div className="grid grid-cols-4 gap-2.5 mb-5">
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                  🚨 Vencidas
                </span>
                <div className="text-sm font-black text-red-900 font-mono mt-0.5">
                  R$ {overdueTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[9.5px] text-red-600 font-medium">
                  {overdueList.length} duplicata(s)
                </span>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  ⚠️ Vence Hoje
                </span>
                <div className="text-sm font-black text-amber-950 font-mono mt-0.5">
                  R$ {todayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[9.5px] text-amber-700 font-medium">
                  {todayList.length} duplicata(s)
                </span>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                  📅 Próximos 7 Dias
                </span>
                <div className="text-sm font-black text-blue-950 font-mono mt-0.5">
                  R$ {next7DaysTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[9.5px] text-blue-700 font-medium">
                  {next7DaysList.length} duplicata(s)
                </span>
              </div>

              <div className="p-2.5 bg-slate-900 text-white rounded-lg">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  ⭐ Total da Seleção
                </span>
                <div className="text-sm font-black text-amber-400 font-mono mt-0.5">
                  R$ {totalGeralExibido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[9.5px] text-slate-300">
                  {displayedList.length} item(ns) a pagar
                </span>
              </div>
            </div>

            {/* Tabela de Lançamentos */}
            {displayedList.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center my-4">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-900">
                  Nenhuma duplicata vencida ou a vencer nos próximos 7 dias!
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Todas as suas contas de autopeças estão em dia para a próxima semana. Se desejar
                  ver os vencimentos futuros de dezembro e janeiro, clique no botão abaixo:
                </p>
                <button
                  type="button"
                  onClick={() => setScope('all_pending')}
                  className="mt-3 px-3 py-1.5 bg-slate-900 text-amber-400 font-bold text-xs rounded-lg shadow-sm hover:bg-slate-800 cursor-pointer"
                >
                  Exibir Todas as Parcelas a Pagar ({allPendingList.length} notas)
                </button>
              </div>
            ) : (
              <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[9.5px]">
                      <th className="py-2 px-3">Vencimento</th>
                      <th className="py-2 px-3">Situação / Prazo</th>
                      <th className="py-2 px-3">Fornecedor / CNPJ</th>
                      <th className="py-2 px-3">NF-e Nº</th>
                      <th className="py-2 px-3 text-center">Parcela</th>
                      <th className="py-2 px-3">Peças / Reposição</th>
                      <th className="py-2 px-3 text-right">Valor Parcela</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayedList.map(({ purchase, analysis }) => {
                      const next = analysis.nextPendingInstallment;
                      if (!next) return null;

                      // Peças vinculadas e alerta de estoque
                      const linkedParts = parts.filter(
                        (p) =>
                          p.purchaseId === purchase.id ||
                          (purchase.partCodes && purchase.partCodes.includes(p.code)) ||
                          (p.lastInvoiceNumber && p.lastInvoiceNumber.includes(purchase.nfeNumber))
                      );
                      const lowStockParts = linkedParts.filter((p) => p.currentStock <= p.minStock);

                      let statusBadge = (
                        <span className="text-[10px] text-slate-600 font-medium">
                          {analysis.badgeLabel}
                        </span>
                      );
                      if (analysis.isOverdue) {
                        statusBadge = (
                          <span className="text-[9.5px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                            🚨 VENCIDO
                          </span>
                        );
                      } else if (analysis.isToday) {
                        statusBadge = (
                          <span className="text-[9.5px] font-black text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded">
                            ⚠️ VENCE HOJE
                          </span>
                        );
                      } else if (
                        analysis.diffDays !== null &&
                        analysis.diffDays >= 0 &&
                        analysis.diffDays <= 7
                      ) {
                        statusBadge = (
                          <span className="text-[9.5px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                            📅 {analysis.diffDays} dia(s)
                          </span>
                        );
                      }

                      return (
                        <tr key={purchase.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-950">
                            {analysis.dueDateFormatted}
                          </td>
                          <td className="py-2 px-3">{statusBadge}</td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900 block leading-tight">
                              {purchase.supplierName}
                            </span>
                            <span className="text-[9.5px] text-slate-500 font-mono">
                              {purchase.supplierCnpj || 'CNPJ não inf.'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">
                            NF-e {purchase.nfeNumber}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {next.installmentNumber}/{purchase.totalInstallmentsCount}
                          </td>
                          <td className="py-2 px-3">
                            {linkedParts.length > 0 ? (
                              <div>
                                {lowStockParts.length > 0 ? (
                                  <span className="text-[10px] font-bold text-red-600 block">
                                    ⚠️ {lowStockParts.length} item(ns) em alerta
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-700 block">
                                    ✓ {linkedParts.length} item(ns) ok
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-500 font-mono truncate max-w-[120px] block">
                                  {linkedParts.map((p) => p.code).join(', ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">
                            R$ {next.amount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                      <td colSpan={6} className="py-2.5 px-3 text-right text-xs uppercase tracking-wider text-slate-800">
                        Total a Pagar na Janela:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-slate-950">
                        R$ {totalGeralExibido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Informações de Rodapé & Visto Financeiro */}
            <div className="border-t border-slate-200 pt-4 mt-6 text-slate-500 text-[10px] flex items-end justify-between">
              <div>
                <p className="m-0 font-medium">
                  Demonstrativo emitido para controle interno e quitação bancária de duplicatas.
                </p>
                <p className="m-0 mt-0.5 text-slate-400">
                  OficinaMestre Pro • Módulo Financeiro & Estoque de Autopeças
                </p>
              </div>

              <div className="text-center w-52 border-t border-slate-400 pt-1">
                <span className="block text-[10px] font-bold text-slate-700">
                  Visto Financeiro / Gestor
                </span>
                <span className="block text-[9px] text-slate-400">Oficina do Rico</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
