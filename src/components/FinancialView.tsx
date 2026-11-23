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
} from 'lucide-react';

interface FinancialViewProps {
  transactions: FinancialTransaction[];
  mechanics: Mechanic[];
  orders: ServiceOrder[];
  onSaveTransaction: (tx: FinancialTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const EXPENSE_CATEGORIES = [
  'Fornecedor de Autopeças',
  'Ferramental e Equipamentos',
  'Aluguel e IPTU do Pátio/Oficina',
  'Energia Elétrica, Água e Gás',
  'Internet, Telefone e Software',
  'Folha de Pagamento / Pró-labore',
  'Comissão de Mecânicos',
  'Impostos e Tributos (DAS / Simples)',
  'Descarte Ecológico (Óleo e Baterias)',
  'Marketing e Divulgação',
  'Manutenção Predial e Limpeza',
  'Outras Despesas Operacionais',
  'Outra (digitar personalizada)...',
];

const REVENUE_CATEGORIES = [
  'Cliente Final',
  'Cliente Fiel',
  'Motorista de Aplicativo (Uber / 99 / Táxi)',
  'Frotista / Empresa Conveniada',
  'Venda de Peças no Balcão',
  'Serviço de Guincho / Socorro',
  'Serviços Terceirizados (Retífica/Funilaria)',
  'Outras Receitas',
  'Outra (digitar personalizada)...',
];

export const FinancialView: React.FC<FinancialViewProps> = ({
  transactions,
  mechanics,
  orders,
  onSaveTransaction,
  onDeleteTransaction,
}) => {
  const [filterType, setFilterType] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form nova despesa/receita
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [category, setCategory] = useState<string>('Fornecedor de Autopeças');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'pendente' | 'pago'>('pendente');

  const handleTypeChange = (newType: 'receita' | 'despesa') => {
    setType(newType);
    if (newType === 'despesa') {
      setCategory('Fornecedor de Autopeças');
    } else {
      setCategory('Cliente Final');
    }
    setCustomCategory('');
  };

  const handleOpenModal = () => {
    const initialType = filterType === 'receita' ? 'receita' : 'despesa';
    setType(initialType);
    setCategory(initialType === 'despesa' ? 'Fornecedor de Autopeças' : 'Cliente Final');
    setCustomCategory('');
    setDescription('');
    setAmount(0);
    setDueDate(new Date().toISOString().split('T')[0]);
    setStatus('pendente');
    setIsModalOpen(true);
  };

  // Cálculos Gerais
  const totalReceitas = transactions
    .filter((t) => t.type === 'receita')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalDespesas = transactions
    .filter((t) => t.type === 'despesa')
    .reduce((acc, t) => acc + t.amount, 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  // Cálculo de Comissões por Mecânico (a partir dos serviços de OS faturadas)
  const mechanicCommissions = mechanics.map((mec) => {
    let totalComissao = 0;
    let totalServicosRealizados = 0;

    orders.forEach((ord) => {
      ord.services.forEach((s) => {
        if (s.mechanicId === mec.id) {
          totalComissao += s.commissionValue;
          totalServicosRealizados += 1;
        }
      });
    });

    return {
      mechanic: mec,
      totalComissao,
      totalServicosRealizados,
    };
  });

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'todos') return true;
    return t.type === filterType;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory =
      category === 'Outra (digitar personalizada)...'
        ? customCategory.trim() || (type === 'despesa' ? 'Despesa Diversa' : 'Receita Diversa')
        : category;

    const newTx: FinancialTransaction = {
      id: 'trx-' + Date.now(),
      type,
      category: finalCategory,
      description: description.trim(),
      amount: Number(amount),
      dueDate,
      status,
      paymentDate: status === 'pago' ? dueDate : undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveTransaction(newTx);
    setIsModalOpen(false);

    // Reset
    setDescription('');
    setCustomCategory('');
    setAmount(0);
  };

  return (
    <div className="space-y-6">
      {/* Cards de Saldo e Totais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receitas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Recebido / A Receber
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400">
              R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">Serviços e vendas balcão</p>
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contas a Pagar / Despesas
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-red-400">
              R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">Autopeças, aluguel, luz e custos</p>
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 shadow-sm bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Saldo Líquido em Caixa
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black ${
                saldoLiquido >= 0 ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              R$ {saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">Resultado financeiro consolidado</p>
          </div>
        </div>
      </div>

      {/* Grid: Comissões dos Mecânicos & Lançamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Comissões dos Mecânicos */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-amber-400" />
            Comissões dos Mecânicos
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Cálculo automático sobre a mão de obra dos serviços executados
          </p>

          <div className="space-y-3">
            {mechanicCommissions.map((item) => (
              <div
                key={item.mechanic.id}
                className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block text-sm">{item.mechanic.name}</span>
                  <span className="text-slate-400 text-[11px]">
                    Taxa: {item.mechanic.commissionRate}% • {item.totalServicosRealizados} serviços
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">A Pagar:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    R$ {item.totalComissao.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Extrato / Lançamentos Financeiros (2 colunas) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                Contas a Pagar e Receber
              </h3>
              <p className="text-xs text-slate-400">Controle do fluxo de caixa e boletos</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200"
              >
                <option value="todos">Todos Lançamentos</option>
                <option value="receita">Apenas Receitas</option>
                <option value="despesa">Apenas Despesas</option>
              </select>

              <button
                onClick={handleOpenModal}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Lançar Conta
              </button>
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Tipo / Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white block">{tx.description}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {tx.category === 'Cliente Fiel' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          ★ Cliente Fiel
                        </span>
                      ) : tx.category === 'Cliente Final' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          Cliente Final
                        </span>
                      ) : tx.category === 'Fornecedor de Autopeças' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          Fornecedor de Autopeças
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/80">
                          {tx.category}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                      {new Date(tx.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        tx.type === 'receita' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {tx.type === 'receita' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          tx.status === 'pago'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {tx.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Novo Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <form onSubmit={handleSave}>
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Novo Lançamento Financeiro</h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Tipo de Movimento</label>
                    <select
                      value={type}
                      onChange={(e) => handleTypeChange(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="despesa">Despesa (A Pagar)</option>
                      <option value="receita">Receita (A Receber)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Categoria {type === 'despesa' ? '(Despesa)' : '(Receita)'}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      {type === 'despesa' ? (
                        EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))
                      ) : (
                        REVENUE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {category === 'Outra (digitar personalizada)...' && (
                  <div>
                    <label className="block text-amber-400 mb-1 font-medium">Nome da Categoria Personalizada</label>
                    <input
                      required
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Ex: Consultoria Contábil, Parceria Guincho..."
                      className="w-full bg-slate-800 border border-amber-500/60 rounded-lg p-2 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 mb-1">Descrição do Lançamento</label>
                  <input
                    required
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      type === 'despesa'
                        ? 'Ex: Boleto Distribuidora Pellegrino, Conta de Luz, Ferramental...'
                        : 'Ex: Pagamento O.S. #1002 - Revisão Completa, Balcão...'
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Valor (R$)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Data Vencimento</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Situação</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="pago">Já Pago / Liquidado</option>
                  </select>
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
