import { ServiceOrder, Client, Vehicle, OrderStatus } from '../types';
import { getOrderWarranty, formatBrDate } from '../utils/warranty';

export const WhatsAppService = {
  // Formata o telefone apenas com dígitos (ex: 5511987654321)
  cleanPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }
    return cleaned;
  },

  // 1. Mensagem de Orçamento Técnico (Status: 'orcamento' e 'aguardando_aprovacao')
  generateBudgetMessage(order: ServiceOrder, client: Client, vehicle: Vehicle): string {
    const clientFirstName = client.name.split(' ')[0];
    const orderDate = formatBrDate(order.entryDate || order.createdAt) || new Date().toLocaleDateString('pt-BR');

    let partsSection = '';
    if (order.partsSupplyMode === 'cliente_todas') {
      partsSection = `📦 *Peças & Insumos:*
  • Fornecidas integralmente pelo cliente (Sem cobrança de peças)
${order.clientProvidedPartsNotes ? `  ℹ️ *Itens trazidos:* ${order.clientProvidedPartsNotes}\n` : ''}*Total Peças:* R$ 0,00`;
    } else if (order.partsSupplyMode === 'cliente_parcial') {
      const partsList = order.parts.length
        ? order.parts.map((p) => `  • ${p.quantity}x ${p.description} (R$ ${p.total.toFixed(2)})`).join('\n')
        : '  (Nenhuma peça faltante)';
      partsSection = `📦 *Peças Faltantes (Fornecidas pela Oficina):*
${partsList}
${order.clientProvidedPartsNotes ? `  ℹ️ *Peças já trazidas pelo cliente:* ${order.clientProvidedPartsNotes}\n` : ''}*Total Peças Oficina:* R$ ${order.partsTotal.toFixed(2)}`;
    } else {
      const partsList = order.parts.length
        ? order.parts.map((p) => `  • ${p.quantity}x ${p.description} (R$ ${p.total.toFixed(2)})`).join('\n')
        : '  (Nenhuma peça necessária)';
      partsSection = `📦 *Peças Recomendadas:*
${partsList}
*Total Peças:* R$ ${order.partsTotal.toFixed(2)}`;
    }

    const servicesList = order.services.length
      ? order.services.map((s) => `  • ${s.description} (R$ ${s.price.toFixed(2)})`).join('\n')
      : '  (Nenhum serviço adicional)';

    const message = `🔧 *ORÇAMENTO TÉCNICO - OFICINA DO RICO*
-----------------------------------
Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina do Rico*!

Concluímos a avaliação técnica do seu *${vehicle.brand} ${vehicle.model}* (Placa: *${vehicle.plate}*).

📋 *Ordem de Serviço:* #${order.orderNumber}
📅 *Data:* ${orderDate} | *Validade:* 48h
🔍 *Diagnóstico / Avaliação:*
${order.technicalDiagnostic || order.complaintDescription || 'Revisão técnica de rotina.'}

${partsSection}

🛠️ *Mão de Obra Especializada:*
${servicesList}
*Total Serviços:* R$ ${order.servicesTotal.toFixed(2)}

${order.discount > 0 ? `💰 *Desconto Aplicado:* - R$ ${order.discount.toFixed(2)}\n` : ''}⭐ *VALOR TOTAL FINAL:* *R$ ${order.netTotal.toFixed(2)}*
-----------------------------------
👉 Para autorizar o início dos trabalhos, responda com *"AUTORIZADO"* aqui pelo WhatsApp!

📲 *Atenção:* Salve o WhatsApp da Oficina do Rico ((21) 96463-2820) na sua agenda para acompanhar o andamento da sua O.S., acionar a Garantia Legal e receber avisos sobre revisões preventivas.`;

    return message;
  },

  // 2. Mensagem de Orçamento Aprovado & Separação de Peças (Status: 'aprovado')
  generateApprovedMessage(order: ServiceOrder, client: Client, vehicle: Vehicle): string {
    const clientFirstName = client.name.split(' ')[0];

    const message = `📦 *ORÇAMENTO APROVADO & SEPARAÇÃO DE PEÇAS - OFICINA DO RICO*
-----------------------------------
Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina do Rico*!

Recebemos sua autorização para a *O.S. #${order.orderNumber}* do veículo *${vehicle.brand} ${vehicle.model}* (Placa: *${vehicle.plate}*).

Nossa equipe já está separando as peças e organizando o box de atendimento no pátio para o início dos trabalhos.

📋 *Ordem de Serviço:* #${order.orderNumber}
⭐ *Valor Aprovado:* R$ ${order.netTotal.toFixed(2)}

Assim que o veículo entrar no elevador e o mecânico iniciar a execução prática, enviaremos nova confirmação por aqui! 🤝`;

    return message;
  },

  // 3. Mensagem de Execução no Pátio (Status: 'em_andamento') - Avisa o cliente que os trabalhos começaram
  generateInExecutionMessage(
    order: ServiceOrder,
    client: Client,
    vehicle: Vehicle,
    mechanicName?: string
  ): string {
    const clientFirstName = client.name.split(' ')[0];

    const servicesList = order.services.length
      ? order.services.map((s) => `  • ${s.description}`).join('\n')
      : '  • Revisão mecânica especializada';

    const mechanicInfo = mechanicName ? `\n👨‍🔧 *Mecânico Responsável:* ${mechanicName}` : '';

    const message = `⚙️🔧 *VEÍCULO EM EXECUÇÃO NO PÁTIO - OFICINA DO RICO* 🚗
-----------------------------------
Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina do Rico*!

Passando para informar que o seu *${vehicle.brand} ${vehicle.model}* (Placa: *${vehicle.plate}*) já entrou na área de execução no nosso pátio e os trabalhos foram iniciados!
${mechanicInfo}
📋 *Ordem de Serviço:* #${order.orderNumber}

🛠️ *Serviços em Execução:*
${servicesList}

Nossa equipe técnica está cuidando do seu veículo com total rigor técnico, atenção e peças de qualidade.

Assim que os serviços forem concluídos e o carro passar pelo teste final de rodagem e checklist de segurança, avisaremos você imediatamente para a retirada! 🏁

Qualquer dúvida, estamos à disposição por aqui! 🤝`;

    return message;
  },

  // 4. Mensagem de Carro Pronto para Retirada (Status: 'pronto') - Avisa o cliente para vir buscar
  generateCarReadyMessage(order: ServiceOrder, client: Client, vehicle: Vehicle): string {
    const clientFirstName = client.name.split(' ')[0];
    const warranty = getOrderWarranty(order);

    const paymentStatusText = order.isPaid
      ? '*(PAGO)*'
      : '*(Pendente para acerto na retirada)*';

    const message = `🚗💨 *SEU VEÍCULO ESTÁ PRONTO PARA RETIRADA!* 🏁
-----------------------------------
Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina do Rico*!

Passando para avisar que o serviço no seu *${vehicle.brand} ${vehicle.model}* (Placa: *${vehicle.plate}*) foi finalizado com sucesso e o veículo foi 100% liberado nos testes finais de segurança e qualidade!

📋 *Ordem de Serviço:* #${order.orderNumber}
💰 *Valor Total:* R$ ${order.netTotal.toFixed(2)} ${paymentStatusText}

Nosso pátio já está liberado para você vir buscar seu veículo quando desejar!

📲 *Importante para sua Garantia:*
Por favor, *salve o WhatsApp da Oficina do Rico (Rico: (21) 96463-2820)* na sua agenda para acionar a garantia legal de ${warranty.warrantyDays} dias (*válida até ${warranty.formattedExpiryDate}*) e receber o histórico das próximas revisões preventivas do seu carro.

Estamos te aguardando! Se precisar combinar um horário especial de retirada, é só nos avisar por aqui. 🤝`;

    return message;
  },

  // 5. Mensagem de O.S. Finalizada & Quitada (Status: 'finalizado') - Recibo, comprovante e garantia
  generateFinalizedMessage(order: ServiceOrder, client: Client, vehicle: Vehicle): string {
    const clientFirstName = client.name.split(' ')[0];
    const warranty = getOrderWarranty(order);
    const finishDate = formatBrDate(order.finishedAt || order.updatedAt || order.serviceDate || new Date());

    const paymentText = order.paymentMethod
      ? `*(Pago via ${order.paymentMethod.toUpperCase()})*`
      : '*(Pago)*';

    const message = `🤝✅ *COMPROVANTE & TERMO DE GARANTIA - OFICINA DO RICO* 📄
-----------------------------------
Olá *${clientFirstName}*, muito obrigado pela confiança e preferência!

Confirmamos a conclusão e quitação da *O.S. #${order.orderNumber}* do seu *${vehicle.brand} ${vehicle.model}* (Placa: *${vehicle.plate}*).

📋 *Ordem de Serviço:* #${order.orderNumber}
💰 *Valor Total:* R$ ${order.netTotal.toFixed(2)} ${paymentText}
📅 *Data de Conclusão:* ${finishDate}
🛡️ *Garantia Legal CDC (${warranty.warrantyDays} dias):* Ativa e válida até *${warranty.formattedExpiryDate}*.

O prontuário completo do seu veículo está registrado em nosso sistema para seu controle.

Conte sempre com a equipe da Oficina do Rico! 🚗💨
Rico: (21) 96463-2820`;

    return message;
  },

  // 6. Mensagem de O.S. Cancelada (Status: 'cancelado')
  generateCancelledMessage(order: ServiceOrder, client: Client, vehicle: Vehicle): string {
    const clientFirstName = client.name.split(' ')[0];

    const message = `ℹ️ *ORDEM DE SERVIÇO CANCELADA - OFICINA DO RICO*
-----------------------------------
Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina do Rico*.

Passando para informar que a *O.S. #${order.orderNumber}* referente ao veículo *${vehicle.brand} ${vehicle.model}* (Placa: *${vehicle.plate}*) foi cancelada em nosso sistema.

Não há custos ou pendências financeiras registradas. Agradecemos pelo contato e permanecemos à sua inteira disposição para futuros orçamentos e revisões! 🤝`;

    return message;
  },

  // Despachante inteligente: Seleciona automaticamente o texto apropriado de acordo com o Status da O.S.
  getMessageForOrder(
    order: ServiceOrder,
    client: Client,
    vehicle: Vehicle,
    mechanicName?: string
  ): string {
    switch (order.status) {
      case 'orcamento':
      case 'aguardando_aprovacao':
        return this.generateBudgetMessage(order, client, vehicle);
      case 'aprovado':
        return this.generateApprovedMessage(order, client, vehicle);
      case 'em_andamento':
        return this.generateInExecutionMessage(order, client, vehicle, mechanicName);
      case 'pronto':
        return this.generateCarReadyMessage(order, client, vehicle);
      case 'finalizado':
        return this.generateFinalizedMessage(order, client, vehicle);
      case 'cancelado':
        return this.generateCancelledMessage(order, client, vehicle);
      default:
        return this.generateBudgetMessage(order, client, vehicle);
    }
  },

  // Rótulo descritivo para botões e tooltips de acordo com o status
  getWhatsAppActionTitle(status: OrderStatus): string {
    switch (status) {
      case 'orcamento':
      case 'aguardando_aprovacao':
        return 'Enviar Orçamento no WhatsApp';
      case 'aprovado':
        return 'Avisar Aprovação e Peças no WhatsApp';
      case 'em_andamento':
        return 'Avisar que está em Execução no Pátio';
      case 'pronto':
        return 'Avisar Carro Pronto para Retirada';
      case 'finalizado':
        return 'Enviar Comprovante & Garantia no WhatsApp';
      case 'cancelado':
        return 'Avisar Cancelamento no WhatsApp';
      default:
        return 'Enviar no WhatsApp';
    }
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
