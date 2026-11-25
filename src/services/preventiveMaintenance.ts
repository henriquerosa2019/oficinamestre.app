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

export const DEFAULT_MONTHLY_KM_BY_PROFILE: Record<VehicleUsageProfile, number> = {
  normal: 1000,
  app_severo: 3500,
  frota: 4000,
  severo_curto: 1200,
  moderado: 1600,
};

export const USAGE_PROFILE_LABELS: Record<VehicleUsageProfile, string> = {
  normal: 'Uso Normal (Passeio)',
  app_severo: 'Motorista de Aplicativo / Táxi',
  frota: 'Frota / Carga / Entregas',
  severo_curto: 'Trajeto Curto / Severo',
  moderado: 'Uso Moderado',
};

export const USAGE_PROFILE_BADGES: Record<
  VehicleUsageProfile,
  { label: string; icon: string; className: string }
> = {
  normal: {
    label: 'Passeio (~1.000 km/mês)',
    icon: '🚗',
    className: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  app_severo: {
    label: 'Uso Severo (App • ~3.500 km/mês)',
    icon: '⚠️',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
  frota: {
    label: 'Frota / Carga (~4.000 km/mês)',
    icon: '🚚',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
  severo_curto: {
    label: 'Trajeto Curto / Severo (~1.200 km/mês)',
    icon: '⚠️',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  },
  moderado: {
    label: 'Moderado (~1.600 km/mês)',
    icon: '🚙',
    className: 'bg-slate-800 text-slate-300 border-slate-700',
  },
};

// Prioridade de exibição dos serviços no card:
// 1º Trocas de Óleo, 2º Trocas de Velas, 3º Trocas de Filtros, 4º Trocas de Correias, 5º Freios, 6º Alinhamento, 7º Outros
export const getServicePriorityRank = (serviceName: string, serviceType?: string): number => {
  const s = (serviceName || '').toLowerCase();
  const st = (serviceType || '').toLowerCase();

  // 1. Trocas de Óleo
  if (
    st === 'troca_oleo' ||
    s.includes('óleo') ||
    s.includes('oleo') ||
    s.includes('lubrificante') ||
    s.includes('0w20') ||
    s.includes('5w30') ||
    s.includes('5w40') ||
    s.includes('10w40') ||
    s.includes('15w40')
  ) {
    return 1;
  }

  // 2. Trocas de Velas
  if (
    s.includes('vela') ||
    s.includes('velas') ||
    s.includes('ignição') ||
    s.includes('ignicao') ||
    s.includes('iridium')
  ) {
    return 2;
  }

  // 3. Trocas de Filtros
  if (s.includes('filtro') || s.includes('filtros')) {
    return 3;
  }

  // 4. Trocas de Correias
  if (
    st === 'correia_dentada' ||
    s.includes('correia') ||
    s.includes('dentada') ||
    s.includes('tensor') ||
    s.includes('esticador') ||
    s.includes('poly-v') ||
    s.includes('sincronizadora')
  ) {
    return 4;
  }

  // 5. Freios
  if (st === 'freios' || s.includes('freio') || s.includes('pastilha') || s.includes('disco')) {
    return 5;
  }

  // 6. Alinhamento / Suspensão
  if (
    st === 'alinhamento' ||
    s.includes('alinhamento') ||
    s.includes('balanceamento') ||
    s.includes('geometria')
  ) {
    return 6;
  }

  // 7. Demais manutenções (ex: Limpeza corpo de borboleta, TBI, bicos, etc.)
  return 7;
};

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

  // Retorna os parâmetros de intervalo (dias, meses e km) com base no serviço, perfil e média mensal de KM
  getIntervalParams(
    serviceType: PreventiveServiceType,
    usageProfile: VehicleUsageProfile = 'normal',
    monthlyKm?: number
  ): { intervalDays: number; intervalMonths: number; intervalKm: number; usageFactor: number } {
    let baseKm = 10000;
    let maxDaysCap = 365;
    let usageFactor = 1.0;

    switch (serviceType) {
      case 'troca_oleo':
        baseKm = 10000;
        if (usageProfile === 'app_severo') {
          usageFactor = 0.5; // 5.000 km
          maxDaysCap = 180;
        } else if (usageProfile === 'severo_curto') {
          usageFactor = 0.5; // 5.000 km
          maxDaysCap = 180;
        } else if (usageProfile === 'frota') {
          usageFactor = 0.6; // 6.000 km
          maxDaysCap = 180;
        } else if (usageProfile === 'moderado') {
          usageFactor = 0.8; // 8.000 km
          maxDaysCap = 240;
        } else {
          usageFactor = 1.0; // 10.000 km
          maxDaysCap = 365;
        }
        break;

      case 'correia_dentada':
        baseKm = 50000;
        if (usageProfile === 'app_severo') {
          usageFactor = 0.6; // 30.000 km
          maxDaysCap = 540; // 1.5 ano
        } else if (usageProfile === 'severo_curto') {
          usageFactor = 0.6;
          maxDaysCap = 730;
        } else if (usageProfile === 'frota') {
          usageFactor = 0.7; // 35.000 km
          maxDaysCap = 730;
        } else if (usageProfile === 'moderado') {
          usageFactor = 0.8; // 40.000 km
          maxDaysCap = 1095;
        } else {
          usageFactor = 1.0; // 50.000 km
          maxDaysCap = 1460;
        }
        break;

      case 'freios':
        baseKm = 25000;
        if (usageProfile === 'app_severo') {
          usageFactor = 0.5; // 12.500 km
          maxDaysCap = 150;
        } else if (usageProfile === 'severo_curto') {
          usageFactor = 0.5;
          maxDaysCap = 180;
        } else if (usageProfile === 'frota') {
          usageFactor = 0.6; // 15.000 km
          maxDaysCap = 180;
        } else if (usageProfile === 'moderado') {
          usageFactor = 0.8; // 20.000 km
          maxDaysCap = 365;
        } else {
          usageFactor = 1.0; // 25.000 km
          maxDaysCap = 540;
        }
        break;

      case 'alinhamento':
        baseKm = 10000;
        if (usageProfile === 'app_severo') {
          usageFactor = 0.5; // 5.000 km
          maxDaysCap = 75;
        } else if (usageProfile === 'severo_curto') {
          usageFactor = 0.5;
          maxDaysCap = 90;
        } else if (usageProfile === 'frota') {
          usageFactor = 0.6; // 6.000 km
          maxDaysCap = 90;
        } else if (usageProfile === 'moderado') {
          usageFactor = 0.8; // 8.000 km
          maxDaysCap = 180;
        } else {
          usageFactor = 1.0; // 10.000 km
          maxDaysCap = 180;
        }
        break;

      case 'revisao_geral':
      default:
        baseKm = 10000;
        if (usageProfile === 'app_severo') {
          usageFactor = 0.5;
          maxDaysCap = 90;
        } else if (usageProfile === 'severo_curto') {
          usageFactor = 0.5;
          maxDaysCap = 180;
        } else if (usageProfile === 'frota') {
          usageFactor = 0.6;
          maxDaysCap = 120;
        } else if (usageProfile === 'moderado') {
          usageFactor = 0.8;
          maxDaysCap = 240;
        } else {
          usageFactor = 1.0;
          maxDaysCap = 365;
        }
        break;
    }

    const intervalKm = Math.round(baseKm * usageFactor);
    const effectiveMonthlyKm = monthlyKm || DEFAULT_MONTHLY_KM_BY_PROFILE[usageProfile] || 1000;
    const calculatedDays = Math.ceil((intervalKm / effectiveMonthlyKm) * 30);
    const intervalDays = Math.max(15, Math.min(maxDaysCap, calculatedDays));
    const intervalMonths = Number((intervalDays / 30).toFixed(1));

    return {
      intervalDays,
      intervalMonths,
      intervalKm,
      usageFactor,
    };
  },

  // Cria um registro de manutenção preventiva a partir de uma OS
  createMaintenanceRecord(
    order: ServiceOrder,
    serviceName: string,
    vehicle: Vehicle
  ): MaintenanceRecord {
    const serviceType = this.detectServiceType(serviceName);
    const profile = vehicle.usageProfile || 'normal';
    const { intervalDays, intervalMonths, intervalKm } = this.getIntervalParams(
      serviceType,
      profile,
      vehicle.averageMonthlyKm
    );

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

    // Deduplica registros para o mesmo veículo e tipo/nome de serviço, mantendo sempre o mais recente
    const activeRecordsMap = new Map<string, MaintenanceRecord>();
    records.forEach((record) => {
      const serviceKey =
        record.serviceType && record.serviceType !== 'outro'
          ? record.serviceType
          : record.serviceName.trim().toLowerCase();
      const dedupKey = `${record.vehicleId}_${serviceKey}`;

      const existing = activeRecordsMap.get(dedupKey);
      if (!existing) {
        activeRecordsMap.set(dedupKey, record);
      } else {
        const timeCurrent = new Date(record.completedDate).getTime();
        const timeExisting = new Date(existing.completedDate).getTime();
        if (timeCurrent > timeExisting) {
          activeRecordsMap.set(dedupKey, record);
        }
      }
    });

    const dedupedRecords = Array.from(activeRecordsMap.values());
    const alerts: MaintenanceAlert[] = [];

    dedupedRecords.forEach((record) => {
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

    // Ordena os alertas internos de cada veículo por prioridade
    groupedList.forEach((group) => {
      group.alerts.sort((a, b) => {
        const isUrgentA = a.daysRemaining <= 30 || a.status !== 'em_dia';
        const isUrgentB = b.daysRemaining <= 30 || b.status !== 'em_dia';
        if (isUrgentA && !isUrgentB) return -1;
        if (!isUrgentA && isUrgentB) return 1;

        const rankA = getServicePriorityRank(a.record.serviceName, a.record.serviceType);
        const rankB = getServicePriorityRank(b.record.serviceName, b.record.serviceType);
        if (rankA !== rankB) return rankA - rankB;

        return a.daysRemaining - b.daysRemaining;
      });
      group.records = group.alerts.map((a) => a.record);
    });

    // Ordena a lista de veículos pela maior prioridade de urgência
    return groupedList.sort((a, b) => {
      const pA = this.getStatusPriority(a.worstStatus);
      const pB = this.getStatusPriority(b.worstStatus);
      if (pA !== pB) return pA - pB;
      return a.minDaysRemaining - b.minDaysRemaining;
    });
  },

  // Gera mensagem consolidada de WhatsApp (formato consultivo, humanizado e focado nas pendências e peças revisadas)
  generateGroupedWhatsAppReminder(grouped: GroupedVehicleAlert): string {
    const { vehicle, client, alerts } = grouped;
    const clientFirstName = client.name.split(' ')[0];

    // Ordenação estrita por urgência e prioridade das peças:
    // 1º Óleo, 2º Velas, 3º Filtros, 4º Correias, 5º Freios, 6º Alinhamento, 7º Outros
    const sortedAlerts = [...alerts].sort((a, b) => {
      const isUrgentA = a.daysRemaining <= 30 || a.status !== 'em_dia';
      const isUrgentB = b.daysRemaining <= 30 || b.status !== 'em_dia';
      if (isUrgentA && !isUrgentB) return -1;
      if (!isUrgentA && isUrgentB) return 1;

      const rankA = getServicePriorityRank(a.record.serviceName, a.record.serviceType);
      const rankB = getServicePriorityRank(b.record.serviceName, b.record.serviceType);
      if (rankA !== rankB) return rankA - rankB;

      return a.daysRemaining - b.daysRemaining;
    });

    const activeAlerts = sortedAlerts.filter((a) => a.daysRemaining <= 30 || a.status !== 'em_dia');
    const hasPendingUrgent = activeAlerts.length > 0;

    // Se há pendências reais (vencidos / <= 30 dias), foca nas pendências ativas
    // Se todos os serviços estão em dia (ex: revisão pós-serviço), contempla TODAS as peças trocadas
    const alertsToMention = hasPendingUrgent ? activeAlerts : sortedAlerts;

    // Cálculo do tempo decorrido desde o último serviço
    const firstRecord = alertsToMention[0]?.record || alerts[0]?.record;
    let timeText = 'cerca de 1 mês';
    if (firstRecord?.completedDate) {
      const lastCompletedDate = new Date(firstRecord.completedDate);
      const today = new Date();
      const diffDays = Math.max(1, Math.round((today.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24)));
      const diffMonths = Math.round(diffDays / 30.4);
      timeText = diffMonths <= 1 ? 'cerca de 1 mês' : diffMonths < 12 ? `cerca de ${diffMonths} meses` : 'cerca de 1 ano';
    }

    let targetDate = '';
    if (firstRecord?.estimatedReturnDate) {
      if (firstRecord.estimatedReturnDate.includes('T')) {
        const d = new Date(firstRecord.estimatedReturnDate);
        targetDate = !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : firstRecord.estimatedReturnDate;
      } else {
        const parts = firstRecord.estimatedReturnDate.split('-');
        targetDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : firstRecord.estimatedReturnDate;
      }
    }

    const isSevere =
      vehicle.usageProfile === 'app_severo' ||
      vehicle.usageProfile === 'frota' ||
      vehicle.usageProfile === 'severo_curto';
    const rateKm = vehicle.averageMonthlyKm || (isSevere ? 3500 : 1000);
    const severeNote = isSevere
      ? `\n💡 _Como você roda em regime severo (~${rateKm.toLocaleString('pt-BR')} km/mês), antecipar essa revisão aos ${firstRecord ? firstRecord.estimatedReturnMileage.toLocaleString('pt-BR') : ''} km protege o motor e evita paradas não planejadas!_\n`
      : '';

    const vehicleFullName = vehicle.model.toLowerCase().includes(vehicle.brand.toLowerCase())
      ? vehicle.model
      : `${vehicle.brand} ${vehicle.model}`;

    // CENÁRIO 1: Apenas 1 serviço no veículo
    if (alertsToMention.length === 1 && firstRecord) {
      return `Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina do Rico*!

Passando para checar como está o seu *${vehicleFullName}* após aquela *${firstRecord.serviceName.toLowerCase()}* que fizemos há ${timeText}.

Pela nossa previsão preventiva, já está chegando no período ideal de conferir novamente (aos *${firstRecord.estimatedReturnMileage.toLocaleString('pt-BR')} km* ou até *${targetDate}*) para garantir a sua segurança e não ter imprevistos na rua.
${severeNote}
Quer que reservemos um horário para você passar aqui esta semana?
👉 Responda com *"SIM, QUERO AGENDAR"* ou nos envie o dia de sua preferência! 🚀
🎁 *E Aproveite o Desconto de 10% para esta Revisão!!!!* 🏷️

-----------------------------------
_(Caso prefira não receber lembretes preventivos de segurança, basta nos responder com 'Não avisar')_`;
    }

    // CENÁRIO 2: Múltiplas pendências ativas (vencidas ou <= 30 dias) -> Alerta Combo
    if (hasPendingUrgent) {
      const itemsList = alertsToMention
        .map((a: MaintenanceAlert) => {
          const days = a.daysRemaining;
          const statusText =
            days < 0
              ? `_(Vencido há ${Math.abs(days)} dias • meta: ${a.record.estimatedReturnMileage.toLocaleString('pt-BR')} km)_`
              : days === 0
              ? `_(Vence Hoje • meta: ${a.record.estimatedReturnMileage.toLocaleString('pt-BR')} km)_`
              : days === 1
              ? `_(Vence Amanhã • meta: ${a.record.estimatedReturnMileage.toLocaleString('pt-BR')} km)_`
              : `_(Em ${days} dias • meta: ${a.record.estimatedReturnMileage.toLocaleString('pt-BR')} km)_`;
          return `• *${a.record.serviceName}* ${statusText}`;
        })
        .join('\n');

      return `Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina do Rico*!

Passando para checar como está o seu *${vehicleFullName}*.

Pela nossa previsão preventiva, identificamos que está chegando o momento ideal de conferir a revisão dos seguintes itens:
${itemsList}

💡 *PACOTE COMBO:* Fazendo a revisão desses ${alertsToMention.length} itens na mesma visita, você economiza tempo de pátio e garante condições especiais no pacote completo!
${severeNote}
Quer que reservemos um horário para você passar aqui esta semana?
👉 Responda com *"SIM, QUERO AGENDAR"* ou nos envie o dia de sua preferência! 🚀
🎁 *E Aproveite o Desconto de 10% para esta Revisão!!!!* 🏷️

-----------------------------------
_(Caso prefira não receber lembretes preventivos de segurança, basta nos responder com 'Não avisar')_`;
    }

    // CENÁRIO 3: Veículo com múltiplos serviços realizados (todas as peças trocadas na revisão em dia)
    // Contempla TODAS as peças: Óleo, Velas, Filtros, Correias e demais serviços, ordenados por prioridade!
    const targetMileage = firstRecord ? firstRecord.estimatedReturnMileage.toLocaleString('pt-BR') : '';

    const piecesList = alertsToMention
      .map((a: MaintenanceAlert) => `• *${a.record.serviceName}*`)
      .join('\n');

    return `Olá *${clientFirstName}*, tudo bem? Aqui é o *Rico da Oficina do Rico*!

Passando para checar como está o seu *${vehicleFullName}* após aquela revisão que realizamos há ${timeText}.

Naquela ocasião, realizamos a troca e conferência dos seguintes itens:
${piecesList}

Pela nossa previsão preventiva, já está chegando no período ideal de conferir novamente (aos *${targetMileage} km* ou até *${targetDate}*) para garantir a sua segurança e não ter imprevistos na rua.
${severeNote}
Gostaríamos de saber: o carro está respondendo bem? Sentiu melhoria no funcionamento e consumo?

Quer que reservemos um horário para você passar aqui esta semana?
👉 Responda com *"SIM, QUERO AGENDAR"* ou nos envie o dia de sua preferência! 🚀
🎁 *E Aproveite o Desconto de 10% para esta Revisão!!!!* 🏷️

-----------------------------------
_(Caso prefira não receber lembretes preventivos de segurança, basta nos responder com 'Não avisar')_`;
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
