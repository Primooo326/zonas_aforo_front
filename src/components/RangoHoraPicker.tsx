'use client';

import TimePicker from '@/components/TimePicker';

export interface RangoHora {
  inicio: string;
  fin: string;
}

interface RangoHoraPickerProps {
  dia: string;
  activo: boolean;
  rango: RangoHora;
  onActivar: (dia: string, activo: boolean) => void;
  onRango: (dia: string, rango: RangoHora) => void;
}

export default function RangoHoraPicker({
  dia,
  activo,
  rango,
  onActivar,
  onRango,
}: RangoHoraPickerProps) {
  return (
    <div className="flex items-center gap-2.5">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className="checkbox checkbox-primary w-5 h-5 rounded-md"
          checked={activo}
          onChange={(e) => onActivar(dia, e.target.checked)}
          aria-label={`Activar ${dia}`}
        />
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activo ? 'bg-success/15 text-success' : 'bg-base-200 text-base-content/70'}`}>
          {activo ? 'Abierto' : 'Cerrado'}
        </span>
      </label>
      <TimePicker
        value={activo ? rango.inicio : ''}
        disabled={!activo}
        className={`input input-bordered input-sm flex-1 min-w-0 font-medium ${!activo ? 'opacity-50 bg-base-200/50' : 'bg-base-100'}`}
        placeholder="Hora Apertura"
        maxTime={rango.fin}
        onChange={(v) => onRango(dia, { inicio: v, fin: rango.fin })}
      />
      <span className="text-base-content/70 font-bold text-sm px-0.5">a</span>
      <TimePicker
        value={activo ? rango.fin : ''}
        disabled={!activo}
        className={`input input-bordered input-sm flex-1 min-w-0 font-medium ${!activo ? 'opacity-50 bg-base-200/50' : 'bg-base-100'}`}
        placeholder="Hora Cierre"
        minTime={rango.inicio}
        onChange={(v) => onRango(dia, { inicio: rango.inicio, fin: v })}
      />
    </div>
  );
}