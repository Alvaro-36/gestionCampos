import { registerUser, AuthResult } from "./auth";
import { FirestoreUserRepository } from "./infrastructure/firebase/FirestoreUserRepository";
import { User } from "./domain/user";

/**
 * Orquesta el proceso completo de registro de un nuevo usuario.
 * Llama a registerUser (auth) y, si es exitoso, ejecuta acciones adicionales post-registro.
 */
export async function processNewUserRegistration(email: string, password: string): Promise<AuthResult> {
  const result = await registerUser(email, password);

  if (!result.success || !result.user) {
    return result;
  }

  // -- Acciones post-registro exitoso --
  // Guardar el usuario en la base de datos de Firebase
  try {
    const userRepository = new FirestoreUserRepository();
    
    const newUser: User = {
      uid: result.user.uid,
      email: result.user.email || email,
      role: 'user', // Rol por defecto
      firstName: '', // Pendiente de completar en el perfil
      lastName: ''
    };

    await userRepository.crear(newUser);
    console.log(`Registro exitoso en DB para ${email}.`);
  } catch (dbError) {
    console.error("Error guardando usuario en Firestore:", dbError);
    // Aunque falle la DB, el usuario se creó en Auth.
    // Depende del negocio si esto es un fallo total o parcial.
  }

  //Borrar esto mas adelante
  console.log(`Registro exitoso para ${email}. Ejecutando acciones post-registro...`);

  
  return result;
}
