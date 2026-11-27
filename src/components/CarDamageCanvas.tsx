import React, { useState } from 'react';
import { DamagePoint } from '../types';
import { AlertCircle, Trash2, Plus } from 'lucide-react';

interface CarDamageCanvasProps {
  damagePoints: DamagePoint[];
  onChange: (points: DamagePoint[]) => void;
  readOnly?: boolean;
}

export const CarDamageCanvas: React.FC<CarDamageCanvasProps> = ({ damagePoints, onChange, readOnly = false }) => {
  const [selectedType, setSelectedType] = useState<DamagePoint['type']>('risco');
  const [partNameInput, setPartNameInput] = useState('');

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const newPoint: DamagePoint = {
      id: 'dp-' + Date.now(),
      x,
      y,
      type: selectedType,
      partName: partNameInput || `${selectedType.toUpperCase()} marcado`,
    };

    onChange([...damagePoints, newPoint]);
    setPartNameInput('');
  };

  const handleRemovePoint = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(damagePoints.filter((p) => p.id !== id));
  };

  const getTypeColor = (type: DamagePoint['type']) => {
    switch (type) {
      case 'risco':
        return 'bg-amber-500 border-amber-300 text-amber-950';
      case 'amassado':
        return 'bg-red-500 border-red-300 text-white';
      case 'quebrado':
        return 'bg-purple-600 border-purple-300 text-white';
      case 'trincado':
        return 'bg-blue-500 border-blue-300 text-white';
      default:
        return 'bg-yellow-400 border-yellow-200 text-slate-900';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#f97316]" />
            Checklist de Lataria & Avarias Externas
          </h4>
          <p className="text-xs text-slate-500">
            {readOnly
              ? 'Avarias registradas na recepção do veículo'
              : 'Clique sobre a silhueta do veículo para marcar riscos, amassados ou peças quebradas.'}
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DamagePoint['type'])}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 text-slate-800 font-semibold focus:outline-none focus:border-[#f97316]"
            >
              <option value="risco">🟡 Risco / Ralado</option>
              <option value="amassado">🔴 Amassado</option>
              <option value="trincado">🔵 Trincado (Vidro/Farol)</option>
              <option value="quebrado">🟣 Peça Quebrada</option>
            </select>
            <input
              type="text"
              placeholder="Obs da avaria (opcional)"
              value={partNameInput}
              onChange={(e) => setPartNameInput(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 text-slate-800 w-40 focus:outline-none focus:border-[#f97316]"
            />
          </div>
        )}
      </div>

      {/* Silhueta Vetorial do Carro Interativa */}
      <div
        onClick={handleCanvasClick}
        className={`relative w-full max-w-lg mx-auto aspect-[16/9] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none ${
          !readOnly ? 'cursor-crosshair hover:border-slate-700' : ''
        }`}
      >
        {/* SVG Esquema de Carro Vista Superior / Lateral */}
        <svg
          viewBox="0 0 600 320"
          className="w-full h-full opacity-40 hover:opacity-50 transition-opacity pointer-events-none stroke-slate-400 fill-slate-900/30"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Contorno Geral do Veículo (Vista de Cima) */}
          <path d="M 160 30 C 220 20, 380 20, 440 30 C 470 35, 490 60, 500 100 C 510 140, 510 180, 500 220 C 490 260, 470 285, 440 290 C 380 300, 220 300, 160 290 C 130 285, 110 260, 100 220 C 90 180, 90 140, 100 100 C 110 60, 130 35, 160 30 Z" />

          {/* Capô / Dianteira */}
          <path d="M 130 90 L 190 90 C 190 60, 180 40, 160 35" strokeDasharray="3 3" />
          <path d="M 130 230 L 190 230 C 190 260, 180 280, 160 285" strokeDasharray="3 3" />
          <line x1="190" y1="60" x2="190" y2="260" />

          {/* Para-brisa dianteiro */}
          <path d="M 200 65 Q 230 160 200 255" />

          {/* Teto e Colunas */}
          <rect x="220" y="70" width="160" height="180" rx="10" />

          {/* Vidro Traseiro */}
          <path d="M 390 65 Q 370 160 390 255" />

          {/* Porta-malas / Traseira */}
          <line x1="420" y1="50" x2="420" y2="270" strokeDasharray="3 3" />

          {/* Pneus */}
          <rect x="150" y="10" width="45" height="18" rx="4" className="fill-slate-700" />
          <rect x="150" y="292" width="45" height="18" rx="4" className="fill-slate-700" />
          <rect x="405" y="10" width="45" height="18" rx="4" className="fill-slate-700" />
          <rect x="405" y="292" width="45" height="18" rx="4" className="fill-slate-700" />

          {/* Retrovisores */}
          <rect x="200" y="22" width="18" height="10" rx="3" />
          <rect x="200" y="288" width="18" height="10" rx="3" />

          {/* Identificadores textuais de apoio */}
          <text x="120" y="165" className="text-[12px] fill-slate-400 stroke-none font-sans font-bold">FRENTE</text>
          <text x="440" y="165" className="text-[12px] fill-slate-400 stroke-none font-sans font-bold">TRASEIRA</text>
        </svg>

        {/* Pontos Marcados */}
        {damagePoints.map((point, index) => (
          <div
            key={point.id}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full border-2 text-[10px] font-black shadow-lg cursor-pointer transform hover:scale-125 transition-transform ${getTypeColor(
              point.type
            )}`}
            title={`${point.partName} (${point.type})`}
          >
            {index + 1}
          </div>
        ))}
      </div>

      {/* Lista de Avarias Registradas */}
      {damagePoints.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
          {damagePoints.map((point, index) => (
            <div
              key={point.id}
              className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${getTypeColor(point.type)}`}>
                  {index + 1}
                </span>
                <span className="font-bold capitalize text-slate-900">[{point.type}]</span>
                <span className="truncate text-slate-600 font-medium">{point.partName}</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => handleRemovePoint(point.id, e)}
                  className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors"
                  title="Remover ponto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-center text-xs text-slate-400 italic">
          Nenhuma avaria de lataria assinalada no checklist de entrada.
        </p>
      )}
    </div>
  );
};
