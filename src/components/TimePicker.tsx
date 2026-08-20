'use client';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  minTime?: string;
  maxTime?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function aMinutos(t: string | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function aHora(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function TimePicker({
  value,
  onChange,
  minTime,
  maxTime,
  placeholder = 'HH:MM',
  disabled = false,
  className = 'input input-bordered',
}: TimePickerProps) {
  const aplicarLimites = (v: string) => {
    const min = aMinutos(minTime);
    const max = aMinutos(maxTime);
    const cur = aMinutos(v);
    if (cur === null) return v;
    if (min !== null && cur < min) return aHora(min);
    if (max !== null && cur > max) return aHora(max);
    return v;
  };

  return (
    <input
      type="time"
      step="60"
      className={className}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      min={minTime}
      max={maxTime}
      onChange={(e) => onChange(aplicarLimites(e.target.value))}
    />
  );
}