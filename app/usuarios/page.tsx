"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Farm } from '@/lib/domain/farm';
import { authFirebase, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { FirestoreFarmRepository } from '@/lib/infrastructure/firebase/FirestoreFarmRepository';
import { FirestoreUserRepository } from '@/lib/infrastructure/firebase/FirestoreUserRepository';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import Sidebar from '@/components/ui/Sidebar';
import FarmDropdown from '@/components/ui/FarmDropdown';

interface Member {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function UsuariosPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [isLoadingFarms, setIsLoadingFarms] = useState<boolean>(true);

  const [members, setMembers] = useState<Member[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);

  const [newEmail, setNewEmail] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authFirebase, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const fetchUserData = async () => {
      try {
        const userRepo = new FirestoreUserRepository(db);
        const userData = await userRepo.getById(userId);
        if (userData) {
          setUserName(`${userData.firstName} ${userData.lastName}`);
          setUserEmail(userData.email);
        } else {
          const currentUser = authFirebase.currentUser;
          if (currentUser) {
            setUserName(currentUser.displayName || "Usuario");
            setUserEmail(currentUser.email || "");
          }
        }
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
      }
    };
    fetchUserData();
  }, [userId]);

  const loadFarms = useCallback(async (uid: string) => {
    try {
      setIsLoadingFarms(true);
      const farmRepo = new FirestoreFarmRepository(db);
      const data = await farmRepo.listByUser(uid);
      setFarms(data);
      if (data.length > 0) {
        setSelectedFarmId(data[0].id);
      }
    } catch (err) {
      console.error("Error al cargar fincas:", err);
      setToast({ isVisible: true, message: "Error al cargar tus fincas.", type: 'error' });
    } finally {
      setIsLoadingFarms(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadFarms(userId);
    }
  }, [userId, loadFarms]);

  // Obtener token para las peticiones a la API
  const getAuthToken = async (): Promise<string | null> => {
    const user = authFirebase.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  };

  // Cargar miembros de la finca seleccionada
  const loadMembers = useCallback(async (farmId: string) => {
    const token = await getAuthToken();
    if (!token) return;

    try {
      setIsLoadingMembers(true);
      const res = await fetch(`/api/farms/${farmId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Error al cargar miembros:', res.status, errData);
        setMembers([]);
        return;
      }

      const data = await res.json();
      setMembers(data.members || []);
      setOwnerId(data.ownerId || '');
    } catch (error) {
      console.error("Error al cargar miembros:", error);
      setToast({ isVisible: true, message: "Error al cargar los miembros.", type: 'error' });
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFarmId) {
      loadMembers(selectedFarmId);
    } else {
      setMembers([]);
    }
  }, [selectedFarmId, loadMembers]);

  // Agregar miembro
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !selectedFarmId) return;

    const token = await getAuthToken();
    if (!token) {
      setToast({ isVisible: true, message: "Sesión expirada. Recarga la página.", type: 'error' });
      return;
    }

    try {
      setIsAdding(true);
      const res = await fetch(`/api/farms/${selectedFarmId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ isVisible: true, message: data.error || 'Error al añadir el usuario.', type: 'error' });
        return;
      }

      setToast({ isVisible: true, message: 'Usuario añadido correctamente.', type: 'success' });
      setNewEmail("");
      // Recargar la lista
      await loadMembers(selectedFarmId);
    } catch (error) {
      console.error("Error al añadir miembro:", error);
      setToast({ isVisible: true, message: "Error de conexión al añadir usuario.", type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  // Eliminar miembro
  const handleRemoveMember = async (targetUid: string) => {
    if (!selectedFarmId) return;

    const token = await getAuthToken();
    if (!token) {
      setToast({ isVisible: true, message: "Sesión expirada. Recarga la página.", type: 'error' });
      return;
    }

    try {
      setRemovingUserId(targetUid);
      const res = await fetch(`/api/farms/${selectedFarmId}/members`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: targetUid }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ isVisible: true, message: data.error || 'Error al eliminar el usuario.', type: 'error' });
        return;
      }

      // Si se eliminó a sí mismo, recargar fincas
      if (targetUid === userId) {
        setToast({ isVisible: true, message: 'Has salido de la finca.', type: 'info' });
        await loadFarms(userId!);
      } else {
        setToast({ isVisible: true, message: 'Usuario eliminado de la finca.', type: 'success' });
        await loadMembers(selectedFarmId);
      }
    } catch (error) {
      console.error("Error al eliminar miembro:", error);
      setToast({ isVisible: true, message: "Error de conexión al eliminar usuario.", type: 'error' });
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(authFirebase);
      document.cookie = "user_session=; path=/; max-age=0; SameSite=Strict";
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (!userId || isLoadingFarms) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <Spinner size={40} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface flex h-screen overflow-hidden">
      <Sidebar activePage="usuarios" selectedFarmId={selectedFarmId} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopNavBar */}
        <header className="flex justify-between items-center px-6 h-16 w-full bg-surface border-b border-outline-variant">
          <div className="flex items-center gap-6">
            <button className="md:hidden p-2 hover:bg-surface-container-high rounded-full">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative" ref={userDropdownRef}>
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-surface-container-high p-1 rounded-lg transition-colors"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary flex items-center justify-center text-on-primary font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
              
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface border border-outline-variant rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-outline-variant/30 mb-2">
                    <p className="text-body-md font-body-md text-on-surface truncate">{userName}</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant truncate">{userEmail}</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-body-md font-body-md text-error hover:bg-error-container/50 transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
          {/* Context Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-[32px] md:text-[48px] font-bold text-primary tracking-tight leading-tight mb-2">Gestión de Usuarios</h2>
              <p className="text-body-md text-on-surface-variant max-w-2xl">Administre el acceso de usuarios a sus fincas. Agregue o elimine personas para colaborar en la gestión.</p>
            </div>
          </div>

          {/* Farm Selector */}
          <div className="w-full md:w-80 mb-6">
            <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">SELECCIONAR FINCA</label>
            {farms.length > 0 ? (
              <FarmDropdown 
                farms={farms} 
                selectedFarmId={selectedFarmId} 
                onChange={(id) => setSelectedFarmId(id)} 
              />
            ) : (
              <p className="text-body-sm text-on-surface-variant">No tienes fincas registradas.</p>
            )}
          </div>

          {!selectedFarmId ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-[64px] text-outline mb-4">group</span>
              <p className="text-body-md text-on-surface-variant">Selecciona una finca para ver y gestionar sus usuarios.</p>
            </div>
          ) : isLoadingMembers ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size={40} className="text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Add Member Section */}
              <section className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person_add</span>
                  <h3 className="text-title-sm font-title-sm text-on-surface">Añadir Persona</h3>
                </div>
                <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Ingresa el correo electrónico del usuario"
                      className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg text-body-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      required
                      disabled={isAdding}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAdding || !newEmail.trim()}
                    className="px-6 py-3 bg-primary text-on-primary rounded-lg font-title-sm text-body-sm hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    {isAdding ? (
                      <Spinner size={18} className="text-on-primary animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Añadir
                      </>
                    )}
                  </button>
                </form>
              </section>

              {/* Members List Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-outline-variant">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
                  <h3 className="text-title-sm font-title-sm text-on-surface">
                    Miembros ({members.length})
                  </h3>
                </div>

                {members.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant py-4">No hay miembros en esta finca.</p>
                ) : (
                  <div className="grid gap-3">
                    {members
                      .sort((a, b) => {
                        // Owner siempre primero
                        if (a.role === 'owner') return -1;
                        if (b.role === 'owner') return 1;
                        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
                      })
                      .map((member) => {
                        const isOwner = member.role === 'owner';
                        const isSelf = member.uid === userId;
                        const isRemoving = removingUserId === member.uid;

                        return (
                          <div
                            key={member.uid}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                              isOwner
                                ? 'bg-primary-container/10 border-primary/20'
                                : 'bg-white border-outline-variant hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Avatar */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[16px] flex-shrink-0 ${
                                isOwner
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-secondary-container text-on-secondary-container'
                              }`}>
                                {member.firstName.charAt(0).toUpperCase()}
                              </div>

                              {/* Info */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-body-md font-semibold text-on-surface truncate">
                                    {member.firstName} {member.lastName}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[11px] font-label-caps text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">
                                      TU
                                    </span>
                                  )}
                                </div>
                                <p className="text-body-sm text-on-surface-variant truncate">{member.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                              {/* Role badge */}
                              <span className={`text-[11px] font-label-caps px-2.5 py-1 rounded-full ${
                                isOwner
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-surface-container-highest text-on-surface-variant'
                              }`}>
                                {isOwner ? 'PROPIETARIO' : 'ADMINISTRADOR'}
                              </span>

                              {/* Action button */}
                              {!isOwner && (
                                <button
                                  onClick={() => handleRemoveMember(member.uid)}
                                  disabled={isRemoving}
                                  className={`px-3 py-1.5 rounded-lg text-body-sm font-title-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isSelf
                                      ? 'text-on-surface-variant border border-outline-variant hover:bg-surface-container-highest hover:text-error'
                                      : 'text-error hover:bg-error-container/50'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {isRemoving ? (
                                    <Spinner size={14} className="text-error animate-spin" />
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined text-[16px]">
                                        {isSelf ? 'logout' : 'person_remove'}
                                      </span>
                                      <span className="hidden sm:inline">
                                        {isSelf ? 'Salir de la finca' : 'Eliminar'}
                                      </span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}
