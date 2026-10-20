'use client';

interface AforoScaleMeterProps {
  aforoActual: number;
  aforoMaximo: number;
  mostrarEtiqueta?: boolean;
  mostrarCifras?: boolean;
  tamano?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AforoScaleMeter({
  aforoActual,
  aforoMaximo,
  mostrarEtiqueta = true,
  mostrarCifras = true,
  tamano = 'md',
  className = '',
}: AforoScaleMeterProps) {
  const max = Math.max(1, aforoMaximo);
  const actual = Math.max(0, aforoActual);
  const pct = Math.min(100, Math.round((actual / max) * 100));
  const disponibles = Math.max(0, max - actual);

  // Determinar color arquitectónico según capacidad
  const estadoColor =
    pct >= 100
      ? {
          activeBg: 'bg-error',
          badgeText: 'text-error',
          badgeBg: 'bg-error/10 border-error/20',
          texto: 'Capacidad completa',
        }
      : pct >= 75
      ? {
          activeBg: 'bg-warning',
          badgeText: 'text-warning',
          badgeBg: 'bg-warning/10 border-warning/20',
          texto: `${disponibles} ${disponibles === 1 ? 'cupo disponible' : 'cupos disponibles'}`,
        }
      : {
          activeBg: 'bg-success',
          badgeText: 'text-success',
          badgeBg: 'bg-success/10 border-success/20',
          texto: `${disponibles} ${disponibles === 1 ? 'cupo disponible' : 'cupos disponibles'}`,
        };

  // Número de segmentos en el escalímetro (máximo 20 para visualización limpia)
  const numSegmentos = max <= 10 ? max : max <= 20 ? max : 16;
  const segmentosLlenos = Math.min(
    numSegmentos,
    Math.round((actual / max) * numSegmentos)
  );

  const alturaSegmento =
    tamano === 'sm' ? 'h-1.5' : tamano === 'lg' ? 'h-3' : 'h-2';

  return (
    <div
      className={`w-full flex flex-col gap-1.5 ${className}`}
      role="meter"
      aria-label="Indicador de aforo"
      aria-valuenow={actual}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={`${actual} de ${max} personas. ${estadoColor.texto}`}
    >
      {/* Cabecera métrica con números tabulares */}
      {(mostrarCifras || mostrarEtiqueta) && (
        <div className="flex items-center justify-between text-xs sm:text-sm">
          {mostrarCifras && (
            <span className="tabular-nums font-semibold text-base-content flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-bold">{actual}</span>
              <span className="text-base-content/50">/</span>
              <span className="text-base-content/70">{max}</span>
              <span className="text-2xs text-base-content/60 font-normal ml-0.5">personas</span>
            </span>
          )}

          {mostrarEtiqueta && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium border ${estadoColor.badgeBg} ${estadoColor.badgeText}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${estadoColor.activeBg}`}
                aria-hidden="true"
              />
              {estadoColor.texto}
            </span>
          )}
        </div>
      )}

      {/* Regla métrica segmentada (Escalímetro arquitectónico) */}
      <div
        className="grid gap-1 w-full bg-base-300/40 p-1 rounded-md border arch-border"
        style={{
          gridTemplateColumns: `repeat(${numSegmentos}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: numSegmentos }).map((_, index) => {
          const estaLleno = index < segmentosLlenos;
          return (
            <div
              key={index}
              className={`meter-segment ${alturaSegmento} ${
                estaLleno
                  ? estadoColor.activeBg
                  : 'bg-base-300 dark:bg-base-content/10'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
