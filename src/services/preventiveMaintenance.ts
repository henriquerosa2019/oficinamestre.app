import {
  MaintenanceRecord,
  MaintenanceAlert,
  GroupedVehicleAlert,
  PreventiveServiceType,
  VehicleUsageProfile,
  Vehicle,
  Client,
  ServiceOrder,
} from '../types';

export const PreventiveMaintenanceService = {
  // Detecta o tipo de serviço preventivo a partir do nome/descrição
  detectServiceType(serviceName: string): PreventiveServiceType {
    const s = serviceName.toLowerCase();
    if (s.includes('óleo') || s.includes('oleo') || s.includes('lubrificante') || s.includes('filtro de oleo')) {
      return 'troca_oleo';
    }
    if (s.includes('correia') || s.includes('tensor') || s.includes('dentada')) {
      return 'correia_dentada';
    }
    if (s.includes('pastilha') || s.includes('freio') || s.includes('disco') || s.includes('sapata') || s.includes('fluido')) {
      return 'freios';
    }
    if (s.includes('alinhamento') || s.includes('balanceamento') || s.includes('geometria') || s.includes('cambagem')) {
      return 'alinhamento';
    }
    if (s.includes('revisão') || s.includes('revisao') || s.includes('check') || s.includes('preventiva') || s.includes('vela')) {
      return 'revisao_geral';
    }
    return 'outro';
  },

  // Retorna os parâmetros de intervalo (dias e km) com base no serviço e perfil de rodagem
  getIntervalParams(
    serviceType: PreventiveServiceType,
    usageProfile: VehicleUsageProfile = 'normal'
  ): { intervalDays: number; intervalMonths: number; intervalKm: number } {
    switch (serviceType) {
      case 'troca_oleo':
        if (usageProfile === 'app_severo') {
          // Motorista de App roda 3.500 km/mês: óleo atinge 10.000 km em ~80 dias (menos de 3 meses!)
          return { intervalDays: 80, intervalMonths: 3, intervalKm: 10000 };
        } else if (usageProfile === 'moderado') {
          return { intervalDays: 180, intervalMonths: 6, intervalKm: 10000 };
        } else {
          // Normal: 1 ano (365 dias) ou 10.000 km
          return { intervalDays: 365, intervalMonths: 12, intervalKm: 10000 };
        }

      case 'correia_dentada':
        if (usageProfile === 'app_severo') {
          return { intervalDays: 540, intervalMonths: 18, intervalKm: 40000 }; // 1.5 ano
        } else if (usageProfile === 'moderado') {
          return { intervalDays: 1095, intervalMonths: 36, intervalKm: 45000 }; // 3 anos
        } else {
          return { intervalDays: 1460, intervalMonths: 48, intervalKm: 50000 }; // 4 anos
        }

      case 'freios':
        if (usageProfile === 'app_severo') {
          return { intervalDays: 150, intervalMonths: 5, intervalKm: 15000 };
        } else if (usageProfile === 'moderado') {
          return { intervalDays: 365, intervalMonths: 12, intervalKm: 20000 };
        } else {
          return { intervalDays: 540, intervalMonths: 18, intervalKm: 25000 };
        }

      case 'alinhamento':
        if (usageProfile === 'app_severo') {
          return { intervalDays: 75, intervalMonths: 2.5, intervalKm: 10000 };
        } else if (usageProfile === 'moderado') {
          return { intervalDays: 180, intervalMonths: 6, intervalKm: 10000 };
        } else {
          return { intervalDays: 180, intervalMonths: 6, intervalKm: 10000 };
        }

      case 'revisao_geral':
      default:
        if (usageProfile === 'app_severo') {
          return { intervalDays: 90, intervalMonths: 3, intervalKm: 10000 };
        } else if (usageProfile === 'moderado') {
          return { intervalDays: 180, intervalMonths: 6, intervalKm: 10000 };
        } else {
          return { intervalDays: 365, intervalMonths: 12, intervalKm: 10000 };
        }
    }
  },

  // Cria um registro de manutenção preventiva a partir de uma OS
  createMaintenanceRecord(
    order: ServiceOrder,
    serviceName: string,
    vehicle: Vehicle
  ): MaintenanceRecord {
    const serviceType = this.detectServiceType(serviceName);
    const profile = vehicle.usageProfile || 'normal';
    const { intervalDays, intervalMonths, intervalKm } = this.getIntervalParams(serviceType, profile);

    const completedDate = order.finishedAt?.split('T')[0] || order.createdAt.split('T')[0];
    const baseDate = new Date(completedDate);
    const returnDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    const estimatedReturnDate = returnDate.toISOString().split('T')[0];

    const currentMileage = order.checklist?.mileage || vehicle.mileage || 50000;
    const estimatedReturnMileage = currentMileage + intervalKm;

    return {
      id: 'mrec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      serviceOrderId: order.id,
      vehicleId: vehicle.id,
      clientId: order.clientId,
      serviceType,
      serviceName,
      completedDate,
      mileageAtService: currentMileage,
      usageProfile: profile,
      estimatedReturnDate,
      estimatedReturnMileage,
      intervalMonths,
      intervalKm,
      reminderSent7Days: false,
      reminderSent1Day: false,
    };
  },

  // Helper de prioridade de urgência para ordenação
  getStatusPriority(status: MaintenanceAlert['status']): number {
    switch (status) {
      case 'urgente_1dia':
        return 1; // Prioridade Máxima: fechar a agenda de amanhã/hoje
      case 'alerta_7dias':
        return 2; // Vence em até 7 dias: planejar a semana
      case 'vencido':
        return 3; // Vencidos: recuperar clientes em atraso
      case 'em_dia':
        return 4; // Em dia: futuro
      default:
        return 5;
    }
  },

  // Analisa todos os registros e calcula os alertas ordenados por urgência
  calculateAlerts(
    records: MaintenanceRecord[],
    vehicles: Vehicle[],
    clients: Client[],
    currentDateStr?: string
  ): MaintenanceAlert[] {
    const today = currentDateStr ? new Date(currentDateStr) : new Date();
    today.setHours(0, 0, 0, 0);

    const alerts: MaintenanceAlert[] = [];

    records.forEach((record) => {
      const vehicle = vehicles.find((v) => v.id === record.vehicleId);
      const client = clients.find((c) => c.id === record.clientId);
      if (!vehicle || !client) return;

      const returnDate = new Date(record.estimatedReturnDate);
      returnDate.setHours(0, 0, 0, 0);

      const diffTime = returnDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: MaintenanceAlert['status'] = 'em_dia';
      if (daysRemaining < 0) {
        status = 'vencido';
      } else if (daysRemaining <= 1) {
        status = 'urgente_1dia'; // Vence amanhã ou hoje
      } else if (daysRemaining <= 7) {
        status = 'alerta_7dias'; // Vence na próxima semana (1 a 7 dias)
      } else {
        status = 'em_dia';
      }

      alerts.push({
        record,
        vehicle,
        client,
        daysRemaining,
        status,
      });
    });

    // Ordenação estrita por prioridade de ação: 1º Urgente (Hoje/Amanhã), 2º 7 Dias, 3º Vencidos, 4º Em dia
    return alerts.sort((a, b) => {
      const pA = this.getStatusPriority(a.status);
      const pB = this.getStatusPriority(b.status);
      if (pA !== pB) return pA - pB;
      return a.daysRemaining - b.daysRemaining;
    });
  },

  // Agrupa os alertas por veículo para evitar múltiplos contatos desnecessários
  groupAlertsByVehicle(alerts: MaintenanceAlert[]): GroupedVehicleAlert[] {
    const groupsMap = new Map<string, GroupedVehicleAlert>();

    alerts.forEach((alert) => {
      const vId = alert.vehicle.id;
      if (!groupsMap.has(vId)) {
        groupsMap.set(vId, {
          vehicle: alert.vehicle,
          client: alert.client,
          alerts: [],
          records: [],
          worstStatus: alert.status,
          minDaysRemaining: alert.daysRemaining,
          isContacted: alert.record.contactStatus === 'avisado' || alert.record.contactStatus === 'agendado',
          contactedAt: alert.record.contactedAt,
        });
      }

      const grp = groupsMap.get(vId)!;
      grp.alerts.push(alert);
      grp.records.push(alert.record);

      // Pior status = maior prioridade
      if (this.getStatusPriority(alert.status) < this.getStatusPriority(grp.worstStatus)) {
        grp.worstStatus = alert.status;
      }
      if (alert.daysRemaining < grp.minDaysRemaining) {
        grp.minDaysRemaining = alert.daysRemaining;
      }

      if (alert.record.contactStatus === 'avisado' || alert.record.contactStatus === 'agendado') {
        grp.isContacted = true;
        if (alert.record.contactedAt && (!grp.contactedAt || alert.record.contactedAt > grp.contactedAt)) {
          grp.contactedAt = alert.record.contactedAt;
        }
      }
    });

    const groupedList = Array.from(groupsMap.values());

    // Ordena pela maior prioridade de urgência do veículo
    return groupedList.sort((a, b) => {
      const pA = this.getStatusPriority(a.worstStatus);
      const pB = this.getStatusPriority(b.worstStatus);
      if (pA !== pB) return pA - pB;
      return a.minDaysRemaining - b.minDaysRemaining;
    });
  },

  // Gera mensagem consolidada de WhatsApp (individual ou combo com múltiplos serviços)
  generateGroupedWhatsAppReminder(grouped: GroupedVehicleAlert): string {
    const { vehicle, client, alerts, worstStatus, minDaysRemaining } = grouped;
    const clientFirstName = client.name.split(' ')[0];

    const isApp = vehicle.usageProfile === 'app_severo';
    const profileText = isApp
      ? '🚕 *Perfil:* Motorista de Aplicativo / Uso Severo'
      : '🚗 *Perfil:* Uso Padrão';

    let urgencyHeadline = '';
    if (worstStatus === 'urgente_1dia') {
      urgencyHeadline = minDaysRemaining === 0 ? '⚠️ *ATENÇÃO: SUA REVISÃO VENCE HOJE!*' : '⚠️ *ATENÇÃO: SUA REVISÃO VENCE AMANHÃ!*';
    } else if (worstStatus === 'alerta_7dias') {
      urgencyHeadline = `🔔 *LEMBRETE PREVENTIVO: VENCE EM ${minDaysRemaining} DIAS!*`;
    } else if (worstStatus === 'vencido') {
      urgencyHeadline = `🚨 *AVISO: REVISÃO PREVENTIVA PENDENTE!*`;
    } else {
      urgencyHeadline = `📅 *PREVISÃO DE REVISÕES PREVENTIVAS*`;
    }

    const itemsList = alerts
      .map((a: MaintenanceAlert) => {
        const days = a.daysRemaining;
        const statusText =
          days < 0
            ? `_(Vencido há ${Math.abs(days)} dias)_`
            : days === 0
            ? `_(Vence Hoje!)_`
            : days === 1
            ? `_(Vence Amanhã!)_`
            : `_(Em ${days} dias)_`;
        return `• *${a.record.serviceName.toUpperCase()}* ${statusText}`;
      })
      .join('\n');

    return `${urgencyHeadline}
-----------------------------------
Olá *${clientFirstName}*, tudo bem? Aqui é da *Oficina Mestre*!

Cuidamos do histórico da sua *${vehicle.brand} ${vehicle.model}* para você não ter imprevistos na rua:

🚘 *Veículo:* ${vehicle.brand} ${vehicle.model}
🏷️ *Placa:* ${vehicle.plate}
${profileText}

🔧 *Serviço(s) no momento ideal de realização:*
${itemsList}

${
  alerts.length > 1
    ? `💡 *PACOTE COMBO:* Fazendo a revisão desses ${alerts.length} itens na mesma visita, você economiza tempo e garante condições especiais no pacote completo!`
    : isApp
    ? `💡 _Como você roda bastante com aplicativo, antecipar a troca protege seu motor e evita paradas não planejadas no meio das corridas!_`
    : `💡 _Revisões em dia garantem economia de combustível, segurança da sua família e valorização na revenda._`
}

Deseja que reservemos o melhor horário para você esta semana?
👉 Responda com *"SIM, QUERO AGENDAR"* ou nos envie o dia de sua preferência! 🚀`;
  },

  // Mantido para compatibilidade retroativa
  generateWhatsAppReminder(alert: MaintenanceAlert): string {
    return this.generateGroupedWhatsAppReminder({
      vehicle: alert.vehicle,
      client: alert.client,
      alerts: [alert],
      records: [alert.record],
      worstStatus: alert.status,
      minDaysRemaining: alert.daysRemaining,
      isContacted: alert.record.contactStatus === 'avisado' || alert.record.contactStatus === 'agendado',
      contactedAt: alert.record.contactedAt,
    });
  },
};
