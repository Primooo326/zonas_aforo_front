'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('edificio', JSON.stringify(data.edificio));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full max-w-md">
        <div className="card bg-base-100 shadow-xl w-full">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Iniciar Sesión</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="form-control">
                <span className="label-text">Email</span>
                <input type="email" className="input input-bordered" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
              <label className="form-control">
                <span className="label-text">Contraseña</span>
                <input type="password" className="input input-bordered" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </label>
              <button type="submit" className="btn btn-primary w-full">Ingresar</button>
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
