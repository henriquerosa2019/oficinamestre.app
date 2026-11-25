import { SupplierPurchase, PurchaseInstallment } from '../types';

export type InvoiceDueFilter =
  | 'todas'
  | 'vencidas'
  | 'vence_hoje'
  | 'em_1dia'
  | 'em_2dias'
  | 'em_3dias'
  | 'em_4dias'
  | 'em_5dias'
  | 'em_semana'
  | 'quitadas';

export interface PurchaseDueAnalysis {
  purchase: SupplierPurchase;
  nextPendingInstallment: PurchaseInstallment | null;
  diffDays: number | null;
  daysOverdue: number;
  urgency:
    | 'quitado'
    | 'vencido'
    | 'vence_hoje'
    | 'em_1dia'
    | 'em_2dias'
    | 'em_3dias'
    | 'em_4dias'
    | 'em_5dias'
    | 'em_semana'
    | 'futuro';
  badgeLabel: string;
  badgeClass: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  dueDateFormatted: string;
}

/**
 * Converte data ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...) para formato brasileiro DD/MM/YYYY
 * sem sofrer deslocamento de fuso horário (UTC vs local).
 */
export function formatDatePtBR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
}

/**
 * Analisa o vencimento da próxima parcela pendente de uma compra/nota fiscal
 */
export function getPurchaseDueAnalysis(purchase: SupplierPurchase): PurchaseDueAnalysis {
  const pendingInstallments = (purchase.installments || [])
    .filter((i) => i.status !== 'pago')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  if (pendingInstallments.length === 0) {
    return {
      purchase,
      nextPendingInstallment: null,
      diffDays: null,
      daysOverdue: 0,
      urgency: 'quitado',
      badgeLabel: '✓ Quitado',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold',
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      dueDateFormatted: '-',
    };
  }

  const next = pendingInstallments[0];
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const cleanDate = next.dueDate.includes('T') ? next.dueDate.split('T')[0] : next.dueDate;
  const [y, m, d] = cleanDate.split('-').map(Number);
  const dueMidnight = new Date(y, m - 1, d);
  const formattedDue = formatDatePtBR(next.dueDate);

  const diffMs = dueMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return {
      purchase,
      nextPendingInstallment: next,
      diffDays,
      daysOverdue,
      urgency: 'vencido',
      badgeLabel: `Vencido há ${daysOverdue} dia${daysOverdue > 1 ? 's' : ''}`,
      badgeClass: 'bg-red-500/25 text-red-400 border border-red-500/60 font-black tracking-tight',
      isOverdue: true,
      isToday: false,
      isTomorrow: false,
      dueDateFormatted: formattedDue,
    };
  }

  if (diffDays === 0) {
    return {
      purchase,
      nextPendingInstallment: next,
      diffDays: 0,
      daysOverdue: 0,
      urgency: 'vence_hoje',
      badgeLabel: '⚠️ Vence Hoje',
      badgeClass:
        'animate-pulse bg-amber-500/30 text-amber-300 border-2 border-amber-400 ring-2 ring-amber-400/20 font-black shadow-md',
      isOverdue: false,
      isToday: true,
      isTomorrow: false,
      dueDateFormatted: formattedDue,
    };
  }

  if (diffDays === 1) {
    return {
      purchase,
      nextPendingInstallment: next,
      diffDays: 1,
      daysOverdue: 0,
      urgency: 'em_1dia',
      badgeLabel: 'A Vencer em 1 dia',
      badgeClass: 'bg-orange-500/25 text-orange-400 border border-orange-500/50 font-bold',
      isOverdue: false,
      isToday: false,
      isTomorrow: true,
      dueDateFormatted: formattedDue,
    };
  }

  if (diffDays === 2) {
    return {
      purchase,
      nextPendingInstallment: next,
      diffDays: 2,
      daysOverdue: 0,
      urgency: 'em_2dias',
      badgeLabel: 'Vence em 2 dias',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium',
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      dueDateFormatted: formattedDue,
    };
  }

  if (diffDays === 3) {
    return {
      purchase,
      nextPendingInstallment: next,
      diffDays: 3,
      daysOverdue: 0,
      urgency: 'em_3dias',
      badgeLabel: 'Vence em 3 dias',
      badgeClass: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-medium',
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      dueDateFormatted: formattedDue,
    };
  }

  if (diffDays === 4) {
    return {
      purchase,
      nextPendingInstallment: next,
      diffDays: 4,
      daysOverdue: 0,
      urgency: 'em_4dias',
      badgeLabel: 'Vence em 4 dias',
      badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700 font-medium',
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      dueDateFormatted: formattedDue,
    };
  }

  if (diffDays === 5) {
    return {
      purchase,
      nextPendingInstallment: next,
      diffDays: 5,
      daysOverdue: 0,
      urgency: 'em_5dias',
      badgeLabel: 'Vence em 5 dias',
      badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700 font-medium',
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      dueDateFormatted: formattedDue,
    };
  }

  if (diffDays <= 7) {
    return {
      purchase,
      nextPendingInstallment: next,
      diffDays,
      daysOverdue: 0,
      urgency: 'em_semana',
      badgeLabel: `Vence em ${diffDays} dias (1 semana)`,
      badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium',
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      dueDateFormatted: formattedDue,
    };
  }

  return {
    purchase,
    nextPendingInstallment: next,
    diffDays,
    daysOverdue: 0,
    urgency: 'futuro',
    badgeLabel: `Vence em ${diffDays} dias`,
    badgeClass: 'bg-slate-800 text-slate-400 border border-slate-700',
    isOverdue: false,
    isToday: false,
    isTomorrow: false,
    dueDateFormatted: formattedDue,
  };
}

/**
 * Filtra compras de acordo com a urgência selecionada pelo usuário
 */
export function filterPurchasesByDue(
  purchases: SupplierPurchase[],
  filter: InvoiceDueFilter
): { purchase: SupplierPurchase; analysis: PurchaseDueAnalysis }[] {
  const analyzed = purchases.map((p) => ({
    purchase: p,
    analysis: getPurchaseDueAnalysis(p),
  }));

  switch (filter) {
    case 'vencidas':
      return analyzed.filter((item) => item.analysis.isOverdue);
    case 'vence_hoje':
      return analyzed.filter((item) => item.analysis.isToday);
    case 'em_1dia':
      return analyzed.filter((item) => item.analysis.isTomorrow || item.analysis.diffDays === 1);
    case 'em_2dias':
      return analyzed.filter((item) => item.analysis.diffDays === 2);
    case 'em_3dias':
      return analyzed.filter((item) => item.analysis.diffDays === 3);
    case 'em_4dias':
      return analyzed.filter((item) => item.analysis.diffDays === 4);
    case 'em_5dias':
      return analyzed.filter((item) => item.analysis.diffDays === 5);
    case 'em_semana':
      return analyzed.filter(
        (item) => item.analysis.diffDays !== null && item.analysis.diffDays >= 0 && item.analysis.diffDays <= 7
      );
    case 'quitadas':
      return analyzed.filter((item) => item.analysis.urgency === 'quitado');
    case 'todas':
    default:
      return analyzed;
  }
}
