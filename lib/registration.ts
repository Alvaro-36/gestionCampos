import { registerUser, AuthResult } from "./auth";
import { FirestoreUserRepository } from "./infrastructure/firebase/FirestoreUserRepository";
import { User } from "./domain/user";
import { db } from "./firebase";

/**
 * Orquesta el proceso completo de registro de un nuevo usuario.
 * Llama a registerUser (auth) y, si es exitoso, ejecuta acciones adicionales post-registro.
 */
export async function processNewUserRegistration(email: string, password: string, firstName: string, lastName: string): Promise<AuthResult> {
  const result = await registerUser(email, password);

  if (!result.success || !result.user) {
    return result;
  }

  // -- Acciones post-registro exitoso --
  // Guardar el usuario en la base de datos de Firebase
  try {
    const userRepository = new FirestoreUserRepository(db);
    
    const newUser: User = {
      uid: result.user.uid,
      email: result.user.email || email,
      firstName: firstName,
      lastName: lastName,
      accesses: []
    };

    await userRepository.create(newUser);
    console.log(`Registro exitoso en DB para ${email}.`);
  } catch (dbError: any) {
    console.error("Error guardando usuario en Firestore:", dbError);
    // Si la DB falla, propagar el error para no redirigir al panel.
    return { success: false, error: dbError.message || "Error al guardar el usuario en la base de datos." };
  }

  //Borrar esto mas adelante
  console.log(`Registro exitoso para ${email}. Ejecutando acciones post-registro...`);

  
  return result;
}
