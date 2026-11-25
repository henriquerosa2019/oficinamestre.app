import React, { useState } from 'react';
import { FinancialTransaction, Mechanic, ServiceOrder } from '../types';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  UserCheck,
  CreditCard,
  Trash2,
  Zap,
  Check,
  AlertCircle,
  Wrench,
  Search,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FinancialViewProps {
  transactions: FinancialTransaction[];
  mechanics: Mechanic[];
  orders: ServiceOrder[];
  onSaveTransaction: (tx: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

// Mapeamento para nomes de categoria curtos e limpos (sem quebrar linhas)
export function getShortCategory(cat: string): { label: string; badgeClass: string } {
  const c = (cat || '').toLowerCase();
  if (c.includes('peça') || c.includes('fornecedor') || c.includes('autopeça')) {
    return {
      label: 'Peças',
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    };
  }
  if (c.includes('fixo') || c.includes('aluguel') || c.includes('iptu') || c.includes('luz') || c.includes('energia')) {
    return {
      label: 'Fixo',
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    };
  }
  if (c.includes('comiss')) {
    return {
      label: 'Comissão',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }
  if (c.includes('serviço') || c.includes('ordem') || c.includes('revisão')) {
    return {
      label: 'Serviço',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    };
  }
  if (c.includes('fiel')) {
    return {
      label: '★ Fiel',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    };
  }
  if (c.includes('cliente')) {
    return {
      label: 'Cliente',
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    };
  }
  if (c.includes('app') || c.includes('uber') || c.includes('99')) {
    return {
      label: 'App',
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    };
  }
  return {
    label: cat.length > 12 ? cat.substring(0, 10) + '...' : cat,
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  };
}

const QUICK_EXPENSE_PRESETS = [
  { label: '🔧 Peça urgente', category: 'Peças', defaultDesc: 'Peça urgente no balcão' },
  { label: '🛵 Motoboy', category: 'Fixo', defaultDesc: 'Taxa entrega Motoboy' },
  { label: '☕ Café/Lanche', category: 'Fixo', defaultDesc: 'Lanche / Café oficina' },
  { label: '⛽ Combustível/Socorro', category: 'Fixo', defaultDesc: 'Combustível socorro pátio' },
  { label: '🧰 Ferramenta', category: 'Fixo', defaultDesc: 'Ferramenta rápida oficina' },
  { label: '🏢 Aluguel/Fixo', category: 'Fixo', defaultDesc: 'Despesa fixa oficina' },
];

const QUICK_REVENUE_PRESETS = [
  { label: '🏪 Venda balcão', category: 'Peças', defaultDesc: 'Venda de peça no balcão' },
  { label: '🔧 Serviço rápido', category: 'Serviço', defaultDesc: 'Serviço mecânico rápido' },
  { label: '🚗 Guincho/Socorro', category: 'Serviço', defaultDesc: 'Atendimento socorro / guincho' },
  { label: '💵 Recebimento avulso', category: 'Serviço', defaultDesc: 'Recebimento avulso cliente' },
];

export const FinancialView: React.FC<FinancialViewProps> = ({
  transactions,
  mechanics,
  orders,
  onSaveTransaction,
  onDeleteTransaction,
}) => {
  const [filterType, setFilterType] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do formulário simplificado de 3 campos
  const [type, setType] = useState<'despesa' | 'receita'>('despesa');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Peças');
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Cálculos Unificados dos Cards Superiores
  // 1. Entrou no Caixa (receitas efetivamente pagas)
  const totalEntrouNoCaixa = transactions
    .filter((t) => t.type === 'receita' && t.status === 'pago')
    .reduce((acc, t) => acc + t.amount, 0);

  // 2. Contas a Pagar (despesas ainda pendentes / a vencer)
  const totalContasAPagar = transactions
    .filter((t) => t.type === 'despesa' && t.status === 'pendente')
    .reduce((acc, t) => acc + t.amount, 0);

  // Despesas já quitadas
  const totalDespesasPagas = transactions
    .filter((t) => t.type === 'despesa' && t.status === 'pago')
    .reduce((acc, t) => acc + t.amount, 0);

  // 3. Balanço do Mês (Entrou no Caixa menos o que temos que pagar no mês)
  const balancoMes = totalEntrouNoCaixa - totalContasAPagar;

  // Cálculo das Comissões dos Mecânicos
  const mechanicCommissions = mechanics.map((mec) => {
    // Total gerado pelos serviços realizados em O.S.
    let totalComissaoGerada = 0;
    let totalServicosRealizados = 0;

    orders.forEach((ord) => {
      ord.services.forEach((s) => {
        if (s.mechanicId === mec.id) {
          totalComissaoGerada += s.commissionValue;
          totalServicosRealizados += 1;
        }
      });
    });

    // Total de pagamentos de comissão já lançados/quitados para este mecânico
    const totalComissaoJaPaga = transactions
      .filter(
        (t) =>
          t.type === 'despesa' &&
          (t.category === 'Comissão' || t.category === 'Comissão de Mecânicos') &&
          t.status === 'pago' &&
          (t.mechanicId === mec.id ||
            t.description.toLowerCase().includes(mec.name.toLowerCase().split(' ')[0]))
      )
      .reduce((acc, t) => acc + t.amount, 0);

    const aPagar = Math.max(0, totalComissaoGerada - totalComissaoJaPaga);

    return {
      mechanic: mec,
      totalComissaoGerada,
      totalComissaoJaPaga,
      aPagar,
      totalServicosRealizados,
    };
  });

  // 1 Toque para Pagar Comissão
  const handlePagarComissao = (mec: Mechanic, valorAPagar: number) => {
    if (valorAPagar <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const newTx: FinancialTransaction = {
      id: 'trx-' + Date.now(),
      type: 'despesa',
      category: 'Comissão',
      description: `Pagamento Comissão - ${mec.name}`,
      amount: valorAPagar,
      dueDate: today,
      paymentDate: today,
      status: 'pago',
      paymentMethod: 'pix',
      mechanicId: mec.id,
      createdAt: new Date().toISOString(),
    };

    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.6 },
    });

    onSaveTransaction(newTx);
  };

  // 1 Toque no Selo Pendente / Pago na Tabela
  const handleToggleTransactionStatus = (tx: FinancialTransaction) => {
    const isNowPaid = tx.status !== 'pago';
    const updated: FinancialTransaction = {
      ...tx,
      status: isNowPaid ? 'pago' : 'pendente',
      paymentDate: isNowPaid ? new Date().toISOString().split('T')[0] : undefined,
    };

    if (isNowPaid) {
      confetti({
        particleCount: 40,
        spread: 40,
        origin: { y: 0.7 },
      });
    }

    onSaveTransaction(updated);
  };

  // Abertura do Modal Rápido de 3 Campos
  const handleOpenQuickModal = (initialType: 'despesa' | 'receita' = 'despesa') => {
    setType(initialType);
    setAmount(0);
    setDescription('');
    setCategory(initialType === 'despesa' ? 'Peças' : 'Serviço');
    setStatus('pago'); // Padrão é pago na hora para despesas/receitas rápidas do balcão
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleSelectPreset = (preset: { label: string; category: string; defaultDesc: string }) => {
    setDescription(preset.defaultDesc);
    setCategory(preset.category);
  };

  const handleQuickAddAmount = (addValue: number) => {
    setAmount((prev) => Number((prev + addValue).toFixed(2)));
  };

  const handleSaveQuickTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const finalDesc = description.trim() || (type === 'despesa' ? 'Despesa de Caixa' : 'Receita de Balcão');

    const newTx: FinancialTransaction = {
      id: 'trx-' + Date.now(),
      type,
      category,
      description: finalDesc,
      amount: Number(amount),
      dueDate: dueDate || today,
      paymentDate: status === 'pago' ? dueDate || today : undefined,
      status,
      createdAt: new Date().toISOString(),
    };

    if (status === 'pago') {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });
    }

    onSaveTransaction(newTx);
    setIsModalOpen(false);
  };

  // Filtragem da tabela
  const filteredTransactions = transactions
    .filter((t) => {
      if (filterType !== 'todos' && t.type !== filterType) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        t.description.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term) ||
        (t.installmentInfo && t.installmentInfo.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      {/* Cards Superiores Renomeados e Unificados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Entrou no Caixa */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Entrou no Caixa
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              R$ {totalEntrouNoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">Dinheiro e Pix já recebidos</p>
          </div>
        </div>

        {/* Card 2: Contas a Pagar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-red-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contas a Pagar
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-red-400 font-mono">
              R$ {totalContasAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">Boletos e despesas a vencer</p>
          </div>
        </div>

        {/* Card 3: Balanço do Mês */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 shadow-sm bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Balanço do Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black font-mono ${
                balancoMes >= 0 ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              R$ {balancoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">Entrou no Caixa (-) Contas a Pagar</p>
          </div>
        </div>
      </div>

      {/* Grid Principal: Comissões dos Mecânicos & Contas a Pagar e Receber */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quadro Comissões dos Mecânicos (com botão Pagar em 1 toque) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                Comissões dos Mecânicos
              </h3>
              <p className="text-xs text-slate-400">Pague na sexta com apenas 1 clique</p>
            </div>
          </div>

          <div className="space-y-3">
            {mechanicCommissions.map((item) => (
              <div
                key={item.mechanic.id}
                className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs transition-all hover:border-slate-700"
              >
                <div>
                  <span className="font-bold text-white block text-sm">{item.mechanic.name}</span>
                  <span className="text-slate-400 text-[11px]">
                    Taxa: {item.mechanic.commissionRate}% • {item.totalServicosRealizados} serviço(s)
                  </span>
                  {item.totalComissaoJaPaga > 0 && (
                    <span className="text-[10px] text-emerald-400/90 block mt-0.5">
                      Quitado: R$ {item.totalComissaoJaPaga.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="text-right flex flex-col items-end gap-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      A Pagar:
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        item.aPagar > 0 ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      R$ {item.aPagar.toFixed(2)}
                    </span>
                  </div>

                  {/* Botão Pagar Comissão em 1 Toque */}
                  {item.aPagar > 0 ? (
                    <button
                      type="button"
                      onClick={() => handlePagarComissao(item.mechanic, item.aPagar)}
                      className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-sm transition-all active:scale-95"
                      title="Lança a saída no caixa e zera o saldo a pagar"
                    >
                      <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
                      Pagar
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      Quitado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabela Contas a Pagar e Receber */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Contas a Pagar e Receber
              </h3>
              <p className="text-xs text-slate-400">
                Toque no selo <strong className="text-amber-400">Pendente</strong> para dar baixa na hora
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro de Tipo */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="todos">Todos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>

              {/* Botão + Lançar Conta Rápido */}
              <button
                type="button"
                onClick={() => handleOpenQuickModal('despesa')}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                + Lançar Conta
              </button>
            </div>
          </div>

          {/* Tabela Desktop com Categoria Curta e Selo Pendente Clicável (hidden md:block) */}
          <div className="hidden md:block border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Tipo / Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-center">Status (1 Toque)</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                      Nenhum lançamento financeiro encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const shortCat = getShortCategory(tx.category);
                    const isPaid = tx.status === 'pago';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-white block">{tx.description}</span>
                          {tx.installmentInfo && (
                            <span className="text-[10px] text-amber-400 font-mono">
                              {tx.installmentInfo}
                            </span>
                          )}
                        </td>

                        {/* Categoria Curta sem quebra de linha */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${shortCat.badgeClass}`}
                          >
                            {shortCat.label}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                          {new Date(tx.dueDate).toLocaleDateString('pt-BR')}
                        </td>

                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            tx.type === 'receita' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {tx.type === 'receita' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                        </td>

                        {/* 1 Toque no Selo Pendente / Pago */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleTransactionStatus(tx)}
                            className={`group relative text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 ${
                              isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 hover:bg-emerald-500 hover:text-slate-950 border border-amber-500/40'
                            }`}
                            title={
                              isPaid
                                ? 'Toque para reabrir como Pendente'
                                : '1 TOQUE: Marcar como Pago na hora'
                            }
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                <span>Pago</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-400 group-hover:hidden" />
                                <CheckCircle className="w-3 h-3 hidden group-hover:inline text-slate-950" />
                                <span className="group-hover:hidden">Pendente</span>
                                <span className="hidden group-hover:inline font-black">Pagar Agora</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Cards de Transações no Mobile (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic bg-slate-950/40 rounded-xl border border-slate-800">
                Nenhum lançamento financeiro encontrado.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const shortCat = getShortCategory(tx.category);
                const isPaid = tx.status === 'pago';

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5 shadow-sm"
                  >
                    {/* Topo do card: Categoria, Vencimento e Excluir */}
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${shortCat.badgeClass}`}>
                          {shortCat.label}
                        </span>
                        <span className="text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(tx.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Excluir lançamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Descrição e Info de Parcelas */}
                    <div>
                      <span className="font-bold text-white text-xs block">{tx.description}</span>
                      {tx.installmentInfo && (
                        <span className="text-[10px] text-amber-400 font-mono block mt-0.5">
                          {tx.installmentInfo}
                        </span>
                      )}
                    </div>

                    {/* Rodapé: Valor e Botão 1 Toque */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span
                        className={`font-mono font-bold text-sm ${
                          tx.type === 'receita' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.type === 'receita' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleTransactionStatus(tx)}
                        className={`text-[11px] px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500 text-slate-950 font-black hover:bg-amber-400'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Pago</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Pagar Agora</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Lançar Conta Ultra-Rápido (3 Campos: Tipo, Valor e Motivo 1 Toque) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSaveQuickTransaction}>
              {/* Topo do Modal */}
              <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Lançamento Rápido de Caixa</h3>
                    <p className="text-[11px] text-slate-400">Tão simples quanto mandar um Pix</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* 1. É o quê? (Dois botões grandes no topo) */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    1. É o quê?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setType('despesa');
                        setCategory('Peças');
                      }}
                      className={`py-3 px-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${
                        type === 'despesa'
                          ? 'bg-red-500/20 border-red-500 text-red-300 shadow-md scale-[1.02]'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      Dinheiro Saiu (Gasto)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setType('receita');
                        setCategory('Serviço');
                      }}
                      className={`py-3 px-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${
                        type === 'receita'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md scale-[1.02]'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Dinheiro Entrou (Ganho)
                    </button>
                  </div>
                </div>

                {/* 2. Valor (Entrada grande com atalhos de soma) */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    2. Valor (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400 font-mono">
                      R$
                    </span>
                    <input
                      required
                      autoFocus
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-400 rounded-xl pl-11 pr-3 py-3 text-2xl font-black text-white font-mono placeholder-slate-600 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Atalhos rápidos de valores */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[10, 20, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickAddAmount(val)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 py-1 rounded text-[11px] font-mono font-bold transition-colors border border-slate-700"
                      >
                        +{val}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAmount(0)}
                      className="px-2 bg-slate-800 hover:bg-slate-700 text-slate-400 py-1 rounded text-[11px] transition-colors border border-slate-700"
                      title="Zerar valor"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* 3. Motivo (1 Toque com chips prontos) */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    3. Motivo (Toque em um ou digite abaixo)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(type === 'despesa' ? QUICK_EXPENSE_PRESETS : QUICK_REVENUE_PRESETS).map(
                      (preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            description === preset.defaultDesc
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      )
                    )}
                  </div>

                  {/* Campo de texto livre opcional */}
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ou digite o motivo se preferir (opcional)..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                {/* Situação e Vencimento */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Situação</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white text-xs"
                    >
                      <option value="pago">Liquidado (Pago agora)</option>
                      <option value="pendente">Pendente (Pagar depois)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Data</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Botão Salvar em 1 Clique */}
              <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={amount <= 0}
                  className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Confirmar {type === 'despesa' ? 'Saída' : 'Entrada'}
                  {amount > 0 && ` (R$ ${amount.toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
