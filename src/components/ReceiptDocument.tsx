import React, { forwardRef } from 'react';
import { ServiceOrder, Client, Vehicle, Mechanic } from '../types';
import { getOrderWarranty, formatBrDate, parseLocalDate, toIsoDate } from '../utils/warranty';
import { AlertCircle } from 'lucide-react';
import logoImg from '../assets/logo.png';
import { PreventiveMaintenanceService } from '../services/preventiveMaintenance';
import { StorageService } from '../services/storage';

export interface ReceiptDocumentProps {
  order: ServiceOrder;
  client?: Client;
  vehicle?: Vehicle;
  mechanic?: Mechanic;
  isQuotation?: boolean;
  estimatedReturnDate?: string;
}

const formatPaymentMethod = (method?: string): string => {
  switch (method) {
    case 'pix':
      return 'PIX';
    case 'dinheiro':
      return 'DINHEIRO';
    case 'cartao_credito':
      return 'CARTÃO DE CRÉDITO';
    case 'cartao_debito':
      return 'CARTÃO DE DÉBITO';
    case 'a_prazo':
      return 'A PRAZO';
    case 'boleto':
      return 'BOLETO';
    default:
      return method ? method.toUpperCase().replace('_', ' ') : 'À VISTA';
  }
};

export const ReceiptDocument = forwardRef<HTMLDivElement, ReceiptDocumentProps>(
  ({ order, client, vehicle, mechanic, isQuotation, estimatedReturnDate }, ref) => {
    const warranty = getOrderWarranty(order);
    const isActuallyQuotationStatus = order.status === 'orcamento' || order.status === 'aguardando_aprovacao';
    const quotation = isActuallyQuotationStatus && isQuotation !== false;

    const estimatedReturn = estimatedReturnDate || (() => {
      const baseDateStr = order.serviceDate || order.entryDate || toIsoDate(new Date());

      // 1. Tenta buscar registro salvo no storage para esta OS ou veículo, garantindo que seja futuro
      const storedRecords = StorageService.getMaintenanceRecords();
      const orderRecord = storedRecords.find(
        (r) =>
          ((order.id && r.serviceOrderId === order.id) || (order.vehicleId && r.vehicleId === order.vehicleId)) &&
          r.estimatedReturnDate &&
          r.estimatedReturnDate > baseDateStr
      );
      if (orderRecord?.estimatedReturnDate) {
        return formatBrDate(orderRecord.estimatedReturnDate);
      }

      // 2. Cálculo dinâmico se não houver registro prévio futuro
      let detectedType = 'troca_oleo';
      if (order.services && order.services.length > 0) {
        const types = order.services.map((s) => PreventiveMaintenanceService.detectServiceType(s.description));
        if (types.includes('troca_oleo')) detectedType = 'troca_oleo';
        else if (types.includes('alinhamento')) detectedType = 'alinhamento';
        else if (types.includes('freios')) detectedType = 'freios';
        else if (types.includes('revisao_geral')) detectedType = 'revisao_geral';
        else if (types.includes('correia_dentada')) detectedType = 'correia_dentada';
        else detectedType = types[0] || 'troca_oleo';
      } else if (order.parts && order.parts.length > 0) {
        const types = order.parts.map((p) => PreventiveMaintenanceService.detectServiceType(p.description));
        if (types.includes('troca_oleo')) detectedType = 'troca_oleo';
        else if (types.includes('freios')) detectedType = 'freios';
        else detectedType = types[0] || 'troca_oleo';
      }

      const profile = vehicle?.usageProfile || 'normal';
      const params = PreventiveMaintenanceService.getIntervalParams(
        detectedType as any,
        profile,
        vehicle?.averageMonthlyKm
      );

      const baseD = parseLocalDate(baseDateStr);
      const retDate = new Date(baseD.getFullYear(), baseD.getMonth(), baseD.getDate() + params.intervalDays);
      return formatBrDate(retDate);
    })();

    return (
      <div
        ref={ref}
        className="p-8 bg-white text-slate-900 font-sans text-xs w-[780px] max-w-full mx-auto box-border"
        style={{
          fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif',
          color: '#0f172a',
          backgroundColor: '#ffffff',
          width: '780px',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Cabeçalho da Oficina */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={logoImg}
              alt="Oficina do Rico"
              className="w-40 h-40 object-contain shrink-0 drop-shadow-md"
              style={{ width: '160px', height: '160px', objectFit: 'contain' }}
            />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase m-0 leading-none">
                OFICINA DO RICO
              </h1>
              <p className="text-xs font-black text-amber-700 m-0 mt-1.5 uppercase tracking-wide">
                Rico Auto Mecânica
              </p>
              <p className="text-[11px] text-slate-700 m-0 mt-1 leading-snug">
                Manutenção Preventiva, Freios, Suspensão, Injeção Eletrônica & Motores
              </p>
              <p className="text-[10.5px] text-slate-600 m-0 mt-1">
                📍 Rua Barão do Bom Retiro, 1406 - Engenho Novo - Rio de Janeiro - RJ
              </p>
              <p className="text-[11px] text-slate-900 font-bold m-0 mt-1 flex items-center gap-1.5">
                <span>📱 Tel / WhatsApp: (21) 96463-2820</span>
                <span className="mx-1 text-slate-400">•</span>
                <span>Mecânico Responsável: Rico</span>
              </p>
            </div>
          </div>
          <div className="text-right border-l-2 border-slate-200 pl-4 shrink-0">
            <span className="text-xs uppercase text-slate-500 block font-semibold">
              {quotation ? 'Orçamento Técnico' : 'Ordem de Serviço'}
            </span>
            <span className="text-xl font-mono font-black text-slate-950 block">
              {order.orderNumber}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Data Entrada: {warranty.formattedEntryDate}
            </span>
            {quotation && (
              <span className="text-[10px] text-amber-800 font-bold block mt-0.5">
                Validade: 48 horas
              </span>
            )}
            {(order.serviceDate || warranty.hasServiceDate) && (
              <span className="text-[10px] text-slate-700 block font-medium">
                Data Aprovação: {formatBrDate(order.serviceDate || warranty.serviceDateStr)}
              </span>
            )}
            {order.status === 'finalizado' && (
              <span className="text-[10px] text-emerald-800 block font-bold">
                Data Finalização: {formatBrDate(order.finishedAt || order.updatedAt || order.serviceDate || order.createdAt)}
              </span>
            )}
            <span className="text-[11px] text-slate-950 block mt-0.5 font-black tracking-tight">
              Venc. Garantia: <strong>{warranty.formattedExpiryDate}</strong>
            </span>
            {estimatedReturn && (
              <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                Previsão Retorno: <strong>{estimatedReturn}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Dados do Cliente e Veículo */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Dados do Cliente:</span>
            <div className="font-bold text-sm text-slate-900">{client?.name || 'Cliente'}</div>
            <div className="text-[11px] text-slate-700">Telefone: {client?.phone || '-'}</div>
            <div className="text-[11px] text-slate-700">Documento: {client?.document || '-'}</div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Dados do Veículo:</span>
            <div className="font-bold text-sm text-slate-900">
              {vehicle?.brand} {vehicle?.model} ({vehicle?.year || 'Ano N/I'})
            </div>
            <div className="text-[11px] font-mono font-bold text-slate-900">
              Placa: {vehicle?.plate || '-'} | KM: {order.checklist?.mileage?.toLocaleString('pt-BR') || '0'} km
            </div>
            <div className="text-[11px] text-slate-700">
              Mecânico Resp.: {mechanic?.name || 'Rico'}
            </div>
          </div>
        </div>

        {/* Diagnóstico / Sintoma Relatado */}
        <div className="mb-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
            Sintoma Relatado / Diagnóstico Técnico:
          </span>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800">
            {order.technicalDiagnostic || order.complaintDescription || 'Revisão técnica preventiva de rotina.'}
          </div>
        </div>

        {/* Tabela de Serviços e Peças */}
        <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9px]">
              <tr>
                <th className="py-2 px-3">Item / Descrição</th>
                <th className="py-2 px-3 text-center">Tipo</th>
                <th className="py-2 px-3 text-center">Qtd</th>
                <th className="py-2 px-3 text-right">Valor Unit.</th>
                <th className="py-2 px-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Serviços */}
              {order.services && order.services.length > 0 ? (
                order.services.map((s) => (
                  <tr key={s.id}>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">{s.description}</td>
                    <td className="py-1.5 px-3 text-center text-slate-500">Mão de Obra</td>
                    <td className="py-1.5 px-3 text-center">1</td>
                    <td className="py-1.5 px-3 text-right font-mono">
                      {s.price > 0 ? `R$ ${s.price.toFixed(2)}` : 'Incluso'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">
                      {s.price > 0 ? `R$ ${s.price.toFixed(2)}` : 'Incluso'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-1.5 px-3 text-slate-400 italic">
                    Nenhum serviço discriminado.
                  </td>
                </tr>
              )}

              {/* Peças */}
              {order.parts && order.parts.length > 0 ? (
                order.parts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">
                      {p.description} <span className="text-[9px] text-slate-500">({p.code})</span>
                    </td>
                    <td className="py-1.5 px-3 text-center text-slate-500">Peça</td>
                    <td className="py-1.5 px-3 text-center">{p.quantity}</td>
                    <td className="py-1.5 px-3 text-right font-mono">R$ {p.unitPrice.toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">R$ {p.total.toFixed(2)}</td>
                  </tr>
                ))
              ) : order.partsSupplyMode !== 'cliente_todas' ? (
                <tr>
                  <td colSpan={5} className="py-1.5 px-3 text-slate-400 italic">
                    Nenhuma peça discriminada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Notas de Fornecimento de Peças pelo Cliente */}
        {order.partsSupplyMode === 'cliente_todas' && (
          <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-300 rounded text-[11px] text-emerald-950">
            <strong>Origem das Peças:</strong> Peças e insumos fornecidos integralmente pelo cliente{' '}
            {order.clientProvidedPartsNotes ? `(${order.clientProvidedPartsNotes})` : ''}. Sem custo de peças cobrado
            pela oficina (cobrança apenas de mão de obra). A garantia legal de 90 dias aplica-se exclusivamente aos
            serviços de instalação/mão de obra executados.
          </div>
        )}
        {order.partsSupplyMode === 'cliente_parcial' && order.clientProvidedPartsNotes && (
          <div className="mb-4 p-2.5 bg-sky-50 border border-sky-300 rounded text-[11px] text-sky-950">
            <strong>Peças Trazidas pelo Cliente:</strong> {order.clientProvidedPartsNotes}. A oficina forneceu e
            garantiu apenas as peças faltantes discriminadas acima.
          </div>
        )}

        {/* Totais do Fechamento */}
        <div className="flex justify-between items-start border-t-2 border-slate-900 pt-3 mb-6">
          <div className="text-[11px] text-slate-600 space-y-1">
            <div>
              Status: <strong className="uppercase">{order.status.replace('_', ' ')}</strong>
            </div>
            <div>
              Pagamento:{' '}
              <strong>
                {order.isPaid
                  ? `PAGO (${formatPaymentMethod(order.paymentMethod)})`
                  : quotation
                  ? 'PROPOSTA (AGUARDANDO APROVAÇÃO)'
                  : order.status === 'aprovado'
                  ? 'ORÇAMENTO APROVADO • SEPARAÇÃO DE PEÇAS'
                  : order.status === 'em_andamento'
                  ? 'APROVADO • EM EXECUÇÃO NO PÁTIO (PAGTO NA RETIRADA)'
                  : order.status === 'pronto'
                  ? 'SERVIÇOS CONCLUÍDOS • PENDENTE NA RETIRADA'
                  : 'PENDENTE NO BALCÃO'}
              </strong>
            </div>
          </div>

          <div className="text-right space-y-1 text-xs">
            <div>
              Peças:{' '}
              {order.partsSupplyMode === 'cliente_todas'
                ? 'R$ 0,00 (Cliente Forneceu)'
                : `R$ ${order.partsTotal.toFixed(2)}`}
            </div>
            <div>Mão de Obra: R$ {order.servicesTotal.toFixed(2)}</div>
            {order.discount > 0 && (
              <div className="text-red-600 font-bold">Desconto: - R$ {order.discount.toFixed(2)}</div>
            )}
            <div className="text-base font-black text-slate-950 border-t border-slate-300 pt-1">
              VALOR TOTAL: R$ {order.netTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Diagnotico & Entrada, do Checklist de Lataria & Avarias Externas */}
        <div
          className="mb-5 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 shadow-sm print:bg-slate-950 print:text-slate-100"
          style={{
            backgroundColor: '#020617',
            borderColor: '#1e293b',
            color: '#f8fafc',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* Cabeçalho */}
          <div
            className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 flex-wrap gap-2"
            style={{ borderColor: '#1e293b' }}
          >
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Diagnotico & Entrada, do Checklist de Lataria & Avarias Externas</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Para fins de ciência ao proprietário e registro para resguardar a oficina.
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 font-mono">
              <span className="font-semibold text-slate-200">
                KM: {order.checklist?.mileage?.toLocaleString('pt-BR') || '0'} km
              </span>
              <span className="mx-2 text-slate-600">•</span>
              <span>Combustível: {order.checklist?.fuelLevel ?? 50}%</span>
            </div>
          </div>

          {/* Silhueta Vetorial do Carro Interativa (Fiel ao CarDamageCanvas do sistema) */}
          <div
            className="relative w-full max-w-lg mx-auto aspect-[16/9] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none"
            style={{
              backgroundColor: '#030712',
              borderColor: '#1e293b',
            }}
          >
            {/* SVG Esquema de Carro Vista Superior */}
            <svg
              viewBox="0 0 600 320"
              className="w-full h-full pointer-events-none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                stroke: '#94a3b8',
                fill: 'rgba(15, 23, 42, 0.4)',
                opacity: 0.6,
              }}
            >
              {/* Contorno Geral do Veículo (Vista de Cima) */}
              <path d="M 160 30 C 220 20, 380 20, 440 30 C 470 35, 490 60, 500 100 C 510 140, 510 180, 500 220 C 490 260, 470 285, 440 290 C 380 300, 220 300, 160 290 C 130 285, 110 260, 100 220 C 90 180, 90 140, 100 100 C 110 60, 130 35, 160 30 Z" />

              {/* Capô / Dianteira */}
              <path d="M 130 90 L 190 90 C 190 60, 180 40, 160 35" strokeDasharray="3 3" />
              <path d="M 130 230 L 190 230 C 190 260, 180 280, 160 285" strokeDasharray="3 3" />
              <line x1="190" y1="60" x2="190" y2="260" />

              {/* Para-brisa dianteiro */}
              <path d="M 200 65 Q 230 160 200 255" />

              {/* Teto e Colunas */}
              <rect x="220" y="70" width="160" height="180" rx="10" />

              {/* Vidro Traseiro */}
              <path d="M 390 65 Q 370 160 390 255" />

              {/* Porta-malas / Traseira */}
              <line x1="420" y1="50" x2="420" y2="270" strokeDasharray="3 3" />

              {/* Pneus */}
              <rect x="150" y="10" width="45" height="18" rx="4" fill="#334155" />
              <rect x="150" y="292" width="45" height="18" rx="4" fill="#334155" />
              <rect x="405" y="10" width="45" height="18" rx="4" fill="#334155" />
              <rect x="405" y="292" width="45" height="18" rx="4" fill="#334155" />

              {/* Retrovisores */}
              <rect x="200" y="22" width="18" height="10" rx="3" />
              <rect x="200" y="288" width="18" height="10" rx="3" />

              {/* Identificadores textuais de apoio */}
              <text x="120" y="165" fill="#94a3b8" stroke="none" fontFamily="sans-serif" fontSize="12" fontWeight="bold">
                FRENTE
              </text>
              <text x="440" y="165" fill="#94a3b8" stroke="none" fontFamily="sans-serif" fontSize="12" fontWeight="bold">
                TRASEIRA
              </text>
            </svg>

            {/* Pontos Marcados */}
            {(order.checklist?.damagePoints || []).map((point, index) => {
              const bg =
                point.type === 'risco'
                  ? '#f59e0b'
                  : point.type === 'amassado'
                  ? '#ef4444'
                  : point.type === 'quebrado'
                  ? '#9333ea'
                  : '#3b82f6';
              const border =
                point.type === 'risco'
                  ? '#fcd34d'
                  : point.type === 'amassado'
                  ? '#fca5a5'
                  : point.type === 'quebrado'
                  ? '#d8b4fe'
                  : '#93c5fd';
              const textCol = point.type === 'risco' ? '#451a03' : '#ffffff';

              return (
                <div
                  key={point.id || index}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    backgroundColor: bg,
                    borderColor: border,
                    color: textCol,
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    width: '24px',
                    height: '24px',
                    borderRadius: '9999px',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    fontSize: '10px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                  }}
                  title={`${point.partName} (${point.type})`}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>

          {/* Lista de Avarias Registradas em Cards Lado a Lado (Exatamente como na imagem) */}
          {order.checklist?.damagePoints && order.checklist.damagePoints.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {order.checklist.damagePoints.map((point, index) => {
                const bg =
                  point.type === 'risco'
                    ? '#f59e0b'
                    : point.type === 'amassado'
                    ? '#ef4444'
                    : point.type === 'quebrado'
                    ? '#9333ea'
                    : '#3b82f6';
                const textCol = point.type === 'risco' ? '#451a03' : '#ffffff';

                return (
                  <div
                    key={point.id || index}
                    className="flex items-center justify-between gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                    style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      borderColor: 'rgba(51, 65, 85, 0.6)',
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                        style={{
                          backgroundColor: bg,
                          color: textCol,
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="font-semibold capitalize text-slate-200">[{point.type}]</span>
                      <span className="truncate text-slate-400">{point.partName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-center text-xs text-slate-400 italic py-1">
              ✓ Nenhuma avaria de lataria assinalada no checklist de entrada.
            </p>
          )}

          {/* Acessórios e Itens de Segurança na Entrada */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400"
            style={{ borderColor: '#1e293b' }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                Estepe: <strong className="text-slate-200">{order.checklist?.hasSpareWheel ? 'Sim' : 'Não'}</strong>
              </span>
              <span>
                Macaco: <strong className="text-slate-200">{order.checklist?.hasJack ? 'Sim' : 'Não'}</strong>
              </span>
              <span>
                Chave de Roda: <strong className="text-slate-200">{order.checklist?.hasLugWrench ? 'Sim' : 'Não'}</strong>
              </span>
              <span>
                Triângulo: <strong className="text-slate-200">{order.checklist?.hasTriangle ? 'Sim' : 'Não'}</strong>
              </span>
            </div>
            <span className="text-[9.5px] text-slate-500 italic">
              Declaração de ciência do proprietário no ato de abertura da O.S.
            </span>
          </div>
        </div>

        {/* Termo de Garantia e Assinaturas */}
        <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 space-y-4">
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-slate-800 flex items-start gap-2.5">
            <span className="text-base leading-none">📲</span>
            <div>
              <strong className="block text-[11px] text-slate-900 font-bold uppercase">
                Acompanhamento da Garantia de {warranty.warrantyDays} Dias (Até {warranty.formattedExpiryDate}) & Histórico do Veículo:
              </strong>
              <p className="text-[10px] text-slate-700 mt-0.5 leading-relaxed m-0">
                Prezado(a) <strong>{client?.name || 'Cliente'}</strong>, salve o WhatsApp comercial da{' '}
                <strong>Oficina do Rico</strong> (Rico: <strong>(21) 96463-2820</strong>) na sua agenda para acompanhar a
                garantia legal de 90 dias (válida até <strong>{warranty.formattedExpiryDate}</strong>){estimatedReturn ? `, com previsão para o próximo retorno preventivo em ${estimatedReturn}` : ''}, receber laudos e o
                histórico preventivo do seu <strong>{vehicle?.brand} {vehicle?.model}</strong>.
              </p>
            </div>
          </div>

          <p className="leading-tight text-slate-600 m-0">
            Garantia legal de {warranty.warrantyDays} (noventa) dias para serviços e peças novas aplicadas (vencimento
            em <strong>{warranty.formattedExpiryDate}</strong>), conforme art. 26 do Código de Defesa do Consumidor. A
            garantia não cobre mau uso, sobrecarga, acidentes ou intervenção de terceiros.
          </p>

          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="border-t border-slate-400 pt-1 text-center">
              <span className="block font-bold text-slate-800">Assinatura do Cliente</span>
              <span className="text-[9px] text-slate-500">
                {quotation ? 'Aprovação e autorização dos serviços' : 'Autorização e recebimento do veículo'}
              </span>
            </div>
            <div className="border-t border-slate-400 pt-1 text-center">
              <span className="block font-bold text-slate-800">Oficina do Rico</span>
              <span className="text-[9px] text-slate-500">Rico - Responsável Técnico</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ReceiptDocument.displayName = 'ReceiptDocument';
