import { ServiceOrder } from '../types';

export interface WarrantyCalculation {
  warrantyDays: number;
  entryDateStr: string; // YYYY-MM-DD
  serviceDateStr: string; // YYYY-MM-DD
  expiryDateStr: string; // YYYY-MM-DD
  formattedEntryDate: string; // DD/MM/AAAA
  formattedServiceDate: string; // DD/MM/AAAA
  formattedExpiryDate: string; // DD/MM/AAAA
  isExpired: boolean;
  daysRemaining: number;
  hasServiceDate: boolean;
}

/**
 * Converte qualquer entrada de data de forma segura para a data do calendário local,
 * prevenindo deslocamentos de fuso horário UTC (ex: UTC-3 Brasil voltando 1 dia).
 */
export function parseLocalDate(input?: string | Date | null): Date {
  if (!input) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
  }
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Converte data para string no formato YYYY-MM-DD sem deslocamento UTC
 */
export function toIsoDate(dateInput?: string | Date | null): string {
  if (!dateInput) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  const d = parseLocalDate(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normaliza e formata uma data para DD/MM/AAAA de forma determinística
 */
export function formatBrDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
  }
  const d = parseLocalDate(dateInput);
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
  const hasServiceDate = Boolean(order?.serviceDate || order?.finishedAt);

  // Data de Entrada: entryDate > createdAt > hoje
  const rawEntry = order?.entryDate || order?.createdAt || new Date();
  const entryDateObj = parseLocalDate(rawEntry);
  const entryDateIso = toIsoDate(entryDateObj);

  // Data base de referência para a garantia CDC (90 dias a partir da aprovação / realização do serviço):
  // serviceDate > finishedAt > entryDate > createdAt > hoje
  const rawBase = order?.serviceDate || order?.finishedAt || order?.entryDate || order?.createdAt;
  const baseDateObj = parseLocalDate(rawBase);

  let expiryDateObj: Date;
  if (order?.warrantyExpiresAt) {
    expiryDateObj = parseLocalDate(order.warrantyExpiresAt);
  } else {
    expiryDateObj = new Date(baseDateObj.getFullYear(), baseDateObj.getMonth(), baseDateObj.getDate() + warrantyDays);
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = expiryDateObj.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;

  return {
    warrantyDays,
    entryDateStr: entryDateIso,
    serviceDateStr: toIsoDate(baseDateObj),
    expiryDateStr: toIsoDate(expiryDateObj),
    formattedEntryDate: formatBrDate(entryDateObj),
    formattedServiceDate: formatBrDate(baseDateObj),
    formattedExpiryDate: formatBrDate(expiryDateObj),
    isExpired,
    daysRemaining,
    hasServiceDate,
  };
}
