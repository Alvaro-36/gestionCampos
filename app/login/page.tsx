"use client";

import { loginUser, registerUser } from "../../lib/auth";
import { useState, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const isRegisterMode = searchParams.get('mode') === 'register';

  const [emailError, setEmailError] = useState(false);
  const [registerEmailError, setRegisterEmailError] = useState(false);
  const [confirmEmailError, setConfirmEmailError] = useState(false);

  const handleInvalidEmail = (e: React.InvalidEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (e.currentTarget.validity.typeMismatch || e.currentTarget.validity.patternMismatch) {
      e.preventDefault();
      setter(false);
      setTimeout(() => setter(true), 10);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await loginUser(email, password);
    if (result.success) {
      router.push('/panel');
    } else {
      setError(result.error ?? "Error desconocido.");
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const confirmEmail = formData.get("confirm-email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm-password") as string;
    const terms = formData.get("terms");

    if (email !== confirmEmail) {
      setConfirmEmailError(false);
      setTimeout(() => setConfirmEmailError(true), 10);
      setError("Los correos electrónicos no coinciden.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!terms) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    const result = await registerUser(email, password);
    if (result.success) {
      router.push('/panel');
    } else {
      setError(result.error ?? "Error desconocido.");
    }
  }

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    if (isRegisterMode) {
      router.push('/login');
    } else {
      router.push('/login?mode=register');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden w-full">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-15" data-alt="A serene, wide-angle shot of a lush, expansive agricultural field at dawn, bathed in soft, diffused morning light. The image captures straight rows of young crops disappearing into the horizon, evoking a sense of modern farming scale and precision. The color palette emphasizes soft, atmospheric greens and muted earth tones, perfectly suited as an unobtrusive, professional background for an agricultural software platform. The overall mood is calm, reliable, and deeply connected to nature without distracting from foreground elements." style={{ backgroundImage: 'url(\'https://lh3.googleusercontent.com/aida-public/AB6AXuA9HW16xbnvUbZ7LH273rYvZcyAqDmifdIt7dNDyFbFAkQ-tWfbopvHJLfTrpGGrAvfV1gdbsTNMnQTCgIO8kJadYknmXigdA4uO7p4Levn4QUFZeDhe09BObwEVJK8Q6kpDsN4q55KWy-1x7KdK2qAO1NSr4MrCevGGuks_OW_72Hrzy7PHl4asPB7hgeMeplE3PA5Pb1oT6xbrQZfTSrxkEhynGKJEnp7BxovckI6F8eCDlx6qw_ZJrVbCeRpi2Lm86OWcbQLpeI\')' }}>
      </div>

      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-surface-container via-surface/80 to-surface-container-low opacity-90"></div>

      <main className={`relative z-10 w-full px-6 transition-all duration-300 ${isRegisterMode ? 'max-w-[560px]' : 'max-w-md'}`}>
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/30 p-10 flex flex-col gap-10 backdrop-blur-sm">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center mb-3 border border-outline-variant/50 shadow-sm">
              <span className="material-symbols-outlined text-[32px] text-primary-container" style={{ fontVariationSettings: '\'FILL\' 1' }}>
                agriculture
              </span>
            </div>

            <h1 className="font-headline-md text-headline-md text-primary-container tracking-tight">AgroManage</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {isRegisterMode ? 'Crea tu cuenta para gestionar tus cultivos con precisión.' : 'Inicie sesión para acceder a su panel de control'}
            </p>

            {error && (
              <div className="mt-4 w-full p-3 bg-error-container text-on-error-container text-body-sm rounded-lg border border-error/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-[20px]">error</span>
                {error}
              </div>
            )}
          </div>

          {!isRegisterMode ? (
            <form onSubmit={handleLoginSubmit} method="post" className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase ml-1" htmlFor="email">Correo Electrónico o Usuario</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline">person</span>
                  </div>
                  <input className={`w-full pl-[40px] pr-3 py-[14px] bg-surface rounded-lg border text-on-surface font-body-md text-body-md focus:ring-1 outline-none transition-colors placeholder:text-outline/70 ${emailError ? 'border-error focus:border-error focus:ring-error animate-shake text-error' : 'border-outline-variant focus:border-primary-container focus:ring-primary-container'}`} id="email" name="email" placeholder="ejemplo@finca.com" required={true} type="email" pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" onInvalid={(e) => handleInvalidEmail(e, setEmailError)} onChange={() => setEmailError(false)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase ml-1" htmlFor="password">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline">lock</span>
                  </div>
                  <input className="w-full pl-[40px] pr-3 py-[14px] bg-surface rounded-lg border border-outline-variant text-on-surface font-body-md text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-colors placeholder:text-outline/70" id="password" name="password" placeholder="••••••••" required={true} minLength={6} type="password" />
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 mb-3">
                <div className="flex items-center">
                  <input className="h-5 w-5 rounded-DEFAULT border-outline-variant text-primary-container focus:ring-primary-container bg-surface cursor-pointer transition-colors" id="remember-me" name="remember-me" type="checkbox" />
                  <label className="ml-3 block font-body-sm text-body-sm text-on-surface-variant cursor-pointer select-none" htmlFor="remember-me">
                    Recordar mi cuenta
                  </label>
                </div>
                <div className="text-sm">
                  <a className="font-body-sm text-body-sm text-primary-container hover:text-primary font-medium hover:underline transition-colors" href="#">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </div>

              <button className="w-full flex justify-center py-[16px] px-6 border border-transparent rounded-lg shadow-sm font-title-sm text-title-sm text-on-primary bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200" type="submit">
                Iniciar Sesión
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} method="post" className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase ml-1" htmlFor="first-name">Nombre</label>
                <div className="relative">
                  <input className="w-full h-12 px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all placeholder:text-outline/50 bg-surface" id="first-name" name="first-name" placeholder="Ej. Juan" required type="text" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase ml-1" htmlFor="last-name">Apellido</label>
                <div className="relative">
                  <input className="w-full h-12 px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all placeholder:text-outline/50 bg-surface" id="last-name" name="last-name" placeholder="Ej. Pérez" required type="text" />
                </div>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase ml-1" htmlFor="email">Correo electrónico</label>
                <div className="relative">
                  <input className={`w-full h-12 px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all placeholder:text-outline/50 bg-surface ${registerEmailError ? 'border-error focus:border-error focus:ring-error animate-shake text-error' : 'border-outline-variant focus:border-primary-container focus:ring-primary-container'}`} id="email" name="email" placeholder="juan.perez@empresa.com" required type="email" pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" onInvalid={(e) => handleInvalidEmail(e, setRegisterEmailError)} onChange={() => setRegisterEmailError(false)} />
                </div>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase ml-1" htmlFor="confirm-email">Repetir correo electrónico</label>
                <div className="relative">
                  <input className={`w-full h-12 px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all placeholder:text-outline/50 bg-surface ${confirmEmailError ? 'border-error focus:border-error focus:ring-error animate-shake text-error' : 'border-outline-variant focus:border-primary-container focus:ring-primary-container'}`} id="confirm-email" name="confirm-email" placeholder="juan.perez@empresa.com" required type="email" pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" onInvalid={(e) => handleInvalidEmail(e, setConfirmEmailError)} onChange={() => setConfirmEmailError(false)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase ml-1" htmlFor="password">Contraseña</label>
                <div className="relative">
                  <input className="w-full h-12 px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all placeholder:text-outline/50 bg-surface" id="password" name="password" placeholder="••••••••" required minLength={6} type="password" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase ml-1" htmlFor="confirm-password">Repetir contraseña</label>
                <div className="relative">
                  <input className="w-full h-12 px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all placeholder:text-outline/50 bg-surface" id="confirm-password" name="confirm-password" placeholder="••••••••" required minLength={6} type="password" />
                </div>
              </div>

              <div className="md:col-span-2 flex items-start gap-3 mt-2">
                <input className="mt-1 w-5 h-5 text-primary-container border-outline-variant rounded focus:ring-primary-container cursor-pointer" id="terms" name="terms" type="checkbox" required />
                <label className="font-body-sm text-body-sm text-on-surface-variant" htmlFor="terms">
                  Acepto los <a className="text-primary-container font-bold hover:underline" href="#">Términos de Servicio</a> y la <a className="text-primary-container font-bold hover:underline" href="#">Política de Privacidad</a>.
                </label>
              </div>

              <div className="md:col-span-2 mt-2">
                <button className="w-full flex justify-center py-[16px] px-6 border border-transparent rounded-lg shadow-sm font-title-sm text-title-sm text-on-primary bg-primary hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200" type="submit">
                  <span>Registrarse</span>
                </button>
              </div>
            </form>
          )}

          <div className="text-center border-t border-outline-variant/30 pt-6 mt-1">
            <p className="font-body-sm text-body-sm text-outline">
              {isRegisterMode ? (
                <>
                  ¿Ya tienes una cuenta? <a className="text-primary-container hover:underline font-medium cursor-pointer" onClick={toggleMode}>Inicia sesión aquí</a>
                </>
              ) : (
                <>
                  ¿Nuevo usuario? <a className="text-primary-container hover:underline font-medium cursor-pointer" onClick={toggleMode}>Registrarse</a>
                </>
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-surface">Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
