import { registerUser, AuthResult } from "./auth";

/**
 * Orquesta el proceso completo de registro de un nuevo usuario.
 * Llama a registerUser (auth) y, si es exitoso, ejecuta acciones adicionales post-registro.
 */
export async function processNewUserRegistration(email: string, password: string): Promise<AuthResult> {
  const result = await registerUser(email, password);

  if (!result.success) {
    return result;
  }

  // -- Acciones post-registro exitoso --
  //Implementar que se guarde el usuario en la base de datos de Firebase
  // 
  console.log(`Registro exitoso para ${email}. Ejecutando acciones post-registro...`);

  return result;
}
