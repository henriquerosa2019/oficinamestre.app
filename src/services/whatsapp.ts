import { ServiceOrder, Client, Vehicle } from '../types';
import { getOrderWarranty } from '../utils/warranty';

export const WhatsAppService = {
  // Formata o telefone apenas com dígitos (ex: 5511987654321)
  cleanPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  },

  // Gera o texto formatado para envio do Orçamento ao Cliente (Tom consultivo e transparente)
  generateBudgetMessage(order: ServiceOrder, client: Client, vehicle: Vehicle): string {
    const clientFirstName = client.name.split(' ')[0];
    const partsList = order.parts.length
      ? order.parts.map((p) => `  • ${p.quantity}x ${p.description} (R$ ${p.total.toFixed(2)})`).join('\n')
      : '  (Nenhuma peça necessária)';

    const servicesList = order.services.length
      ? order.services.map((s) => `  • ${s.description} (R$ ${s.price.toFixed(2)})`).join('\n')
      : '  (Nenhum serviço adicional)';

    const message = `🔧 *ORÇAMENTO TÉCNICO - OFICINA RICO*
-----------------------------------
Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina Rico*!

Concluímos a avaliação técnica do seu *${vehicle.brand} ${vehicle.model}* (Placa: *${vehicle.plate}*). Segue o demonstrativo transparente dos itens necessários:

📋 *Ordem de Serviço:* #${order.orderNumber}
🔍 *Diagnóstico / Avaliação:*
${order.technicalDiagnostic || order.complaintDescription || 'Revisão técnica de rotina.'}

📦 *Peças Recomendadas:*
${partsList}
*Total Peças:* R$ ${order.partsTotal.toFixed(2)}

🛠️ *Mão de Obra Especializada:*
${servicesList}
*Total Serviços:* R$ ${order.servicesTotal.toFixed(2)}

${order.discount > 0 ? `💰 *Desconto Aplicado:* - R$ ${order.discount.toFixed(2)}\n` : ''}⭐ *VALOR TOTAL FINAL:* *R$ ${order.netTotal.toFixed(2)}*
-----------------------------------
Podemos dar início aos serviços e à separação das peças?
👉 Responda com *"AUTORIZADO"* ou nos mande uma mensagem se tiver qualquer dúvida!

📲 *Dica:* Salve o WhatsApp da Oficina Rico (Rico) na sua agenda para acompanhar o andamento da sua O.S. e a garantia dos serviços.`;

    return message;
  },

  // Gera a mensagem quando o carro está pronto para retirada (com lembrete de salvar contato para garantia de 90 dias)
  generateCarReadyMessage(order: ServiceOrder, client: Client, vehicle: Vehicle): string {
    const clientFirstName = client.name.split(' ')[0];
    const warranty = getOrderWarranty(order);

    const message = `🚗💨 *SEU VEÍCULO ESTÁ PRONTO!* 🏁
-----------------------------------
Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina Rico*!

Passando para avisar que o serviço no seu *${vehicle.brand} ${vehicle.model}* (Placa: *${vehicle.plate}*) foi finalizado com sucesso e o veículo foi liberado nos testes finais de segurança.

📋 *Ordem de Serviço:* #${order.orderNumber}
💰 *Valor Total:* R$ ${order.netTotal.toFixed(2)} ${order.isPaid ? '*(PAGO)*' : '*(Pendente para acerto na retirada)*'}

Nosso pátio já está liberado para você retirar o veículo quando desejar!

📲 *Importante para sua Garantia:*
Por favor, *salve o WhatsApp da Oficina Rico (Rico)* na sua agenda para acompanhar a garantia legal de ${warranty.warrantyDays} dias (*válida até ${warranty.formattedExpiryDate}*) e receber o histórico das próximas preventivas do seu carro.

Qualquer dúvida ou se precisar de um horário especial de retirada, estamos à disposição por aqui! 🤝`;

    return message;
  },

  // Gera a URL do WhatsApp Web / Mobile
  createWhatsAppLink(phone: string, text: string): string {
    const cleaned = this.cleanPhoneNumber(phone);
    const encoded = encodeURIComponent(text);
    return `https://wa.me/${cleaned}?text=${encoded}`;
  },

  // Abre diretamente a janela do WhatsApp
  openWhatsAppChat(phone: string, text: string): void {
    const link = this.createWhatsAppLink(phone, text);
    window.open(link, '_blank', 'noopener,noreferrer');
  },

  // Copia texto para a área de transferência do sistema
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Falha ao copiar texto:', err);
      return false;
    }
  },
};
