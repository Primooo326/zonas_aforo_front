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
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-md">
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Registrar Edificio</h2>
            {serverError && <div className="alert alert-error">{serverError}</div>}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <label className="form-control">
                <span className="label-text">Nombre del Edificio</span>
                <input type="text" {...register('nombre')} className="input input-bordered" />
                {errors.nombre && <span className="text-error text-sm mt-1">{errors.nombre.message}</span>}
              </label>
              <label className="form-control">
                <span className="label-text">Email</span>
                <input type="email" {...register('email')} className="input input-bordered" />
                {errors.email && <span className="text-error text-sm mt-1">{errors.email.message}</span>}
              </label>
              <label className="form-control">
                <span className="label-text">Contraseña</span>
                <input type="password" {...register('password')} className="input input-bordered" />
                {errors.password && <span className="text-error text-sm mt-1">{errors.password.message}</span>}
              </label>
              <label className="form-control">
                <span className="label-text">Confirmar Contraseña</span>
                <input type="password" {...register('confirmPassword')} className="input input-bordered" />
                {errors.confirmPassword && <span className="text-error text-sm mt-1">{errors.confirmPassword.message}</span>}
              </label>
              <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? <span className="loading loading-spinner" /> : 'Registrarse'}
              </button>
            </form>
            <p className="text-center mt-4 text-sm">
              ¿Ya tienes cuenta? <Link href="/auth/login" className="link link-primary">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
