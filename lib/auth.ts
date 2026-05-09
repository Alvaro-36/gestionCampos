import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

import { auth } from "./firebase";

// -- Interfaz del Adapter --
// Define el contrato que la app espera, independiente del proveedor de auth.
export interface AuthResult {
  success: boolean;
  error?: string;
}

// -- Traductor de errores (Firebase -> Mensajes de usuario) --
function translateFirebaseError(code: string): string {
  const errorMap: Record<string, string> = {
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/invalid-email": "El formato del correo electrónico no es válido.",
    "auth/email-already-in-use": "Este correo ya está registrado.",
    "auth/weak-password": "La contraseña es demasiado débil. Use al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos fallidos. Intente de nuevo más tarde.",
    "auth/network-request-failed": "Error de conexión. Verifique su internet.",
  };

  return errorMap[code] || "Ocurrió un error inesperado. Por favor, intente de nuevo.";
}

// -- Adapter: Auth Service --
// La UI solo conoce estas funciones y la interfaz AuthResult.
// Nunca interactúa directamente con Firebase.

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error: any) {
    console.error("Auth Adapter [login]:", error.code);
    return { success: false, error: translateFirebaseError(error.code) };
  }
}

// WIP: Actualmente usa signIn. Cambiar a createUser cuando esté listo.
export async function registerUser(email: string, password: string): Promise<AuthResult> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Usuario registrado exitosamente:", userCredential.user.email);
    return { success: true };
  } catch (error: any) {
    console.error("Auth Adapter [register]:", error.code);
    return { success: false, error: translateFirebaseError(error.code) };
  }
}
