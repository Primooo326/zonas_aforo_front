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
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        className="checkbox checkbox-primary checkbox-sm"
        checked={activo}
        onChange={(e) => onActivar(dia, e.target.checked)}
      />
      <TimePicker
        value={activo ? rango.inicio : ''}
        disabled={!activo}
        className="input input-bordered input-sm flex-1 min-w-0"
        placeholder="Inicio"
        maxTime={rango.fin}
        onChange={(v) => onRango(dia, { inicio: v, fin: rango.fin })}
      />
      <span className="text-base-content/50 text-sm">–</span>
      <TimePicker
        value={activo ? rango.fin : ''}
        disabled={!activo}
        className="input input-bordered input-sm flex-1 min-w-0"
        placeholder="Fin"
        minTime={rango.inicio}
        onChange={(v) => onRango(dia, { inicio: rango.inicio, fin: v })}
      />
    </div>
  );
}