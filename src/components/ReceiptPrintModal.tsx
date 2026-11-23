import React from 'react';
import { ServiceOrder, Client, Vehicle, Mechanic } from '../types';
import { Printer, X, Wrench, CheckCircle } from 'lucide-react';

interface ReceiptPrintModalProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  vehicles: Vehicle[];
  mechanics: Mechanic[];
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  order,
  isOpen,
  onClose,
  clients,
  vehicles,
  mechanics,
}) => {
  if (!isOpen || !order) return null;

  const client = clients.find((c) => c.id === order.clientId);
  const vehicle = vehicles.find((v) => v.id === order.vehicleId);
  const mechanic = mechanics.find((m) => m.id === order.mechanicId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Barra superior (não sai na impressão) */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">Comprovante de Ordem de Serviço</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Recibo
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Folha de Recibo / OS (Estilo Impressão) */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 print:p-0 print:m-0 font-sans text-xs">
          {/* Cabeçalho da Oficina */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                OFICINA RICO
              </h1>
              <p className="text-[11px] text-slate-600">
                Manutenção Preventiva, Freios, Suspensão, Injeção Eletrônica & Motores
              </p>
              <p className="text-[10px] text-slate-500">
                CNPJ: 12.345.678/0001-90 • Tel/WhatsApp: (11) 98244-0071 • Mecânico Responsável: Rico • São Paulo - SP
              </p>
            </div>
            <div className="text-right border-l-2 border-slate-200 pl-4">
              <span className="text-xs uppercase text-slate-500 block font-semibold">Ordem de Serviço</span>
              <span className="text-xl font-mono font-black text-slate-950">{order.orderNumber}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Data: {new Date(order.createdAt).toLocaleDateString('pt-BR')}
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
                {vehicle?.brand} {vehicle?.model} ({vehicle?.year})
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-900">
                Placa: {vehicle?.plate || '-'} | KM: {order.checklist.mileage.toLocaleString('pt-BR')} km
              </div>
              <div className="text-[11px] text-slate-700">
                Mecânico Resp.: {mechanic?.name || 'Rico'}
              </div>
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Sintoma Relatado / Diagnóstico Técnico:
            </span>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800">
              {order.technicalDiagnostic || order.complaintDescription || 'Revisão geral.'}
            </div>
          </div>

          {/* Tabela de Serviços e Peças */}
          <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-[11px]">
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
                {order.services.map((s) => (
                  <tr key={s.id}>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">{s.description}</td>
                    <td className="py-1.5 px-3 text-center text-slate-500">Mão de Obra</td>
                    <td className="py-1.5 px-3 text-center">1</td>
                    <td className="py-1.5 px-3 text-right font-mono">R$ {s.price.toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">R$ {s.price.toFixed(2)}</td>
                  </tr>
                ))}

                {/* Peças */}
                {order.parts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">
                      {p.description} <span className="text-[9px] text-slate-500">({p.code})</span>
                    </td>
                    <td className="py-1.5 px-3 text-center text-slate-500">Peça</td>
                    <td className="py-1.5 px-3 text-center">{p.quantity}</td>
                    <td className="py-1.5 px-3 text-right font-mono">R$ {p.unitPrice.toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold">R$ {p.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                    ? `PAGO (${order.paymentMethod?.toUpperCase() || 'À VISTA'})`
                    : 'PENDENTE NO BALCÃO'}
                </strong>
              </div>
            </div>

            <div className="text-right space-y-1 text-xs">
              <div>Peças: R$ {order.partsTotal.toFixed(2)}</div>
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
                  Acompanhamento da Garantia de 90 Dias & Histórico do Veículo:
                </strong>
                <p className="text-[10px] text-slate-700 mt-0.5 leading-relaxed">
                  Prezado(a) <strong>{client?.name || 'Cliente'}</strong>, salve o WhatsApp comercial da <strong>Oficina Rico</strong> (Rico: <strong>(11) 98244-0071</strong>) na sua agenda para acompanhar a garantia de 90 dias, receber laudos e o histórico preventivo do seu <strong>{vehicle?.brand} {vehicle?.model}</strong>.
                </p>
              </div>
            </div>

            <p className="leading-tight text-slate-600">
              Garantia legal de 90 (noventa) dias para serviços e peças novas aplicadas, conforme art. 26 do Código de
              Defesa do Consumidor. A garantia não cobre mau uso, sobrecarga, acidentes ou intervenção de terceiros.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="border-t border-slate-400 pt-1 text-center">
                <span className="block font-bold text-slate-800">Assinatura do Cliente</span>
                <span className="text-[9px] text-slate-500">Autorização e recebimento do veículo</span>
              </div>
              <div className="border-t border-slate-400 pt-1 text-center">
                <span className="block font-bold text-slate-800">Oficina Rico</span>
                <span className="text-[9px] text-slate-500">Rico - Responsável Técnico</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
