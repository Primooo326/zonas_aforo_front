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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

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
      setServerError(err.message);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-md">
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Iniciar Sesión</h2>
            {serverError && <div className="alert alert-error">{serverError}</div>}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
              <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? <span className="loading loading-spinner" /> : 'Ingresar'}
              </button>
            </form>
            <p className="text-center mt-4 text-sm">
              ¿No tienes cuenta? <Link href="/auth/register" className="link link-primary">Regístrate</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
