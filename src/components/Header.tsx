import React from 'react';
import {
  Wrench,
  LayoutDashboard,
  KanbanSquare,
  Package,
  Users,
  DollarSign,
  PlusCircle,
  Database,
  RotateCcw,
  Car,
  BellRing,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'orders' | 'parts' | 'clients' | 'financial' | 'maintenance';
  setActiveTab: (tab: 'dashboard' | 'orders' | 'parts' | 'clients' | 'financial' | 'maintenance') => void;
  onNewOrder: () => void;
  carsInShopCount: number;
  pendingAlertsCount: number;
  onResetData: () => void;
  onExportData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNewOrder,
  carsInShopCount,
  pendingAlertsCount,
  onResetData,
  onExportData,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Marca */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Wrench className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">
                  Oficina<span className="text-amber-500">Mestre</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  MVP Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Gestão Ágil de Serviços, Peças & Clientes
              </p>
            </div>
          </div>

          {/* Navegação Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Painel
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <KanbanSquare className="w-4 h-4" />
              Ordens de Serviço
              {carsInShopCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-xs font-black px-1.5 py-0.2 rounded-full">
                  {carsInShopCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('parts')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'parts'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              Peças & Estoque (XML)
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'clients'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Clientes & Veículos
            </button>

            <button
              onClick={() => setActiveTab('financial')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'financial'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Financeiro
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'maintenance'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BellRing className="w-4 h-4 text-amber-400" />
              Retorno & Preventiva
              {pendingAlertsCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {pendingAlertsCount}
                </span>
              )}
            </button>
          </nav>

          {/* Ações Rápidas */}
          <div className="flex items-center gap-2">
            {/* Status Pátio */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs text-slate-300">
              <Car className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>
                Pátio: <strong className="text-white">{carsInShopCount}</strong> no serviço
              </span>
            </div>

            {/* Nova OS */}
            <button
              type="button"
              onClick={onNewOrder}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-sm shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Nova O.S.</span>
              <span className="sm:hidden">Nova OS</span>
            </button>

            {/* Menu Utilitário (Export / Reset) */}
            <div className="flex items-center gap-1 border-l border-slate-800 pl-2 ml-1">
              <button
                type="button"
                onClick={onExportData}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Backup dos dados (JSON)"
              >
                <Database className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onResetData}
                className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Recarregar Dados de Demonstração da Oficina"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação Mobile (Bottom Bar ou Sub-header) */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950/80 px-2 py-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium rounded ${
            activeTab === 'dashboard' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          Painel
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium rounded relative ${
            activeTab === 'orders' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <KanbanSquare className="w-4 h-4 mb-0.5" />
          Ordens
          {carsInShopCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-500"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('parts')}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium rounded ${
            activeTab === 'parts' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Package className="w-4 h-4 mb-0.5" />
          Estoque
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium rounded ${
            activeTab === 'clients' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          Clientes
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium rounded ${
            activeTab === 'financial' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <DollarSign className="w-4 h-4 mb-0.5" />
          Financeiro
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex flex-col items-center py-1 px-2 text-[11px] font-medium rounded relative ${
            activeTab === 'maintenance' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <BellRing className="w-4 h-4 mb-0.5" />
          Retorno
          {pendingAlertsCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          )}
        </button>
      </div>
    </header>
  );
};
