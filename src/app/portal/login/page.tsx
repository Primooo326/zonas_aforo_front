'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { useResidentAuth } from '@/contexts/ResidentAuthContext';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function ResidentLoginPage() {
  const router = useRouter();
  const { login } = useResidentAuth();
  const [serverError, setServerError] = useState('');
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (form: LoginForm) => {
    setServerError('');
    setIsPendingApproval(false);

    try {
      const data = await apiFetch('/auth/propietario/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      login(data.access_token, data.propietario);
      router.push('/portal/hogar');
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Credenciales inválidas. Verifica tu correo y contraseña.';

      if (errorMsg.toLowerCase().includes('pendiente') || errorMsg.toLowerCase().includes('aprobación')) {
        setIsPendingApproval(true);
      } else {
        setServerError(errorMsg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
            Portal de Residentes
          </h1>
          <p className="text-sm text-base-content/70 mt-1">
            Gestiona tu hogar, familiares, mascotas y reservas de zonas comunes
          </p>
        </div>

        {/* Card */}
        <div className="card bg-base-100 border border-base-300 shadow-xl rounded-2xl overflow-hidden">
          <div className="card-body p-6 sm:p-8">
            <h2 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
              Iniciar Sesión
            </h2>

            {/* Error Message */}
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

            {/* Pending Approval Notice */}
            {isPendingApproval && (
              <div className="alert alert-warning mb-4 rounded-xl text-sm py-4 shadow-sm flex flex-col items-start gap-2 border border-warning/30">
                <div className="flex items-center gap-2 font-bold text-warning-content">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 shrink-0"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Cuenta en Revisión Administrativa</span>
                </div>
                <p className="text-xs text-warning-content/90 leading-relaxed">
                  Tu registro fue recibido con éxito. Para proteger la seguridad del conjunto, la administración debe verificar los datos del apartamento antes de habilitar tu acceso. Recibirás confirmación pronto.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div className="form-control">
                <label className="label pb-1.5" htmlFor="email">
                  <span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/80">
                    Correo Electrónico
                  </span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  autoComplete="email"
                  className={`input input-bordered w-full rounded-xl focus:border-primary text-base min-h-[48px] ${
                    errors.email ? 'input-error' : ''
                  }`}
                  {...register('email')}
                />
                {errors.email && (
                  <span className="text-error text-xs mt-1 font-medium">
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* Password */}
              <div className="form-control">
                <label className="label pb-1.5" htmlFor="password">
                  <span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/80">
                    Contraseña
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`input input-bordered w-full rounded-xl focus:border-primary pr-12 text-base min-h-[48px] ${
                      errors.password ? 'input-error' : ''
                    }`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content p-2 touch-manipulation"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full rounded-xl mt-6 min-h-[48px] text-base font-semibold shadow-md touch-manipulation flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <span>Ingresando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar a mi Hogar</span>
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

            <div className="divider my-6 text-xs text-base-content/40">O</div>

            {/* Helper links */}
            <div className="space-y-3 text-center text-xs text-base-content/70">
              <p>
                ¿Tienes una invitación con enlace de administración?{' '}
                <span className="font-semibold text-primary">
                  Ábrelo directamente desde tu mensaje de WhatsApp o correo.
                </span>
              </p>
              <div className="pt-2 border-t border-base-200">
                <Link
                  href="/auth/login"
                  className="link link-hover text-base-content/80 font-medium inline-flex items-center gap-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  Acceso exclusivo para Administración de Copropiedades
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
