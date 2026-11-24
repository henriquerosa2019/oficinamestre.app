import { toPng, toBlob } from 'html-to-image';
import { WhatsAppService } from './whatsapp';

export interface QuotationSendResult {
  blob: Blob;
  dataUrl: string;
  copiedToClipboard: boolean;
  sharedNatively: boolean;
}

export const QuotationImageService = {
  // Gera o canvas/PNG da proposta com resolução de alta definição (2x / Retina)
  async generateImage(element: HTMLElement): Promise<{ blob: Blob; dataUrl: string }> {
    try {
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          opacity: '1',
          visibility: 'visible',
          transform: 'none',
          margin: '0',
        },
      });

      let blob: Blob | null = null;
      try {
        blob = await toBlob(element, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          style: {
            opacity: '1',
            visibility: 'visible',
            transform: 'none',
            margin: '0',
          },
        });
      } catch (err) {
        console.warn('Fallback toBlob via fetch(dataUrl):', err);
      }

      if (!blob) {
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }

      return { blob, dataUrl };
    } catch (err) {
      console.error('Erro em QuotationImageService.generateImage:', err);
      throw err;
    }
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
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Falha ao baixar imagem:', err);
    }
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
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: customText,
        });
        sharedNatively = true;
      }
    } catch (e) {
      // Usuário cancelou ou navegador não completou o compartilhamento
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

