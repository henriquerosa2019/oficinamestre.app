import { Client, Vehicle, ServiceOrder } from '../types';

/**
 * Retorna o último veículo utilizado ou cadastrado de um cliente.
 * Prioridade:
 * 1. Veículo da Ordem de Serviço mais recente deste cliente.
 * 2. Último veículo adicionado/cadastrado na lista de veículos do cliente.
 */
export function getClientLatestVehicle(
  clientId: string,
  vehicles: Vehicle[],
  orders: ServiceOrder[] = []
): Vehicle | undefined {
  if (!clientId) return undefined;
  const clientVehicles = vehicles.filter((v) => v.clientId === clientId);
  if (clientVehicles.length === 0) return undefined;
  if (clientVehicles.length === 1) return clientVehicles[0];

  // Busca na ordem de serviço mais recente deste cliente
  const clientOrders = orders
    .filter((o) => o.clientId === clientId && o.vehicleId)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.entryDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.entryDate || 0).getTime();
      return dateB - dateA;
    });

  if (clientOrders.length > 0) {
    const mostRecentOrderVehId = clientOrders[0].vehicleId;
    const foundInRecentOrder = clientVehicles.find((v) => v.id === mostRecentOrderVehId);
    if (foundInRecentOrder) {
      return foundInRecentOrder;
    }
  }

  // Fallback: o último veículo cadastrado na lista
  return clientVehicles[clientVehicles.length - 1];
}

/**
 * Localiza cliente por telefone, CPF/CNPJ ou nome digitado
 */
export function findClientByPhoneOrDoc(
  searchTerm: string,
  clients: Client[]
): Client | undefined {
  if (!searchTerm || !searchTerm.trim()) return undefined;
  const term = searchTerm.trim().toLowerCase();
  const cleanDigits = term.replace(/\D/g, '');

  // 1. Busca por telefone (igual, final ou início com ao menos 4 dígitos)
  if (cleanDigits.length >= 4) {
    const matchByPhone = clients.find((c) => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      return (
        cPhone.length >= 4 &&
        (cPhone === cleanDigits ||
          cPhone.endsWith(cleanDigits) ||
          cleanDigits.endsWith(cPhone) ||
          cPhone.includes(cleanDigits))
      );
    });
    if (matchByPhone) return matchByPhone;

    // 2. Busca por CPF/CNPJ
    const matchByDoc = clients.find((c) => {
      const cDoc = (c.document || '').replace(/\D/g, '');
      return (
        cDoc.length >= 4 &&
        (cDoc === cleanDigits ||
          cDoc.endsWith(cleanDigits) ||
          cleanDigits.endsWith(cDoc) ||
          cDoc.includes(cleanDigits))
      );
    });
    if (matchByDoc) return matchByDoc;
  }

  // 3. Busca por Nome (se ao menos 3 caracteres e for match exato ou único)
  if (term.length >= 3) {
    const nameMatches = clients.filter((c) => c.name.toLowerCase().includes(term));
    if (nameMatches.length === 1) return nameMatches[0];
  }

  return undefined;
}
