import { ServiceOrder, Client, Vehicle } from '../types';

export const WhatsAppService = {
  // Formata o telefone apenas com dígitos (ex: 5511987654321)
  cleanPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  },

  // Gera o texto formatado para envio do Orçamento ao Cliente
  generateBudgetMessage(order: ServiceOrder, client: Client, vehicle: Vehicle): string {
    const partsList = order.parts.length
      ? order.parts.map((p) => `  • ${p.quantity}x ${p.description} (R$ ${p.total.toFixed(2)})`).join('\n')
      : '  (Nenhuma peça requerida)';

    const servicesList = order.services.length
      ? order.services.map((s) => `  • ${s.description} (R$ ${s.price.toFixed(2)})`).join('\n')
      : '  (Nenhum serviço adicional)';

    const message = `🔧 *ORÇAMENTO OFICINA MECÂNICA* 🔧
-----------------------------------
Olá *${client.name.split(' ')[0]}*! Segue o orçamento para o seu veículo:

🚗 *Veículo:* ${vehicle.brand} ${vehicle.model} (${vehicle.year})
🏷️ *Placa:* ${vehicle.plate} | *KM:* ${vehicle.mileage.toLocaleString('pt-BR')} km
📋 *Nº da OS:* ${order.orderNumber}

🔍 *Sintoma / Diagnóstico:*
${order.technicalDiagnostic || order.complaintDescription}

📦 *Peças Necessárias:*
${partsList}
*Total Peças:* R$ ${order.partsTotal.toFixed(2)}

🛠️ *Mão de Obra (Serviços):*
${servicesList}
*Total Serviços:* R$ ${order.servicesTotal.toFixed(2)}

${order.discount > 0 ? `💰 *Desconto Concedido:* - R$ ${order.discount.toFixed(2)}\n` : ''}
⭐ *VALOR TOTAL FINAL:* *R$ ${order.netTotal.toFixed(2)}*
-----------------------------------
Para autorizar a realização dos serviços e o pedido das peças, por favor responda com:
👉 *\"AUTORIZADO\"* ou nos chame para tirar dúvidas!

Agradecemos a confiança! 🚀`;

    return message;
  },

  // Gera o link para notificar que o carro está pronto para retirada
  generateCarReadyMessage(order: ServiceOrder, client: Client, vehicle: Vehicle): string {
    const message = `🚗💨 *SEU CARRO ESTÁ PRONTO!* 🏁
-----------------------------------
Olá, *${client.name.split(' ')[0]}*!

O serviço no seu *${vehicle.brand} ${vehicle.model}* (Placa: *${vehicle.plate}*) foi concluído com sucesso e passou por todos os testes de qualidade.

📋 *Ordem de Serviço:* ${order.orderNumber}
💰 *Valor Total:* R$ ${order.netTotal.toFixed(2)} ${order.isPaid ? '*(PAGO)*' : '*(Pendente no balcão)*'}

Nosso pátio está liberado para você retirar o veículo.
Qualquer dúvida, estamos à disposição! 🤝`;

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
};
