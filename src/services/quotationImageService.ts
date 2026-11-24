import html2canvas from 'html2canvas';
import { WhatsAppService } from './whatsapp';

export interface QuotationSendResult {
  blob: Blob;
  dataUrl: string;
  copiedToClipboard: boolean;
  sharedNatively: boolean;
}

export const QuotationImageService = {
  // Gera o canvas da proposta com resolução de alta definição (2x / Retina)
  async generateImage(element: HTMLElement): Promise<{ blob: Blob; dataUrl: string }> {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Falha ao converter canvas para Blob PNG'));
      }, 'image/png');
    });

    return { blob, dataUrl };
  },

  // Copia a imagem PNG diretamente para a área de transferência do sistema
  async copyImageToClipboard(blob: Blob): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Não foi possível copiar a imagem diretamente para o clipboard:', err);
      return false;
    }
  },

  // Baixa o arquivo PNG no computador/dispositivo do usuário
  downloadImage(dataUrl: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // Fluxo completo de envio de orçamento via WhatsApp em PNG
  async sendQuotationToWhatsApp(options: {
    element: HTMLElement;
    orderNumber: string;
    phone: string;
    customText?: string;
  }): Promise<QuotationSendResult> {
    const {
      element,
      orderNumber,
      phone,
      customText = 'Para darmos início aos serviços, responda com *AUTORIZADO*',
    } = options;

    const { blob, dataUrl } = await this.generateImage(element);
    const filename = `orcamento-${orderNumber}.png`;

    let sharedNatively = false;

    // 1. Tenta compartilhamento nativo com arquivo (ex: mobile/tablets modernos)
    const file = new File([blob], filename, { type: 'image/png' });
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: customText,
        });
        sharedNatively = true;
      } catch (e) {
        // Usuário cancelou ou navegador não completou o compartilhamento
      }
    }

    // 2. Copia o PNG diretamente para a área de transferência (para colar com Ctrl+V)
    const copiedToClipboard = await this.copyImageToClipboard(blob);

    // 3. Baixa o PNG como arquivo de segurança
    this.downloadImage(dataUrl, filename);

    // 4. Se não abriu via compartilhamento nativo, abre a janela do WhatsApp com o texto
    if (!sharedNatively) {
      WhatsAppService.openWhatsAppChat(phone, customText);
    }

    return {
      blob,
      dataUrl,
      copiedToClipboard,
      sharedNatively,
    };
  },
};
