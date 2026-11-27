import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface MercosulPlateInputProps {
  value: string;
  onChange: (plate: string) => void;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const formatPlate = (raw: string): string => {
  // Remove tudo que não for letra ou número
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.slice(0, 7);
};

export const isValidPlateFormat = (plate: string): boolean => {
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 7) return false;
  // Padrão Mercosul: LLLNLNN (ex: ABC1D23)
  const isMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(clean);
  // Padrão Antigo: LLLNNNN (ex: ABC1234)
  const isAntiga = /^[A-Z]{3}[0-9]{4}$/.test(clean);
  return isMercosul || isAntiga;
};

export const MercosulPlateInput: React.FC<MercosulPlateInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  autoFocus = false,
}) => {
  const cleanPlate = formatPlate(value);
  const isValid = isValidPlateFormat(cleanPlate);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlate(e.target.value);
    onChange(formatted);
  };

  const handleClear = () => {
    if (!disabled) {
      onChange('');
    }
  };

  return (
    <div className={`relative inline-block w-full max-w-[280px] sm:max-w-[320px] mx-auto select-none ${className}`}>
      {/* Placa Container estilo Mercosul */}
      <div
        className={`bg-white rounded-xl border-4 ${
          isValid
            ? 'border-emerald-500 shadow-emerald-500/20'
            : cleanPlate.length > 0
            ? 'border-amber-500 shadow-amber-500/20'
            : 'border-slate-800'
        } shadow-lg overflow-hidden transition-all duration-200`}
      >
        {/* Faixa Azul Superior do Mercosul */}
        <div className="bg-[#003399] px-3 py-1 flex items-center justify-between text-white border-b-2 border-slate-900">
          {/* Logo Mercosul estilizado com 4 estrelas do Cruzeiro do Sul */}
          <div className="flex items-center gap-0.5 text-[10px] text-blue-200 font-bold tracking-tighter" title="Mercosul">
            <span>★</span>
            <span className="text-[8px] -mt-1">★</span>
            <span className="text-[7px]">★</span>
            <span className="text-[9px] -mt-0.5">★</span>
          </div>

          {/* Nome do País */}
          <span className="text-[11px] sm:text-xs font-black tracking-widest text-white uppercase drop-shadow-sm">
            BRASIL
          </span>

          {/* Mini Bandeira do Brasil */}
          <div
            className="w-4 h-3 bg-emerald-600 rounded-[2px] relative flex items-center justify-center overflow-hidden border border-emerald-700 shadow-xs"
            title="Brasil"
          >
            {/* Losango Amarelo */}
            <div className="w-2.5 h-2.5 bg-yellow-400 rotate-45 transform flex items-center justify-center">
              {/* Círculo Azul */}
              <div className="w-1.2 h-1.2 bg-blue-700 rounded-full" />
            </div>
          </div>
        </div>

        {/* Corpo da Placa com o Input */}
        <div className="relative bg-gradient-to-b from-slate-50 to-white px-3 py-2 flex items-center justify-center">
          <input
            type="text"
            value={cleanPlate}
            onChange={handleChange}
            disabled={disabled}
            autoFocus={autoFocus}
            maxLength={7}
            placeholder="ABC1D23"
            className="w-full bg-transparent text-center font-mono font-black text-2xl sm:text-3xl tracking-[0.25em] text-slate-950 placeholder-slate-300 focus:outline-none uppercase selection:bg-blue-600 selection:text-white"
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              textTransform: 'uppercase',
            }}
          />

          {/* Botão de Limpar (se tiver texto e não for disabled) */}
          {!disabled && cleanPlate.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 bg-slate-200/80 hover:bg-slate-300 rounded-full transition-colors"
              title="Limpar placa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Selo de Validação Positiva */}
          {isValid && (
            <div
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none"
              title="Formato Válido"
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Rótulo de Ajuda ou Formato */}
      <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-slate-400 font-medium">
        <span>Padrão Mercosul / Cinza</span>
        {isValid ? (
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            Placa Válida
          </span>
        ) : cleanPlate.length > 0 ? (
          <span className="text-amber-400">
            {7 - cleanPlate.length} caracter(es) restante(s)
          </span>
        ) : (
          <span>Digite as 7 letras/números</span>
        )}
      </div>
    </div>
  );
};
