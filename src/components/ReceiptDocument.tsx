import React, { forwardRef } from 'react';
import { ServiceOrder, Client, Vehicle, Mechanic } from '../types';
import { getOrderWarranty } from '../utils/warranty';

export interface ReceiptDocumentProps {
  order: ServiceOrder;
  client?: Client;
  vehicle?: Vehicle;
  mechanic?: Mechanic;
  isQuotation?: boolean;
}

export const ReceiptDocument = forwardRef<HTMLDivElement, ReceiptDocumentProps>(
  ({ order, client, vehicle, mechanic, isQuotation }, ref) => {
    const warranty = getOrderWarranty(order);
    const quotation = isQuotation ?? (order.status === 'orcamento' || order.status === 'aguardando_aprovacao');

    return (
      <div
        ref={ref}
        className="p-8 bg-white text-slate-900 font-sans text-xs w-[780px] max-w-[780px] mx-auto box-border"
        style={{
          fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif',
          color: '#0f172a',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Cabeçalho da Oficina */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase m-0">
              OFICINA RICO
            </h1>
            <p className="text-[11px] text-slate-600 m-0 mt-0.5">
              Manutenção Preventiva, Freios, Suspensão, Injeção Eletrônica & Motores
            </p>
            <p className="text-[10px] text-slate-500 m-0 mt-0.5">
              CNPJ: 12.345.678/0001-90 • Tel/WhatsApp: (11) 98244-0071 • Mecânico Responsável: Rico • São Paulo - SP
            </p>
          </div>
          <div className="text-right border-l-2 border-slate-200 pl-4">
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
            {warranty.hasServiceDate && (
              <span className="text-[10px] text-slate-700 block font-medium">
                Data Serviço: {warranty.formattedServiceDate}
              </span>
            )}
            <span className="text-[11px] text-slate-950 block mt-0.5 font-black tracking-tight">
              Venc. Garantia: <strong>{warranty.formattedExpiryDate}</strong>
            </span>
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
                {quotation
                  ? 'PROPOSTA (AGUARDANDO APROVAÇÃO)'
                  : order.isPaid
                  ? `PAGO (${order.paymentMethod?.toUpperCase() || 'À VISTA'})`
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
                <strong>Oficina Rico</strong> (Rico: <strong>(11) 98244-0071</strong>) na sua agenda para acompanhar a
                garantia legal de 90 dias (válida até <strong>{warranty.formattedExpiryDate}</strong>), receber laudos e o
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
              <span className="block font-bold text-slate-800">Oficina Rico</span>
              <span className="text-[9px] text-slate-500">Rico - Responsável Técnico</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ReceiptDocument.displayName = 'ReceiptDocument';
