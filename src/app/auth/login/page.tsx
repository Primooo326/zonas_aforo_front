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
    } catch (err: any) {
      setServerError(err.message || 'Datos incorrectos. Verifica tu correo y contraseña.');
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
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body gap-5 p-6 sm:p-8">
            <header className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="icon-[tabler--building] text-2xl" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Iniciar Sesión</h1>
              <p className="mt-1.5 text-sm text-base-content/70">Accede al panel de tu edificio</p>
            </header>

            {serverError && (
              <div className="alert alert-error flex flex-col gap-1.5 text-sm">
                <span>{serverError}</span>
                <Link
                  href="/auth/register"
                  onClick={irARegistro}
                  className="font-semibold underline underline-offset-4 text-white hover:text-white/80 transition-opacity w-fit inline-flex items-center gap-1"
                >
                  Registrar mi edificio aquí →
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="flex flex-col gap-4" noValidate>
              <label className="flex flex-col gap-1.5">
                <span className="label-text text-sm font-semibold">Correo Electrónico</span>
                <input
                  type="email"
                  placeholder="admin@tuedificio.com"
                  {...register('email')}
                  className="input input-md text-base"
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
                    className="input input-md w-full pr-12 text-base"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-base-content/50 hover:text-primary transition-colors focus:outline-none bg-transparent hover:bg-transparent border-0 flex items-center justify-center cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.585 10.587a2 2 0 0 0 2.829 2.83" /><path d="M9.363 5.365a9.466 9.466 0 0 1 2.637 -.365c4 0 7.333 2.333 10 7c-.778 1.361 -1.612 2.524 -2.503 3.488m-2.14 1.861c-1.631 1.1 -3.415 1.651 -5.357 1.651c-4 0 -7.333 -2.333 -10 -7c1.369 -2.395 2.913 -4.175 4.632 -5.341" /><path d="M3 3l18 18" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></svg>
                    )}
                  </button>
                </div>
                {errors.password && <span className="text-error text-xs font-medium">{errors.password.message}</span>}
              </label>

              <button type="submit" className="btn btn-primary btn-md w-full mt-2 text-base font-semibold" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="loading loading-spinner" />
                ) : (
                  <>
                    <span className="icon-[tabler--login] text-lg" aria-hidden="true" />
                    Ingresar
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-base-content/70">
              ¿No tienes cuenta?{' '}
              <Link href="/auth/register" onClick={irARegistro} className="link link-primary font-semibold">
                Registra tu edificio
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
