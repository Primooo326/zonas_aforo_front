'use client';

import { useState } from 'react';
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

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
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-base-200 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body gap-5 p-6 sm:p-8">
            <header className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-box bg-primary/10 text-primary">
                <span className="icon-[tabler--building] text-xl" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Registrar Edificio</h1>
              <p className="mt-1.5 text-sm text-base-content/60">Crea el panel de gestión de tu edificio</p>
            </header>
            {serverError && <div className="alert alert-error">{serverError}</div>}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <label className="flex flex-col gap-1.5">
                <span className="label-text text-sm font-medium">Nombre del Edificio</span>
                <input type="text" {...register('nombre')} className="input" />
                {errors.nombre && <span className="text-error text-sm">{errors.nombre.message}</span>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-text text-sm font-medium">Email</span>
                <input type="email" {...register('email')} className="input" />
                {errors.email && <span className="text-error text-sm">{errors.email.message}</span>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-text text-sm font-medium">Contraseña</span>
                <input type="password" {...register('password')} className="input" />
                {errors.password && <span className="text-error text-sm">{errors.password.message}</span>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="label-text text-sm font-medium">Confirmar Contraseña</span>
                <input type="password" {...register('confirmPassword')} className="input" />
                {errors.confirmPassword && <span className="text-error text-sm">{errors.confirmPassword.message}</span>}
              </label>
              <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="loading loading-spinner" />
                ) : (
                  <>
                    <span className="icon-[tabler--building-plus] text-lg" aria-hidden="true" />
                    Registrarse
                  </>
                )}
              </button>
            </form>
            <p className="text-center text-sm text-base-content/60">
              ¿Ya tienes cuenta?{' '}
              <Link href="/auth/login" className="link link-primary font-medium">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
