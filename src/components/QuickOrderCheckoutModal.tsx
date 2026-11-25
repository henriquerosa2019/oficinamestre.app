import React from 'react';
import { ServiceOrder, Client, Vehicle, Mechanic, PaymentMethod } from '../types';
import {
  X,
  CreditCard,
  DollarSign,
  QrCode,
  Clock,
  CheckCircle,
  Wrench,
  Car,
  User,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getOrderWarranty } from '../utils/warranty';

interface QuickOrderCheckoutModalProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCheckout: (order: ServiceOrder, paymentMethod: PaymentMethod, isPaid: boolean) => void;
  client?: Client;
  vehicle?: Vehicle;
  mechanic?: Mechanic;
}

export const QuickOrderCheckoutModal: React.FC<QuickOrderCheckoutModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirmCheckout,
  client,
  vehicle,
  mechanic,
}) => {
  if (!isOpen || !order) return null;

  const handleSelectPayment = (method: PaymentMethod, isPaid: boolean) => {
    if (isPaid) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
    onConfirmCheckout(order, method, isPaid);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Topo / Identificação da OS */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Finalizar O.S.</h3>
                <span className="text-xs bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                1 toque para liquidar, somar no caixa e registrar a comissão
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Serviço para o Mecânico */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-amber-400" />
                Veículo:
              </span>
              <span className="font-bold text-white">
                {vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'Veículo'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                Cliente:
              </span>
              <span className="font-bold text-slate-200">{client?.name || 'Cliente'}</span>
            </div>
            {mechanic && (
              <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  Mecânico ({mechanic.name}):
                </span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  Comissão: R$ {order.mechanicsCommissionTotal.toFixed(2)}
                </span>
              </div>
            )}

            {/* Data do Serviço & Vencimento da Garantia */}
            {(() => {
              const warranty = getOrderWarranty(order);
              return (
                <div className="border-t border-slate-800/80 pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {warranty.hasServiceDate ? 'Data do Serviço:' : 'Data de Entrada:'}
                    </span>
                    <span className="font-medium text-slate-200 text-xs mt-0.5 block font-mono">
                      {warranty.hasServiceDate ? warranty.formattedServiceDate : warranty.formattedEntryDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Venc. Garantia:
                    </span>
                    <span className="font-bold text-amber-400 text-xs mt-0.5 block font-mono">
                      {warranty.formattedExpiryDate} <span className="text-[10px] text-slate-500 font-sans">({warranty.warrantyDays}d)</span>
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Destaque do Valor Total */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-center">
            <span className="text-xs font-semibold text-emerald-400/90 uppercase tracking-wider block">
              Valor Total do Serviço
            </span>
            <div className="text-3xl font-black text-emerald-400 font-mono mt-0.5">
              R$ {order.netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {order.services.length} serviço(s) • {order.parts.length} peça(s)
            </p>
          </div>

          {/* Pergunta Direta: Como o cliente pagou? */}
          <div>
            <label className="text-xs font-bold text-slate-200 block mb-2.5">
              Como o cliente pagou? (Toque na opção desejada)
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Opção 1: Pix */}
              <button
                type="button"
                onClick={() => handleSelectPayment('pix', true)}
                className="p-4 bg-emerald-500/10 hover:bg-emerald-500/25 border-2 border-emerald-500/50 hover:border-emerald-400 rounded-xl text-left transition-all group flex flex-col justify-between active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Instantâneo
                  </span>
                </div>
                <div>
                  <span className="text-base font-black text-white group-hover:text-emerald-300 block">
                    Pix
                  </span>
                  <span className="text-[11px] text-slate-400">Caiu na conta na hora</span>
                </div>
              </button>

              {/* Opção 2: Cartão */}
              <button
                type="button"
                onClick={() => handleSelectPayment('cartao_credito', true)}
                className="p-4 bg-blue-500/10 hover:bg-blue-500/25 border-2 border-blue-500/50 hover:border-blue-400 rounded-xl text-left transition-all group flex flex-col justify-between active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                    Maquininha
                  </span>
                </div>
                <div>
                  <span className="text-base font-black text-white group-hover:text-blue-300 block">
                    Cartão
                  </span>
                  <span className="text-[11px] text-slate-400">Débito ou Crédito</span>
                </div>
              </button>

              {/* Opção 3: Dinheiro */}
              <button
                type="button"
                onClick={() => handleSelectPayment('dinheiro', true)}
                className="p-4 bg-amber-500/10 hover:bg-amber-500/25 border-2 border-amber-500/50 hover:border-amber-400 rounded-xl text-left transition-all group flex flex-col justify-between active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    Espécie
                  </span>
                </div>
                <div>
                  <span className="text-base font-black text-white group-hover:text-amber-300 block">
                    Dinheiro
                  </span>
                  <span className="text-[11px] text-slate-400">Na mão / Caixa físico</span>
                </div>
              </button>

              {/* Opção 4: Ficou de pagar depois */}
              <button
                type="button"
                onClick={() => handleSelectPayment('a_prazo', false)}
                className="p-4 bg-purple-500/10 hover:bg-purple-500/25 border-2 border-purple-500/50 hover:border-purple-400 rounded-xl text-left transition-all group flex flex-col justify-between active:scale-95"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    A Prazo
                  </span>
                </div>
                <div>
                  <span className="text-base font-black text-white group-hover:text-purple-300 block">
                    Pagar Depois
                  </span>
                  <span className="text-[11px] text-slate-400">Lança a receber (Pendente)</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé Cancelar */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 transition-colors"
          >
            Voltar sem finalizar
          </button>
        </div>
      </div>
    </div>
  );
};
