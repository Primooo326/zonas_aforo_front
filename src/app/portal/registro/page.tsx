'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { useResidentAuth } from '@/contexts/ResidentAuthContext';

const registroSchema = z
  .object({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegistroForm = z.infer<typeof registroSchema>;

interface PreloadData {
  valid?: boolean;
  valido?: boolean;
  email: string;
  nombre: string;
  torre?: string;
  numeroApto?: string;
  identificador?: string;
  tipoResidente?: string;
  edificioNombre?: string;
  edificio?: {
    nombre: string;
  };
}

function RegistroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const { login } = useResidentAuth();
  const [loadingToken, setLoadingToken] = useState(true);
  const [preloadData, setPreloadData] = useState<PreloadData | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroForm>({
    resolver: zodResolver(registroSchema),
  });

  useEffect(() => {
    if (!tokenParam) {
      setTokenError(
        'El enlace de invitación no contiene un token válido. Solicita uno a la administración.',
      );
      setLoadingToken(false);
      return;
    }

    async function validarToken() {
      try {
        const data = await apiFetch(`/auth/propietario/invitacion/${tokenParam}`);
        setPreloadData(data);
      } catch (err: unknown) {
        setTokenError(
          err instanceof Error
            ? err.message
            : 'El enlace de invitación ha expirado o no es válido.',
        );
      } finally {
        setLoadingToken(false);
      }
    }

    validarToken();
  }, [tokenParam]);

  const onSubmit = async (form: RegistroForm) => {
    setServerError('');
    try {
      const data = await apiFetch('/auth/propietario/registro-invitacion', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenParam,
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });

      login(data.access_token, data.propietario);
      router.push('/portal/hogar');
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al registrar tu cuenta.',
      );
    }
  };

  if (loadingToken) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm text-base-content/70">
          Verificando tu invitación con administración...
        </p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="card bg-base-100 border border-base-300 shadow-xl rounded-2xl overflow-hidden p-6 sm:p-8 max-w-md w-full mx-auto">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-black text-base-content">
            Invitación No Válida o Expirada
          </h2>
          <p className="text-sm text-base-content/70 leading-relaxed">
            {tokenError}
          </p>
          <div className="mt-4 flex flex-col gap-2 w-full">
            <Link href="/portal/login" className="btn btn-primary w-full rounded-xl">
              Ir al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 border border-base-300 shadow-xl rounded-2xl overflow-hidden max-w-lg w-full mx-auto">
      <div className="card-body p-6 sm:p-8">
        {/* Banner with Preloaded Unit Info */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
          <div className="flex items-center justify-between text-xs text-primary font-bold uppercase tracking-wider mb-2">
            <span>Invitación Oficial Verificada</span>
            <span className="badge badge-primary badge-sm">Censo Aprobado</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-base-content/60 font-medium">Inmueble</p>
              <p className="font-bold text-base-content text-base">
                {preloadData?.torre ? `Torre ${preloadData.torre} - ` : ''}
                Apto {preloadData?.numeroApto || preloadData?.identificador || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-base-content/60 font-medium">Copropiedad</p>
              <p className="font-bold text-base-content truncate">
                {preloadData?.edificioNombre || preloadData?.edificio?.nombre || 'Conjunto Residencial'}
              </p>
            </div>
            <div>
              <p className="text-xs text-base-content/60 font-medium">Titular</p>
              <p className="font-semibold text-base-content truncate">
                {preloadData?.nombre || 'Residente'}
              </p>
            </div>
            <div>
              <p className="text-xs text-base-content/60 font-medium">Correo Electrónico</p>
              <p className="font-semibold text-base-content truncate">
                {preloadData?.email}
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-base-content mb-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
          Crea tu Contraseña
        </h2>
        <p className="text-xs text-base-content/70 mb-5">
          Con esta contraseña podrás acceder a tu portal en cualquier momento para gestionar a tu familia y reservar zonas comunes.
        </p>

        {serverError && (
          <div className="alert alert-error mb-4 rounded-xl text-sm py-3 shadow-sm flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Password */}
          <div className="form-control">
            <label className="label pb-1.5" htmlFor="password">
              <span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/80">
                Nueva Contraseña
              </span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                className={`input input-bordered w-full rounded-xl focus:border-primary pr-12 text-base min-h-[48px] ${
                  errors.password ? 'input-error' : ''
                }`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content p-2"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <span className="text-error text-xs mt-1 font-medium">
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-control">
            <label className="label pb-1.5" htmlFor="confirmPassword">
              <span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/80">
                Confirmar Contraseña
              </span>
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repite la contraseña"
              className={`input input-bordered w-full rounded-xl focus:border-primary text-base min-h-[48px] ${
                errors.confirmPassword ? 'input-error' : ''
              }`}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <span className="text-error text-xs mt-1 font-medium">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full rounded-xl mt-6 min-h-[48px] text-base font-semibold shadow-md touch-manipulation flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                <span>Activando cuenta...</span>
              </>
            ) : (
              <>
                <span>Activar Cuenta y Entrar</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResidentRegistroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-3 shadow-inner">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
            Bienvenido a tu Hogar
          </h1>
          <p className="text-sm text-base-content/70 mt-1">
            Activa tu acceso verificado al Portal de Residentes
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/70">Cargando invitación...</p>
            </div>
          }
        >
          <RegistroContent />
        </Suspense>
      </div>
    </div>
  );
}
