'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const irARegistro = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const emailVal = getValues('email') || '';
    const passVal = getValues('password') || '';
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'prefill_register',
        JSON.stringify({ email: emailVal, password: passVal }),
      );
    }
    router.push('/auth/register');
  };

  const onSubmit = async (form: LoginForm) => {
    setServerError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      login(data.access_token, data.edificio);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Datos incorrectos. Verifica tu correo y contraseña.';
      setServerError(errorMsg);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-base-200 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="arch-panel p-6 sm:p-8 w-full">
          <header className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-primary">
              <span className="icon-[tabler--building] text-2xl" aria-hidden="true" />
            </div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-primary">
              Acceso Administrativo
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-base-content mt-1">
              Iniciar Sesión
            </h1>
            <p className="mt-1 text-sm text-base-content/70">
              Ingresa al panel de control de tu copropiedad
            </p>
          </header>

          {serverError && (
            <div className="p-3.5 mb-5 rounded-md border border-error/30 bg-error/10 text-error text-sm flex flex-col gap-1.5">
              <span>{serverError}</span>
              <button
                type="button"
                onClick={irARegistro}
                className="font-semibold underline underline-offset-4 text-error hover:text-error/80 transition-opacity w-fit text-left cursor-pointer"
              >
                Registrar edificio
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="label-text text-sm font-semibold">Correo Electrónico</span>
              <input
                type="email"
                placeholder="admin@tuedificio.com"
                {...register('email')}
                className="input input-md text-base rounded-md arch-border"
              />
              {errors.email && <span className="text-error text-xs font-medium">{errors.email.message}</span>}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="label-text text-sm font-semibold">Contraseña</span>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="input input-md w-full pr-12 text-base rounded-md arch-border"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-base-content/50 hover:text-primary transition-colors focus:outline-none bg-transparent hover:bg-transparent border-0 flex items-center justify-center cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <span className="icon-[tabler--eye-off] text-lg" aria-hidden="true" />
                  ) : (
                    <span className="icon-[tabler--eye] text-lg" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && <span className="text-error text-xs font-medium">{errors.password.message}</span>}
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-md w-full mt-2 text-base font-semibold shadow-none rounded-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading loading-spinner" />
              ) : (
                <>
                  <span className="icon-[tabler--login] text-lg" aria-hidden="true" />
                  <span>Ingresar al panel</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-base-content/70 mt-6 pt-5 border-t arch-border">
            ¿Aún no administras tu edificio aquí?{' '}
            <Link href="/auth/register" onClick={irARegistro} className="link link-primary font-semibold">
              Registrar edificio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
