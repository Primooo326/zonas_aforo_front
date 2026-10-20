'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const registerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma la contraseña'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email');
      const urlPass = params.get('password');
      if (urlEmail) setValue('email', urlEmail);
      if (urlPass) setValue('password', urlPass);

      const raw = sessionStorage.getItem('prefill_register');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.email) setValue('email', parsed.email);
          if (parsed.password) setValue('password', parsed.password);
        } catch (e) {
          console.error('Error al recuperar datos transferidos desde login:', e);
        }
        sessionStorage.removeItem('prefill_register');
      }
    }
  }, [setValue]);

  const onSubmit = async (form: RegisterForm) => {
    setServerError('');
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          password: form.password,
        }),
      });
      login(data.access_token, data.edificio);
      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Error al registrar el edificio';
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
              <span className="icon-[tabler--building-community] text-2xl" aria-hidden="true" />
            </div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-primary">
              Alta de Copropiedad
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-base-content mt-1">
              Registrar Edificio
            </h1>
            <p className="mt-1 text-sm text-base-content/70">
              Crea el panel de gestión para tu conjunto residencial
            </p>
          </header>

          {serverError && (
            <div className="p-3.5 mb-5 rounded-md border border-error/30 bg-error/10 text-error text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="label-text text-sm font-semibold">Nombre del Edificio o Conjunto</span>
              <input
                type="text"
                placeholder="Ej. Torres del Parque"
                {...register('nombre')}
                className="input input-md text-base rounded-md arch-border"
              />
              {errors.nombre && <span className="text-error text-xs font-medium">{errors.nombre.message}</span>}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="label-text text-sm font-semibold">Correo Electrónico Administrativo</span>
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
                  placeholder="Mínimo 6 caracteres"
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

            <label className="flex flex-col gap-1.5">
              <span className="label-text text-sm font-semibold">Confirmar Contraseña</span>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  {...register('confirmPassword')}
                  className="input input-md w-full pr-12 text-base rounded-md arch-border"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Ver confirmación'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-base-content/50 hover:text-primary transition-colors focus:outline-none bg-transparent hover:bg-transparent border-0 flex items-center justify-center cursor-pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <span className="icon-[tabler--eye-off] text-lg" aria-hidden="true" />
                  ) : (
                    <span className="icon-[tabler--eye] text-lg" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && <span className="text-error text-xs font-medium">{errors.confirmPassword.message}</span>}
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
                  <span className="icon-[tabler--building-plus] text-lg" aria-hidden="true" />
                  <span>Crear edificio y panel</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-base-content/70 mt-6 pt-5 border-t arch-border">
            ¿Ya administras tu edificio?{' '}
            <Link href="/auth/login" className="link link-primary font-semibold">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
