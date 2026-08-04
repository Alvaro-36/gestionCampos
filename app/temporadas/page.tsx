"use client";

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Farm } from '@/lib/domain/farm';
import { Season } from '@/lib/domain/season';
import { Field } from '@/lib/domain/field';
import { Task } from '@/lib/domain/task';
import { authFirebase, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { FirestoreFarmRepository } from '@/lib/infrastructure/firebase/FirestoreFarmRepository';
import { FirestoreUserRepository } from '@/lib/infrastructure/firebase/FirestoreUserRepository';
import { FirestoreSeasonRepository } from '@/lib/infrastructure/firebase/FirestoreSeasonRepository';
import { FirestoreFieldRepository } from '@/lib/infrastructure/firebase/FirestoreFieldRepository';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import Sidebar from '@/components/ui/Sidebar';
import FarmDropdown from '@/components/ui/FarmDropdown';
import { FirestoreTaskRepository } from '@/lib/infrastructure/firebase/FirestoreTaskRepository';
import { repeatSeason, canRepeatSeason } from '@/lib/domain/season';

export default function TemporadasPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [isLoadingFarms, setIsLoadingFarms] = useState<boolean>(true);

  const [seasons, setSeasons] = useState<(Season & { totalCost?: number; tasks?: Task[] })[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState<boolean>(false);
  const [isPastSeasonsVisible, setIsPastSeasonsVisible] = useState<boolean>(false);


  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [seasonToEnd, setSeasonToEnd] = useState<Season | null>(null);
  const [startNewSeason, setStartNewSeason] = useState<boolean>(false);
  const [newSeasonName, setNewSeasonName] = useState<string>("");

  const [seasonToRestart, setSeasonToRestart] = useState<Season | null>(null);
  const [restartSeasonName, setRestartSeasonName] = useState<string>("");

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

  const loadSeasons = useCallback(async (farmId: string) => {
    try {
      setIsLoadingSeasons(true);
      const seasonRepo = new FirestoreSeasonRepository(db);
      const taskRepo = new FirestoreTaskRepository(db);
      const fieldRepo = new FirestoreFieldRepository(db);

      const [data, fieldsData] = await Promise.all([
        seasonRepo.listByFarm(farmId),
        fieldRepo.listByFarmId(farmId)
      ]);

      setFields(fieldsData);
      
      // Sort by active/endDate status and start date descending
      data.sort((a, b) => {
        const dateA = a.startDate instanceof Date ? a.startDate.getTime() : (a.startDate as any)?.toDate?.()?.getTime() || 0;
        const dateB = b.startDate instanceof Date ? b.startDate.getTime() : (b.startDate as any)?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });

      // Calculate total cost and load tasks for each season
      const dataWithCosts = await Promise.all(data.map(async (s) => {
        try {
          const tasks = await taskRepo.listBySeason(farmId, s.id);
          const totalCost = tasks.reduce((sum, t) => {
            const taskCost = (t.appliedProducts || []).reduce((acc, p) => acc + (p.quantity * (p.realPrice || p.estimatedPrice || 0)), 0);
            return sum + taskCost;
          }, 0);
          return { ...s, totalCost, tasks };
        } catch (e) {
          console.error("Error loading tasks for season:", s.id, e);
          return { ...s, totalCost: 0, tasks: [] };
        }
      }));

      setSeasons(dataWithCosts);
    } catch (err) {
      console.error("Error al cargar temporadas:", err);
      setToast({ isVisible: true, message: "Error al cargar las temporadas.", type: 'error' });
    } finally {
      setIsLoadingSeasons(false);
    }
  }, []);

  const getFieldNames = (fieldIds: string[] = []) => {
    if (!fieldIds || fieldIds.length === 0) return [];
    return fieldIds.map(id => {
      const field = fields.find(f => f.id === id);
      return field ? field.name : id;
    });
  };

  const toggleExpandSeason = (seasonId: string) => {
    setExpandedSeasonId(prev => (prev === seasonId ? null : seasonId));
  };

  useEffect(() => {
    if (selectedFarmId) {
      loadSeasons(selectedFarmId);
    } else {
      setSeasons([]);
    }
  }, [selectedFarmId, loadSeasons]);

  const handleLogout = async () => {
    try {
      await signOut(authFirebase);
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const activeSeasons = seasons.filter(s => s.endDate === null || s.endDate === undefined);
  const pastSeasons = seasons.filter(s => s.endDate !== null && s.endDate !== undefined);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleEndSeason = (season: Season) => {
    setSeasonToEnd(season);
    setNewSeasonName(season.name);
    setStartNewSeason(false);
  };

  const handleConfirmEndSeason = async () => {
    if (!selectedFarmId || !seasonToEnd) return;

    if (startNewSeason && !newSeasonName.trim()) {
      setToast({ isVisible: true, message: "Ingresa un nombre para la nueva temporada.", type: 'error' });
      return;
    }

    try {
      setIsExecuting(true);
      const seasonRepo = new FirestoreSeasonRepository(db);
      await seasonRepo.update(selectedFarmId, {
        ...seasonToEnd,
        endDate: new Date()
      });

      if (startNewSeason) {
        const newSeasonData = repeatSeason(seasonToEnd, newSeasonName.trim());
        await seasonRepo.create(selectedFarmId, newSeasonData);
      }

      setToast({ isVisible: true, message: startNewSeason ? "Temporada terminada y nueva iniciada con éxito." : "Temporada terminada con éxito.", type: 'success' });
      setSeasonToEnd(null);
      await loadSeasons(selectedFarmId);
    } catch (error) {
      console.error("Error al terminar temporada:", error);
      setToast({ isVisible: true, message: "Error al terminar la temporada.", type: 'error' });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRestartSeasonClick = (season: Season) => {
    setSeasonToRestart(season);
    setRestartSeasonName(season.name);
  };

  const handleConfirmRestartSeason = async () => {
    if (!selectedFarmId || !seasonToRestart) return;
    if (!restartSeasonName.trim()) {
      setToast({ isVisible: true, message: "Ingresa un nombre para la nueva temporada.", type: 'error' });
      return;
    }

    try {
      setIsExecuting(true);
      const seasonRepo = new FirestoreSeasonRepository(db);
      const newSeasonData = repeatSeason(seasonToRestart, restartSeasonName.trim());
      await seasonRepo.create(selectedFarmId, newSeasonData);

      setToast({ isVisible: true, message: "Temporada iniciada con éxito.", type: 'success' });
      setSeasonToRestart(null);
      await loadSeasons(selectedFarmId);
    } catch (error) {
      console.error("Error al reiniciar temporada:", error);
      setToast({ isVisible: true, message: "Error al iniciar la temporada.", type: 'error' });
    } finally {
      setIsExecuting(false);
    }
  };



  return (
    <div className="bg-surface text-on-surface flex h-screen overflow-hidden">
      <Sidebar activePage="temporadas" selectedFarmId={selectedFarmId} />

      {/* Main Content Wrapper */}
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
              <h2 className="text-[32px] md:text-[48px] font-bold text-primary tracking-tight leading-tight mb-2">Configuración de Temporada</h2>
              <p className="text-body-md text-on-surface-variant max-w-2xl">Administre las temporadas agrícolas activas y revise el historial de cosechas anteriores.</p>
            </div>
          </div>

          {/* Farm Selector Dropdown */}
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

          {isLoadingSeasons ? (
             <div className="flex items-center justify-center py-20">
               <Spinner size={40} className="text-primary animate-spin" />
             </div>
          ) : (
            <>
              {/* Current Seasons Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-outline-variant">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                  <h3 className="text-title-sm font-title-sm text-on-surface">Temporadas Vigentes</h3>
                </div>
                
                {activeSeasons.length === 0 ? (
                   <p className="text-body-md text-on-surface-variant py-4">No hay temporadas vigentes. Crea una nueva temporada para empezar a trabajar.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeSeasons.map(season => {
                      const isExpanded = expandedSeasonId === season.id;
                      const seasonTasks = season.tasks || [];

                      return (
                        <div key={season.id} className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-headline-md font-headline-md text-primary font-bold">{season.name}</h4>
                              <span className="bg-primary-container text-white text-label-caps px-2 py-1 rounded">ACTIVA</span>
                            </div>
                            <p className="text-body-sm text-on-surface-variant mb-6">Fecha inicio: {formatDate(season.startDate)}</p>
                            <div className="grid grid-cols-2 gap-4 bg-surface-container-low rounded-lg p-4 mb-6">
                              <div>
                                <span className="text-label-caps text-on-surface-variant block mb-1 text-[11px]">LOTES ASOCIADOS</span>
                                <span className="text-[22px] font-bold text-secondary">{season.fieldIds?.length || 0}</span>
                              </div>
                              <div>
                                <span className="text-label-caps text-on-surface-variant block mb-1 text-[11px]">MONTO APLICADO</span>
                                <span className="text-[22px] font-bold text-primary">${season.totalCost?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <button
                              onClick={() => toggleExpandSeason(season.id)}
                              className="w-full py-2.5 bg-surface-container-low border border-outline-variant text-on-surface font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors text-body-sm"
                            >
                              <span className="material-symbols-outlined text-[18px]">engineering</span>
                              <span>{isExpanded ? 'Ocultar Trabajos' : `Ver Trabajos (${seasonTasks.length})`}</span>
                              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                            </button>

                            {isExpanded && (
                              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
                                <h5 className="font-bold text-body-md text-on-surface pb-2 border-b border-outline-variant/40 flex items-center gap-2">
                                  <span>Trabajos Registrados</span>
                                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[12px]">{seasonTasks.length}</span>
                                </h5>

                                {seasonTasks.length === 0 ? (
                                  <p className="text-body-sm text-on-surface-variant text-center py-3">No hay trabajos ni aplicaciones en esta temporada.</p>
                                ) : (
                                  seasonTasks.map(task => {
                                    const affectedFieldNames = getFieldNames(task.affectedFields);
                                    const taskTotalCost = (task.appliedProducts || []).reduce((sum, p) => sum + (p.quantity * (p.realPrice || p.estimatedPrice || 0)), 0);

                                    return (
                                      <div key={task.id} className="bg-surface-container-low border border-outline-variant/40 rounded-lg p-3 text-body-sm space-y-2">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="font-bold text-primary block">{task.name}</span>
                                            {task.appliedProducts && task.appliedProducts.length > 0 && (
                                              <span className="text-[12px] text-on-surface-variant block font-medium">
                                                {task.appliedProducts.map(p => {
                                                  const prodPrice = p.realPrice || p.estimatedPrice || 0;
                                                  return `${p.quantity.toLocaleString('es-ES')} ${p.unit || 'L'} ($${prodPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}/${p.unit || 'L'})`;
                                                }).join(', ')}
                                              </span>
                                            )}
                                            <span className="text-[12px] text-on-surface-variant block">{formatDate(task.dateTime)}</span>
                                          </div>
                                          <span className="font-bold text-primary">${taskTotalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        {affectedFieldNames.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {affectedFieldNames.map((name, idx) => (
                                              <span key={idx} className="bg-secondary-container/60 text-on-secondary-container text-[11px] px-2 py-0.5 rounded-full">
                                                {name}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}

                            <button 
                              onClick={() => handleEndSeason(season)}
                              disabled={isExecuting}
                              className="w-full py-3 bg-error text-on-error font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-error/90 active:scale-95 transition-all disabled:opacity-50 text-body-md"
                            >
                              <span className="material-symbols-outlined">event_busy</span>
                              TERMINAR TEMPORADA
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Historical Seasons Section */}
              <section className="mt-10">
                <button 
                  onClick={() => setIsPastSeasonsVisible(!isPastSeasonsVisible)}
                  className="w-full group flex items-center justify-center gap-2 py-4 bg-surface-container-low border border-outline-variant rounded-xl hover:bg-surface-container-high transition-all duration-300"
                >
                  <span className={`material-symbols-outlined text-3xl transition-transform duration-300 ${isPastSeasonsVisible ? 'rotate-180' : ''}`}>expand_more</span>
                  <span className="text-title-sm font-title-sm font-bold">Temporadas Pasadas</span>
                </button>
                
                {isPastSeasonsVisible && (
                  <div className="mt-6 space-y-4">
                    {pastSeasons.length === 0 ? (
                      <p className="text-body-md text-on-surface-variant py-4 text-center">No hay temporadas pasadas en esta finca.</p>
                    ) : (
                      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead className="bg-surface-container text-on-surface-variant border-b border-outline-variant">
                            <tr>
                              <th className="px-6 py-4 text-label-caps font-bold">Temporada</th>
                              <th className="px-6 py-4 text-label-caps font-bold">Periodo</th>
                              <th className="px-6 py-4 text-label-caps font-bold">Lotes</th>
                              <th className="px-6 py-4 text-label-caps font-bold">Monto Aplicado</th>
                              <th className="px-6 py-4 text-label-caps font-bold text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant">
                            {pastSeasons.map(season => {
                              const canRestart = canRepeatSeason(season, activeSeasons);
                              const isExpanded = expandedSeasonId === season.id;
                              const seasonTasks = season.tasks || [];

                              return (
                                <Fragment key={season.id}>
                                  <tr 
                                    onClick={() => toggleExpandSeason(season.id)}
                                    className={`hover:bg-surface-container-low transition-colors cursor-pointer ${isExpanded ? 'bg-surface-container-low/70' : ''}`}
                                    title="Haz clic para ver los trabajos aplicados en esta temporada"
                                  >
                                    <td className="px-6 py-6 font-bold text-primary flex items-center gap-2">
                                      <span className={`material-symbols-outlined text-[22px] transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-on-surface-variant'}`}>
                                        expand_more
                                      </span>
                                      <span>{season.name}</span>
                                    </td>
                                    <td className="px-6 py-6 text-body-sm text-on-surface-variant">
                                      {formatDate(season.startDate)} - {formatDate(season.endDate)}
                                    </td>
                                    <td className="px-6 py-6 font-bold">{season.fieldIds?.length || 0}</td>
                                    <td className="px-6 py-6 font-bold text-primary">
                                      ${season.totalCost?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                                    </td>
                                    <td className="px-6 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                                      <button 
                                        onClick={() => handleRestartSeasonClick(season)}
                                        disabled={!canRestart}
                                        className={`px-4 py-2 rounded-lg font-title-sm text-title-sm border-none shadow-sm transition-colors flex items-center justify-center mx-auto ${
                                          canRestart 
                                            ? 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container cursor-pointer' 
                                            : 'bg-surface-container-high text-on-surface-variant opacity-50 cursor-not-allowed'
                                        }`}
                                        title={canRestart ? "Reiniciar esta temporada con los mismos lotes" : "No se puede reiniciar: algunos lotes ya están en una temporada activa"}
                                      >
                                        Repetir temporada
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Expanded Tasks Row */}
                                  {isExpanded && (
                                    <tr className="bg-surface-container-lowest border-b border-outline-variant">
                                      <td colSpan={5} className="px-6 py-6">
                                        <div className="bg-surface border border-outline-variant rounded-xl p-5 shadow-sm space-y-4">
                                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-outline-variant/60">
                                            <div className="flex items-center gap-2">
                                              <span className="material-symbols-outlined text-primary text-[22px]">engineering</span>
                                              <h5 className="font-bold text-title-sm text-on-surface">
                                                Trabajos y Aplicaciones Registradas ({seasonTasks.length})
                                              </h5>
                                            </div>
                                            <span className="text-body-sm text-on-surface-variant font-medium">
                                              Costo Total: <strong className="text-primary font-bold">${season.totalCost?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</strong>
                                            </span>
                                          </div>

                                          {seasonTasks.length === 0 ? (
                                            <div className="text-center py-6 text-on-surface-variant text-body-sm bg-surface-container-low rounded-lg">
                                              <span className="material-symbols-outlined text-3xl mb-1 block text-outline">content_paste_off</span>
                                              No se registraron trabajos ni aplicaciones en esta temporada.
                                            </div>
                                          ) : (
                                            <div className="space-y-4">
                                              {seasonTasks.map(task => {
                                                const affectedFieldNames = getFieldNames(task.affectedFields);
                                                const taskTotalCost = (task.appliedProducts || []).reduce((sum, p) => sum + (p.quantity * (p.realPrice || p.estimatedPrice || 0)), 0);

                                                return (
                                                  <div key={task.id} className="bg-surface-container-low border border-outline-variant/50 rounded-lg p-4 space-y-3">
                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                      <div>
                                                        <div className="flex items-center gap-2">
                                                          <span className="material-symbols-outlined text-[18px] text-primary">agriculture</span>
                                                          <h6 className="font-bold text-body-lg text-primary">{task.name}</h6>
                                                        </div>
                                                        {task.appliedProducts && task.appliedProducts.length > 0 && (
                                                          <div className="mt-0.5 ml-6">
                                                            {task.appliedProducts.map((p, pIdx) => {
                                                              const prodPrice = p.realPrice || p.estimatedPrice || 0;
                                                              return (
                                                                <p key={pIdx} className="text-body-sm text-on-surface font-medium">
                                                                  {p.quantity.toLocaleString('es-ES')} {p.unit || 'L'}
                                                                  <span className="text-outline mx-1.5">•</span>
                                                                  ${prodPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {p.unit || 'L'}
                                                                </p>
                                                              );
                                                            })}
                                                          </div>
                                                        )}
                                                        {task.description && (
                                                          <p className="text-body-sm text-on-surface-variant mt-1 ml-6">{task.description}</p>
                                                        )}
                                                      </div>
                                                      <div className="text-right">
                                                        <span className="text-body-sm text-on-surface-variant block">
                                                          {formatDate(task.dateTime)}
                                                        </span>
                                                        <span className="text-title-sm font-bold text-primary block mt-0.5">
                                                          ${taskTotalCost.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                      </div>
                                                    </div>

                                                    {/* Affected Fields */}
                                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                                      <span className="text-label-caps text-[11px] text-on-surface-variant font-bold">LOTES:</span>
                                                      {affectedFieldNames.length > 0 ? (
                                                        affectedFieldNames.map((name, idx) => (
                                                          <span key={idx} className="bg-secondary-container/60 text-on-secondary-container text-body-sm px-2.5 py-0.5 rounded-full font-medium text-[12px]">
                                                            {name}
                                                          </span>
                                                        ))
                                                      ) : (
                                                        <span className="text-body-sm text-on-surface-variant italic text-[12px]">Sin lotes asignados</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* Cargando Fincas Modal */}
      {isLoadingFarms && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md pointer-events-auto">
          <div className="bg-surface border border-outline-variant p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full text-center">
            <Spinner size={40} className="text-primary animate-spin" />
            <p className="font-title-md text-title-md text-on-surface">Cargando fincas...</p>
          </div>
        </div>
      )}



      {/* Modal Confirmar Cierre de Temporada */}
      {seasonToEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-[24px] font-bold text-on-surface mb-2">Terminar Temporada</h2>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6">
              ¿Estás seguro de que quieres terminar la temporada <strong className="text-primary font-bold">{seasonToEnd.name}</strong>? Esta acción cerrará el periodo de trabajo actual y moverá esta temporada al historial de temporadas pasadas.
            </p>

            <div className="mb-6 flex flex-col gap-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    className="appearance-none w-5 h-5 border-2 border-outline rounded-[4px] checked:bg-primary checked:border-primary transition-colors cursor-pointer peer"
                    checked={startNewSeason}
                    onChange={(e) => setStartNewSeason(e.target.checked)}
                  />
                  <span className="material-symbols-outlined text-[16px] text-on-primary absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">check</span>
                </div>
                <span className="text-body-md font-body-md text-on-surface group-hover:text-primary transition-colors">Iniciar automáticamente una nueva temporada con estos mismos lotes</span>
              </label>

              {startNewSeason && (
                <div className="flex flex-col gap-1 mt-2 animate-in slide-in-from-top-2 duration-200">
                  <label htmlFor="newSeasonName" className="font-label-caps text-label-caps text-on-surface-variant ml-1">Nombre de la nueva temporada</label>
                  <input
                    id="newSeasonName"
                    type="text"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary text-body-md font-body-md transition-colors"
                    placeholder="Ej. Temporada 2026-2027"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSeasonToEnd(null)}
                disabled={isExecuting}
                className="px-6 py-2.5 rounded-full text-label-lg font-label-lg font-semibold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmEndSeason}
                disabled={isExecuting}
                className="px-6 py-2.5 bg-error text-on-error rounded-full text-label-lg font-label-lg font-semibold hover:bg-error/95 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <Spinner size={16} className="animate-spin text-on-error" />
                    <span>Terminando...</span>
                  </>
                ) : (
                  <span>Terminar Temporada</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Reinicio de Temporada */}
      {seasonToRestart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-[24px] font-bold text-on-surface mb-2">Repetir Temporada</h2>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6">
              Estás a punto de iniciar una nueva temporada usando los mismos lotes que estaban en <strong className="text-primary font-bold">{seasonToRestart.name}</strong>.
            </p>

            <div className="flex flex-col gap-1 mb-6">
              <label htmlFor="restartSeasonName" className="font-label-caps text-label-caps text-on-surface-variant ml-1">Nombre de la nueva temporada</label>
              <input
                id="restartSeasonName"
                type="text"
                value={restartSeasonName}
                onChange={(e) => setRestartSeasonName(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary text-body-md font-body-md transition-colors"
                placeholder="Ej. Temporada 2026-2027"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSeasonToRestart(null)}
                disabled={isExecuting}
                className="px-6 py-2.5 rounded-full text-label-lg font-label-lg font-semibold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50 border-none bg-transparent cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRestartSeason}
                disabled={isExecuting}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-full text-label-lg font-label-lg font-semibold hover:bg-primary-container transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2 border-none cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <Spinner size={16} className="animate-spin text-on-primary" />
                    <span>Iniciando...</span>
                  </>
                ) : (
                  <span>Iniciar Temporada</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}
