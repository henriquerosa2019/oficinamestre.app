import React, { useState } from 'react';
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
  Workflow,
  Menu,
  X,
  ExternalLink,
  Phone,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'orders' | 'parts' | 'clients' | 'financial' | 'maintenance';
  setActiveTab: (tab: 'dashboard' | 'orders' | 'parts' | 'clients' | 'financial' | 'maintenance') => void;
  onNewOrder: () => void;
  carsInShopCount: number;
  totalOrdersCount?: number;
  pendingAlertsCount: number;
  onResetData: () => void;
  onExportData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onNewOrder,
  carsInShopCount,
  totalOrdersCount,
  pendingAlertsCount,
  onResetData,
  onExportData,
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <>
      {/* Header Superior Sticky */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Logo & Marca */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img
                src="/logo.png"
                alt="Oficina do Rico"
                className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-contain bg-slate-950 border border-amber-500/40 p-0.5 shadow-lg shadow-amber-500/20 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                    Oficina do <span className="text-amber-500">Rico</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                    Auto Mecânica
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                  Gestão Ágil de Serviços, Peças & Clientes • (21) 96463-2820
                </p>
              </div>
            </div>

            {/* Navegação Desktop */}
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Painel
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'orders'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <KanbanSquare className="w-3.5 h-3.5" />
                <span>O.S.</span>
                {carsInShopCount > 0 ? (
                  <span
                    className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                    title={`${carsInShopCount} no pátio (em andamento) • ${typeof totalOrdersCount === 'number' ? totalOrdersCount : carsInShopCount} O.S. no total`}
                  >
                    {carsInShopCount} pátio
                  </span>
                ) : typeof totalOrdersCount === 'number' ? (
                  <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full" title="Total de O.S. cadastradas">
                    {totalOrdersCount}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('parts')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'parts'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Estoque
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('clients')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'clients'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Clientes
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('maintenance')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative ${
                  activeTab === 'maintenance'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
                Preventiva
                {pendingAlertsCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                    {pendingAlertsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('financial')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'financial'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Financeiro
              </button>

              <a
                href="/fluxo-operacional.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 ml-1 shadow-sm"
                title="Abrir Fluxo Operacional Vertical em nova aba (Demonstração do Sistema)"
              >
                <Workflow className="w-3.5 h-3.5 text-amber-400" />
                Fluxo do App 🗺️
              </a>
            </nav>

            {/* Ações Rápidas */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Badge Pátio (Visível no Mobile e Desktop) */}
              <div
                onClick={() => setActiveTab('orders')}
                className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs text-slate-300 shadow-sm cursor-pointer hover:border-amber-500/40 transition-colors"
                title="Ver carros no pátio"
              >
                <Car className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="font-bold text-slate-300 hidden sm:inline uppercase">Pátio:</span>
                <strong className="text-amber-400 font-mono text-xs sm:text-sm font-black">{carsInShopCount}</strong>
                <span className="text-slate-400 font-medium hidden xs:inline">carros</span>
              </div>

              {/* Botão Nova OS */}
              <button
                type="button"
                onClick={onNewOrder}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span className="font-black">Nova O.S.</span>
              </button>

              {/* Menu Utilitário Desktop */}
              <div className="hidden sm:flex items-center gap-1 border-l border-slate-800 pl-2 ml-1">
                <button
                  type="button"
                  onClick={onExportData}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Backup dos dados (JSON)"
                >
                  <Database className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onResetData}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Recarregar Dados de Demonstração da Oficina"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Botão Drawer Menu Mobile */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Mais opções e ferramentas"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* BOTTOM NAVIGATION BAR NATIVA MOBILE (Fixa no rodapé para fácil acesso ao polegar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 px-1 py-1 shadow-2xl safe-area-inset-bottom">
        <div className="grid grid-cols-6 items-center">
          {/* Painel */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
              activeTab === 'dashboard'
                ? 'text-amber-400 font-black bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight font-bold">Painel</span>
            {activeTab === 'dashboard' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>

          {/* O.S. (Kanban) */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all relative ${
              activeTab === 'orders'
                ? 'text-amber-400 font-black bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <KanbanSquare className="w-4 h-4 mb-0.5" />
              {carsInShopCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full px-1 min-w-[14px] text-center leading-tight">
                  {carsInShopCount}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight font-bold">O.S.</span>
            {activeTab === 'orders' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>

          {/* Estoque */}
          <button
            type="button"
            onClick={() => setActiveTab('parts')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
              activeTab === 'parts'
                ? 'text-amber-400 font-black bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight font-bold">Estoque</span>
            {activeTab === 'parts' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>

          {/* Clientes */}
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
              activeTab === 'clients'
                ? 'text-amber-400 font-black bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight font-bold">Clientes</span>
            {activeTab === 'clients' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>

          {/* Preventiva */}
          <button
            type="button"
            onClick={() => setActiveTab('maintenance')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all relative ${
              activeTab === 'maintenance'
                ? 'text-amber-400 font-black bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <BellRing className="w-4 h-4 mb-0.5" />
              {pendingAlertsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full px-1 min-w-[14px] text-center leading-tight animate-pulse">
                  {pendingAlertsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight font-bold">Preventiva</span>
            {activeTab === 'maintenance' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>

          {/* Financeiro */}
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
              activeTab === 'financial'
                ? 'text-amber-400 font-black bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] leading-tight font-bold">Caixa</span>
            {activeTab === 'financial' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>
        </div>
      </nav>

      {/* DRAWER / BOTTOM SHEET MOBILE PARA FERRAMENTAS & UTILITÁRIOS */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-200">
            {/* Cabeçalho do Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Oficina do Rico"
                  className="w-8 h-8 rounded-full border border-amber-500/40 object-contain bg-slate-950 p-0.5"
                />
                <div>
                  <h4 className="text-sm font-black text-white">Oficina do Rico Pro</h4>
                  <p className="text-[11px] text-slate-400">Ferramentas & Demonstração</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ações do Drawer */}
            <div className="space-y-2">
              <a
                href="/fluxo-operacional.html"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Workflow className="w-4 h-4 text-amber-400" />
                  <span>Fluxo Operacional Vertical do App</span>
                </div>
                <ExternalLink className="w-4 h-4 text-amber-400" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onExportData();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 font-semibold text-xs hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Fazer Backup dos Dados (Download JSON)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onResetData();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-amber-400 font-semibold text-xs hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Recarregar Dados de Demonstração</span>
                </div>
              </button>
            </div>

            {/* Informações de Contato / Rodapé */}
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>WhatsApp Oficina: <strong>(21) 96463-2820</strong></span>
              </div>
              <p className="text-[10px] text-slate-500">
                OficinaMestre Pro • Versão Mobile 100% Responsiva
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
