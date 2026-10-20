'use client';

interface Etapa {
  id: string;
  titulo: string;
  descripcion?: string;
  icono?: string;
}

interface StepperProgresoProps {
  etapas: Etapa[];
  etapaActualIndex: number;
  onSeleccionarEtapa?: (index: number) => void;
  className?: string;
}

export default function StepperProgreso({
  etapas,
  etapaActualIndex,
  onSeleccionarEtapa,
  className = '',
}: StepperProgresoProps) {
  return (
    <nav
      aria-label="Progreso del formulario"
      className={`w-full ${className}`}
    >
      {/* Vista Móvil: Indicador compacto con contador y barra segmentada */}
      <div className="sm:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-base-content">
            Paso {etapaActualIndex + 1} de {etapas.length}
          </span>
          <span className="text-primary font-medium truncate max-w-[200px]">
            {etapas[etapaActualIndex]?.titulo}
          </span>
        </div>
        <div
          className="grid gap-1.5 w-full"
          style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
        >
          {etapas.map((etapa, idx) => {
            const esPasada = idx < etapaActualIndex;
            const esActual = idx === etapaActualIndex;
            return (
              <div
                key={etapa.id}
                className={`h-1.5 rounded-full transition-colors ${
                  esPasada
                    ? 'bg-primary'
                    : esActual
                    ? 'bg-primary'
                    : 'bg-base-300'
                }`}
                aria-hidden="true"
              />
            );
          })}
        </div>
      </div>

      {/* Vista Escritorio / Tablet: Stepper continuo con bordes finos */}
      <div className="hidden sm:grid grid-cols-4 gap-2">
        {etapas.map((etapa, idx) => {
          const esPasada = idx < etapaActualIndex;
          const esActual = idx === etapaActualIndex;
          const esInteractiva = esPasada && onSeleccionarEtapa;

          return (
            <button
              key={etapa.id}
              type="button"
              disabled={!esInteractiva && !esActual}
              onClick={() => esInteractiva && onSeleccionarEtapa(idx)}
              className={`p-3 rounded-lg border text-left transition-all ${
                esActual
                  ? 'bg-base-100 border-primary ring-1 ring-primary/30 shadow-none'
                  : esPasada
                  ? 'bg-base-100 border-base-content/15 text-base-content hover:border-primary/50 cursor-pointer'
                  : 'bg-base-200/50 border-base-content/10 text-base-content/50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold tabular-nums border ${
                    esActual
                      ? 'bg-primary text-primary-content border-primary'
                      : esPasada
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-base-300 text-base-content/50 border-transparent'
                  }`}
                >
                  {esPasada ? (
                    <span className="icon-[tabler--check] text-sm" aria-hidden="true" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <span
                  className={`text-xs font-semibold truncate ${
                    esActual ? 'text-primary' : esPasada ? 'text-base-content' : 'text-base-content/50'
                  }`}
                >
                  {etapa.titulo}
                </span>
              </div>
              {etapa.descripcion && (
                <p className="text-2xs text-base-content/60 truncate pl-8">
                  {etapa.descripcion}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
