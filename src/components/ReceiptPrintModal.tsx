import React, { useRef, useState } from 'react';
import { ServiceOrder, Client, Vehicle, Mechanic } from '../types';
import { Printer, X, MessageCircle, Download, Check, Copy } from 'lucide-react';
import { ReceiptDocument } from './ReceiptDocument';
import { QuotationImageService } from '../services/quotationImageService';
import { WhatsAppService } from '../services/whatsapp';

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

  const isQuotation = order.status === 'orcamento' || order.status === 'aguardando_aprovacao';

  const documentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [feedbackInfo, setFeedbackInfo] = useState<{
    copied: boolean;
    shared: boolean;
    dataUrl: string;
    blob: Blob;
  } | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsAppPng = async () => {
    if (!documentRef.current || !client?.phone) return;
    setIsGeneratingPng(true);
    try {
      const res = await QuotationImageService.sendQuotationToWhatsApp({
        element: documentRef.current,
        orderNumber: order.orderNumber,
        phone: client.phone,
        customText: 'Para darmos início aos serviços, responda com *AUTORIZADO*',
      });
      setFeedbackInfo({
        copied: res.copiedToClipboard,
        shared: res.sharedNatively,
        dataUrl: res.dataUrl,
        blob: res.blob,
      });
    } catch (err) {
      console.error('Erro ao gerar orçamento PNG:', err);
      alert('Não foi possível gerar a imagem do orçamento. Tente novamente.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!documentRef.current) return;
    setIsGeneratingPng(true);
    try {
      const { dataUrl } = await QuotationImageService.generateImage(documentRef.current);
      QuotationImageService.downloadImage(dataUrl, `orcamento-${order.orderNumber}.png`);
    } catch (err) {
      console.error('Erro ao baixar PNG:', err);
      alert('Não foi possível baixar a imagem. Tente novamente.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  const handleCopyPngAgain = async () => {
    if (!feedbackInfo?.blob) return;
    const ok = await QuotationImageService.copyImageToClipboard(feedbackInfo.blob);
    if (ok) {
      alert('Imagem copiada novamente para a área de transferência!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Barra superior (não sai na impressão) */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">
              {isQuotation ? 'Proposta de Orçamento Técnico' : 'Comprovante de Ordem de Serviço'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão Enviar no WhatsApp (PNG) */}
            {client?.phone && isQuotation && (
              <button
                type="button"
                onClick={handleSendWhatsAppPng}
                disabled={isGeneratingPng}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
                title="Gera imagem PNG da proposta e abre o WhatsApp com a mensagem: Para darmos início aos serviços, responda com AUTORIZADO"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{isGeneratingPng ? 'Gerando PNG...' : 'Enviar no WhatsApp (PNG)'}</span>
              </button>
            )}

            {/* Botão Baixar Imagem PNG */}
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isGeneratingPng}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors border border-slate-700 disabled:opacity-50"
              title="Baixar imagem em PNG de alta resolução"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Baixar PNG</span>
            </button>

            {/* Botão Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isQuotation ? 'Imprimir' : 'Imprimir Recibo'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner de Feedback ao Enviar no WhatsApp */}
        {feedbackInfo && (
          <div className="p-4 bg-emerald-950/70 border-b border-emerald-800/80 text-emerald-100 flex items-start justify-between gap-3 print:hidden">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Orçamento em PNG gerado com sucesso!</span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                {feedbackInfo.copied
                  ? 'A imagem da proposta foi copiada para sua Área de Transferência e baixada no seu computador. No WhatsApp Web aberto, basta teclar Ctrl+V para colar a imagem!'
                  : 'O arquivo PNG foi baixado no seu computador. Basta anexar a imagem na conversa do WhatsApp que foi aberta!'}
              </p>
              <p className="text-xs text-emerald-300 font-medium">
                Mensagem enviada no WhatsApp: <em>&ldquo;Para darmos início aos serviços, responda com *AUTORIZADO*&rdquo;</em>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {client?.phone && (
                <button
                  type="button"
                  onClick={() =>
                    WhatsAppService.openWhatsAppChat(
                      client.phone,
                      'Para darmos início aos serviços, responda com *AUTORIZADO*'
                    )
                  }
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold"
                >
                  Reabrir WhatsApp
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyPngAgain}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copiar Novamente
              </button>
              <button
                type="button"
                onClick={() => setFeedbackInfo(null)}
                className="p-1 text-emerald-400 hover:text-white"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Folha de Recibo / OS (Estilo Impressão) */}
        <div className="p-8 overflow-y-auto bg-slate-100/50 print:p-0 print:m-0 flex justify-center">
          <div className="bg-white shadow-lg print:shadow-none rounded-xl print:rounded-none overflow-hidden">
            <ReceiptDocument
              ref={documentRef}
              order={order}
              client={client}
              vehicle={vehicle}
              mechanic={mechanic}
              isQuotation={isQuotation}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

