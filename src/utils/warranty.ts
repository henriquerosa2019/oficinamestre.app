import { ServiceOrder } from '../types';

export interface WarrantyCalculation {
  warrantyDays: number;
  serviceDateStr: string; // YYYY-MM-DD
  expiryDateStr: string; // YYYY-MM-DD
  formattedServiceDate: string; // DD/MM/AAAA
  formattedExpiryDate: string; // DD/MM/AAAA
  isExpired: boolean;
  daysRemaining: number;
}

/**
 * Converte data para string no formato YYYY-MM-DD
 */
export function toIsoDate(dateInput?: string | Date | null): string {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    if (dateInput.includes('T')) {
      return dateInput.split('T')[0];
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normaliza e formata uma data para DD/MM/AAAA
 */
export function formatBrDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-');
    return `${day}/${month}/${year}`;
  }
  if (typeof dateInput === 'string' && dateInput.includes('T')) {
    const [year, month, day] = dateInput.split('T')[0].split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calcula vencimento da garantia (por padrão 90 dias conforme Art. 26 do Código de Defesa do Consumidor)
 */
export function getOrderWarranty(order?: Partial<ServiceOrder> | null): WarrantyCalculation {
  const warrantyDays = order?.warrantyDays ?? 90;

  // Data base de referência: serviceDate > finishedAt > createdAt > hoje
  const rawBase = order?.serviceDate || order?.finishedAt || order?.createdAt;
  let baseDate = rawBase ? new Date(rawBase) : new Date();
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  // Normaliza base para meia-noite local
  const baseYear = baseDate.getFullYear();
  const baseMonth = baseDate.getMonth();
  const baseDay = baseDate.getDate();
  const baseMidnight = new Date(baseYear, baseMonth, baseDay);

  let expiryMidnight: Date;
  if (order?.warrantyExpiresAt) {
    const custom = new Date(order.warrantyExpiresAt);
    if (!isNaN(custom.getTime())) {
      expiryMidnight = new Date(custom.getFullYear(), custom.getMonth(), custom.getDate());
    } else {
      expiryMidnight = new Date(baseYear, baseMonth, baseDay);
      expiryMidnight.setDate(expiryMidnight.getDate() + warrantyDays);
    }
  } else {
    expiryMidnight = new Date(baseYear, baseMonth, baseDay);
    expiryMidnight.setDate(expiryMidnight.getDate() + warrantyDays);
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = expiryMidnight.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;

  return {
    warrantyDays,
    serviceDateStr: toIsoDate(baseMidnight),
    expiryDateStr: toIsoDate(expiryMidnight),
    formattedServiceDate: formatBrDate(baseMidnight),
    formattedExpiryDate: formatBrDate(expiryMidnight),
    isExpired,
    daysRemaining,
  };
}
