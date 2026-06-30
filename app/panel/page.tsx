"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Map, { MapRef } from '@/components/map/Map';
import { IMapProvider, PolygonVertices } from '@/lib/domain/interfaces/IMapProvider';
import { Field } from '@/lib/domain/field';
import { FieldDTOConverter } from '@/lib/domain/dtos/field.dto';
import Toast from '@/components/ui/Toast';
import { authFirebase, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Farm } from '@/lib/domain/farm';
import { FirestoreFarmRepository } from '@/lib/infrastructure/firebase/FirestoreFarmRepository';
import { FirestoreFieldRepository } from '@/lib/infrastructure/firebase/FirestoreFieldRepository';
import { FirestoreUserRepository } from '@/lib/infrastructure/firebase/FirestoreUserRepository';
import Spinner from '@/components/ui/Spinner';

export default function Panel() {
  const mapRef = useRef<MapRef>(null);
  const [area, setArea] = useState<number | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [vertices, setVertices] = useState<PolygonVertices | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [fieldName, setFieldName] = useState<string>("");
  const [fields, setFields] = useState<Field[]>([]);
  const [isSavingField, setIsSavingField] = useState<boolean>(false);
  const [isSavingFarm, setIsSavingFarm] = useState<boolean>(false);
  const [isLoadingFarms, setIsLoadingFarms] = useState<boolean>(true);
  const [customAreaHa, setCustomAreaHa] = useState<string>("");
  const [currentAreaId, setCurrentAreaId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [mapProvider, setMapProvider] = useState<IMapProvider | null>(null);

  // Estados para creación de finca
  const [isCreatingFarm, setIsCreatingFarm] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [isFarmDropdownOpen, setIsFarmDropdownOpen] = useState<boolean>(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);

  // Cerrar dropdowns al hacer click afuera
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFarmDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMapReady = useCallback((provider: IMapProvider) => {
    console.log("Map Provider listo en Panel");
    setMapProvider(provider);
    provider.onMapClick(() => {
      console.log("Área deseleccionada");
      setSelectedArea(null);
      provider.highlightPolygon(null);
    });
  }, []);

  // 1. Monitorear estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authFirebase, (user) => {
      if (user) {
        console.log("Usuario autenticado:", user.uid);
        setUserId(user.uid);
      } else {
        console.log("No hay usuario autenticado, redirigiendo a login");
        setUserId(null);
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Cargar datos del usuario desde Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        setUserName("");
        setUserEmail("");
        return;
      }
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

  // 2. Cargar fincas del usuario
  const loadFarms = useCallback(async (uid: string) => {
    try {
      setIsLoadingFarms(true);
      const farmRepo = new FirestoreFarmRepository(db);
      const data = await farmRepo.listByUser(uid);
      setFarms(data); 
      if (data.length > 0) {
        setSelectedFarmId(data[0].id || null);
      } else {
        setSelectedFarmId(null);
      }
    } catch (err) {
      console.error("Error al cargar fincas:", err);
    } finally {
      setIsLoadingFarms(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      loadFarms(userId);
    }
  }, [userId, loadFarms]);

  // 3. Cargar lotes de la finca seleccionada
  const loadFields = useCallback(async (farmId: string) => {
    try {
      const fieldRepo = new FirestoreFieldRepository(db);
      const domainFields = await fieldRepo.listByFarmId(farmId);
      setFields(domainFields);
    } catch (err) {
      console.error("Error al cargar lotes:", err);
    }
  }, []);

  useEffect(() => {
    if (selectedFarmId) {
      loadFields(selectedFarmId);
      const farm = farms.find(f => f.id === selectedFarmId);
      if (farm && farm.centerCoordinates && mapProvider) {
        mapProvider.setCenter(farm.centerCoordinates);
      }
    } else {
      setFields([]);
    }
  }, [selectedFarmId, loadFields, farms, mapProvider]);

  // 4. Dibujar polígonos reactivamente en el mapa cuando cambien los fields o el provider
  useEffect(() => {
    if (mapProvider && selectedFarmId) {
      mapProvider.clearPolygons();
      fields.forEach(async (field) => {
        await mapProvider.drawPolygon(field.area, "#09ff00ff", {
          id: field.id,
          onClick: (id) => {
            console.log(`Área seleccionada: ${id}`);
            setSelectedArea(id);
            mapProvider.highlightPolygon(id);
          }
        });
      });
    }
  }, [fields, mapProvider, selectedFarmId]);

  const handleSelectArea = async () => {
    const provider = mapRef.current?.getProvider();
    if (provider) {
      try {
        setIsDrawing(true);
        // Deseleccionamos cualquier área actual al empezar a dibujar
        setSelectedArea(null);
        provider.highlightPolygon(null);
        
        const vertices = await provider.selectMapArea();
        
        // Generamos un ID temporal para rastrear el polígono en el mapa.
        // Nota: El ID definitivo e incremental se generará en la base de datos (backend).
        const areaId = `area-temp-${Date.now()}`;
        setCurrentAreaId(areaId);
        
        const polygon = await provider.drawPolygon(vertices, "#09ff00ff", {
          id: areaId,
          onClick: (id) => {
            console.log(`Área seleccionada: ${id}`);
            setSelectedArea(id);
            provider.highlightPolygon(id);
          }
        });
        const areaCalc = await provider.getPolygonArea(polygon);
        setArea(areaCalc);
        setCustomAreaHa((areaCalc / 10000).toFixed(2));
        setVertices(vertices);
      } catch (error) {
        console.error("Error seleccionando area:", error);
        setIsDrawing(false);
      }
    }
  };

  const handleUndo = () => {
    const provider = mapRef.current?.getProvider();
    if (provider) {
      provider.undoLastVertex();
    }
  };

  const handleClear = () => {
    const provider = mapRef.current?.getProvider();
    if (provider) {
      if (currentAreaId) {
        provider.removePolygon(currentAreaId);
      }
      provider.clearAreaSelection();
      setArea(null);
      setVertices(null);
      setFieldName("");
      setDescription("");
      setCustomAreaHa("");
      setCurrentAreaId(null);
      // Volver a iniciar el dibujo de área automáticamente
      handleSelectArea();
    }
  };

  const handleCancelDrawing = () => {
    const provider = mapRef.current?.getProvider();
    if (provider) {
      if (currentAreaId) {
        provider.removePolygon(currentAreaId);
      }
      provider.clearAreaSelection();
      setArea(null);
      setVertices(null);
      setFieldName("");
      setDescription("");
      setCustomAreaHa("");
      setCurrentAreaId(null);
      setIsDrawing(false);
    }
  };

  const handleAddField = async () => {
    if (area === null || vertices === null || !currentAreaId || !fieldName.trim() || !selectedFarmId) return;

    try {
      setIsSavingField(true);
      // 1. Instanciar repositorio
      const fieldRepo = new FirestoreFieldRepository(db);

      const parsedAreaHa = parseFloat(customAreaHa);
      const finalArea = isNaN(parsedAreaHa) ? area : parsedAreaHa * 10000;

      // 2. Guardar en backend
      await fieldRepo.create(selectedFarmId, {
        name: fieldName.trim(),
        totalArea: finalArea,
        area: vertices,
        description: description.trim(),
        tags: ["lote-manual"]
      });

      // 3. Recalcular el centro de la finca como promedio de todos sus vértices
      const allFields = await fieldRepo.listByFarmId(selectedFarmId);
      if (allFields.length > 0) {
        const allVertices = allFields.flatMap(f => f.area);
        const sumLat = allVertices.reduce((acc, [lat]) => acc + lat, 0);
        const sumLng = allVertices.reduce((acc, [, lng]) => acc + lng, 0);
        const newCenter: [number, number] = [sumLat / allVertices.length, sumLng / allVertices.length];
        
        const farmToUpdate = farms.find(f => f.id === selectedFarmId);
        if (farmToUpdate) {
          const farmRepo = new FirestoreFarmRepository(db);
          await farmRepo.update({ ...farmToUpdate, centerCoordinates: newCenter });
          // Actualizar el estado local de farms con el nuevo centro
          setFarms(prev => prev.map(f => f.id === selectedFarmId ? { ...f, centerCoordinates: newCenter } : f));
        }
      }

      // Recargar los lotes de la base de datos para redibujar en el mapa
      await loadFields(selectedFarmId);

      // Mostrar notificación de éxito
      setToast({
        isVisible: true,
        message: '¡El lote se ha creado correctamente!',
        type: 'success'
      });

      // Limpiar estados de creación
      setArea(null);
      setVertices(null);
      setFieldName("");
      setDescription("");
      setCustomAreaHa("");
      setCurrentAreaId(null);
      setIsDrawing(false);

    } catch (error: any) {
      console.error("Error al guardar el lote:", error);
      setToast({
        isVisible: true,
        message: error.message || 'Error al guardar el lote.',
        type: 'error'
      });
    } finally {
      setIsSavingField(false);
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmName.trim()) return;
    
    if (!userId) {
      console.warn("handleCreateFarm: userId es null, el usuario no está autenticado.");
      setToast({
        isVisible: true,
        message: 'Debes iniciar sesión para crear una finca.',
        type: 'error'
      });
      return;
    }

    try {
      setIsSavingFarm(true);
      const farmRepo = new FirestoreFarmRepository(db);
      const newFarm = {
        name: newFarmName,
        centerCoordinates: [-33.0392, -68.8795] as [number, number],
        userIds: [userId]
      };
      
      const farmId = await farmRepo.create(newFarm);

      // Recargar fincas del usuario
      await loadFarms(userId);
      
      // Seleccionar la finca recién creada
      setSelectedFarmId(farmId);
      
      // Cerrar modal y limpiar
      setIsCreatingFarm(false);
      setNewFarmName("");
      
      setToast({
        isVisible: true,
        message: '¡La finca se ha creado correctamente!',
        type: 'success'
      });
    } catch (error: any) {
      console.error("Error al crear la finca:", error);
      setToast({
        isVisible: true,
        message: error.message || 'Error al crear la finca.',
        type: 'error'
      });
    } finally {
      setIsSavingFarm(false);
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

  const selectedField = fields.find(f => f.id === selectedArea);

  return (
    <div className="flex flex-row h-screen w-full overflow-hidden">
      <nav className="hidden md:flex flex-col h-full border-r border-outline-variant dark:border-outline bg-surface-container dark:bg-surface-container-low w-64 flex-shrink-0 z-20 relative">
        <div className="p-6 border-b border-outline-variant flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden flex-shrink-0">
            <img
              alt="Farm Logo"
              className="w-full h-full object-cover"
              data-alt="A stylized, modern geometric logo of a farm or leaf in deep forest green and gold tones, conveying precision agriculture and professional reliability. The design should be clean, corporate, and suitable for a high-end software application."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoKYLRRayAgBpltqTiXAEzY68RgrnVYVdXyYqwEZLk8OmKvfAqYT7bVOpMxXuZrGaktp5Wrf0dA68u4qlIj1iRqIWrjTLjKuNOjxCfCSmQ32O3pMe5tQ8GHMyXjAU_iA4fLnsy2L-VokV-C2P-94qJd6F8wks_N2F4E_UFhkdZoq2zwZfvF-y8ViBLMHaq7cx1RmIB4LMQtAUHQX7ZC-sunIZQlj216n4O2yQvO6CYVVXFWyoRuEvrRnKLTw5j-WBTLT3SJO6TWbI"
            />
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md text-primary dark:text-primary-fixed-dim m-0 leading-tight">AgroManage</h1>
            <p className="font-label-caps text-label-caps text-on-surface-variant opacity-80">Datos de Precisión</p>
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto py-3">
          <li className="px-3 py-1">
            <a className="flex items-center gap-3 px-3 py-3 rounded text-primary font-bold border-r-4 border-primary bg-primary-container/10 cursor-pointer select-none" href="#">
              <span className="material-symbols-outlined text-[24px]" data-icon="map">map</span>
              <span className="font-label-caps text-label-caps text-[14px]">Panel de Control</span>
            </a>
          </li>

          <li className="px-3 py-1">
            <a className="flex items-center gap-3 px-3 py-3 rounded text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
              <span className="material-symbols-outlined text-[24px]" data-icon="agriculture">agriculture</span>
              <span className="font-label-caps text-label-caps text-[14px]">Planificación</span>
            </a>
          </li>

          <li className="px-3 py-1">
            <a className="flex items-center gap-3 px-3 py-3 rounded text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
              <span className="material-symbols-outlined text-[24px]" data-icon="compare_arrows">compare_arrows</span>
              <span className="font-label-caps text-label-caps text-[14px]">Análisis</span>
            </a>
          </li>

          <li className="px-3 py-1">
            <a className="flex items-center gap-3 px-3 py-3 rounded text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
              <span className="material-symbols-outlined text-[24px]" data-icon="history_edu">history_edu</span>
              <span className="font-label-caps text-label-caps text-[14px]">Registro de Actividad</span>
            </a>
          </li>

          <li className="px-3 py-1">
            <a className="flex items-center gap-3 px-3 py-3 rounded text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
              <span className="material-symbols-outlined text-[24px]" data-icon="bar_chart">bar_chart</span>
              <span className="font-label-caps text-label-caps text-[14px]">Informes</span>
            </a>
          </li>

          <li className="px-3 py-1">
            <a className="flex items-center gap-3 px-3 py-3 rounded text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
              <span className="material-symbols-outlined text-[24px]" data-icon="settings_applications">settings_applications</span>
              <span className="font-label-caps text-label-caps text-[14px]">Configuración de Temporada</span>
            </a>
          </li>
        </ul>

        <div className="p-3 border-t border-outline-variant">
          <a className="flex items-center gap-3 px-3 py-3 rounded text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
            <span className="material-symbols-outlined text-[24px]" data-icon="contact_support">contact_support</span>
            <span className="font-label-caps text-label-caps text-[14px]">Soporte</span>
          </a>
        </div>
      </nav>

      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline flex justify-between items-center px-6 h-20 w-full flex-shrink-0 z-40 relative">
          <div className="flex items-center gap-6">
            <button className="md:hidden text-on-surface-variant hover:bg-surface-container-high transition-colors p-3 rounded cursor-pointer active:opacity-80">
              <span className="material-symbols-outlined text-[28px]">menu</span>
            </button>
            <div className="md:hidden font-title-sm text-title-sm font-bold text-primary dark:text-primary-fixed-dim">AgroManage</div>

            {farms.length > 0 ? (
              <div className="relative hidden sm:flex items-center gap-2" ref={dropdownRef}>
                <div className="relative">
                  <button 
                    onClick={() => setIsFarmDropdownOpen(!isFarmDropdownOpen)}
                    className="flex items-center bg-[#f3f4ed] border border-outline-variant rounded-lg px-4 py-2 text-body-sm font-title-sm text-on-surface hover:bg-surface-container transition-all cursor-pointer shadow-sm gap-2 select-none"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">location_on</span>
                    <span>
                      {farms.find(f => f.id === selectedFarmId)?.name || "Seleccionar Finca"}
                    </span>
                    <span className={`material-symbols-outlined text-[20px] text-outline transition-transform duration-200 ${isFarmDropdownOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {/* Dropdown Options con Animación */}
                  <div 
                    className={`absolute top-full mt-2 left-0 w-64 bg-surface border border-outline-variant rounded-xl shadow-lg z-30 overflow-hidden transition-all duration-200 origin-top-left ${
                      isFarmDropdownOpen 
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                        : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }`}
                  >
                    <ul className="py-2 m-0 list-none max-h-60 overflow-y-auto">
                      {farms.map((f) => (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFarmId(f.id || null);
                              setIsFarmDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-body-md font-body-md hover:bg-primary-container/20 hover:text-primary transition-colors cursor-pointer border-none bg-transparent ${
                              f.id === selectedFarmId ? 'bg-primary-container/30 text-primary font-semibold' : 'text-on-surface'
                            }`}
                          >
                            {f.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsCreatingFarm(true)}
                  className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary-container transition-colors text-body-sm font-title-sm shadow-sm cursor-pointer border-none"
                  title="Agregar nueva finca"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Nueva Finca</span>
                </button>
              </div>
            ) : (
              <div className="relative hidden sm:block">
                <button 
                  onClick={() => setIsCreatingFarm(true)}
                  className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg hover:bg-primary-container transition-colors text-body-md font-body-md shadow-sm cursor-pointer border-none"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Agregar finca</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <button className="text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high transition-colors p-3 rounded-full cursor-pointer active:opacity-80 relative">
              <span className="material-symbols-outlined text-[28px]" data-icon="notifications">notifications</span>
              <span className="absolute top-2 right-2 w-3 h-3 bg-error rounded-full border-2 border-surface"></span>
            </button>
            <button className="text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high transition-colors p-3 rounded-full cursor-pointer active:opacity-80 hidden sm:block">
              <span className="material-symbols-outlined text-[28px]" data-icon="settings">settings</span>
            </button>
            <button className="text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-high transition-colors p-3 rounded-full cursor-pointer active:opacity-80 hidden sm:block">
              <span className="material-symbols-outlined text-[28px]" data-icon="help">help</span>
            </button>
            <div className="relative" ref={userDropdownRef}>
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="w-12 h-12 rounded-full ml-3 overflow-hidden border-2 border-outline-variant cursor-pointer p-0 bg-transparent flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary"
                title="Menú de usuario"
              >
                <img
                  alt="User profile avatar"
                  className="w-full h-full object-cover"
                  data-alt="A professional headshot of a person, suitable for a corporate or agricultural management software profile avatar. The lighting should be natural and professional."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC79QaJt9UYNqzVKsvgTtdDW9ljNmbdZO6eL4pquZ3S4PCtOL4WaYrk_x45hYtzCNUenNVSueyO33T9JBg-edKaK0NWcU3vSFJSKZTaQ7ghMqAW2mHUis2s7b1sGScTt9ENoaon2L9rtajDwtbknztKTZAJ4Ku2nM7NcYc6OeG8m5icWfc3WwKIrtG3LOcf8G-hhPuTmf3BYRZEF4RJG5LpZ4rc7Qkrua-jAnYvS7YmqXKNcVTvFy5tx6sJ9Gofj1KeedjI84405Sc"
                />
              </button>

              {/* Menú desplegable de usuario */}
              <div 
                className={`absolute top-full mt-2 right-0 w-64 bg-surface border border-outline-variant rounded-xl shadow-lg z-50 overflow-hidden transition-all duration-200 origin-top-right ${
                  isUserDropdownOpen 
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
              >
                <div className="p-4 border-b border-outline-variant">
                  <p className="font-title-sm text-title-sm font-semibold text-on-surface truncate m-0">
                    {userName || "Cargando..."}
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate m-0 mt-1">
                    {userEmail || ""}
                  </p>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-body-md font-body-md text-error hover:bg-error/10 hover:text-error transition-colors cursor-pointer border-none bg-transparent rounded-lg flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px] text-error">logout</span>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 relative w-full h-full bg-surface-container-lowest overflow-hidden flex">
          <div className="absolute inset-0 z-0 bg-slate-200">
            {/* Fondo placeholder */}
            {/* <img
              alt="Satellite Farm Map"
              className="w-full h-full object-cover opacity-90"
              data-alt="A high-resolution, top-down satellite view of a large agricultural farm showing delimited plots. The imagery should be crisp and professional, using natural greens and earth tones, typical of precision agriculture mapping software."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCykAVSbVnwgJnnI32QTI7wAGaUEUH2hcgtYUXjbtYF0E30OdtgNTMy1B3qx_qJr_f9F2LsL7DutrKOrlYYpsURLFJZEOj5CBC89p5r5BzwoI-KYbeBVAIru8DI8W4B2tBR7wasPD1rR9OKIW6PXzcDVGLJ0kAkBS2d3RQvejCZBsEDHJAu_Atm9Gz0KOrhubbve7nVSClc_HU4adff3N7jbriUIgeKYOfRIOi0mqeXTvVagbjl6T9AQwJ94nz9MSymH-tJdxaaPPc"
            /> */}
            

            <div className="absolute inset-0 z-10">
              <Map ref={mapRef} onReady={handleMapReady} />
            </div>
          </div>

          <div className="relative z-20 p-6 flex flex-col gap-6 h-full w-full max-w-sm pointer-events-none">
            {selectedArea === null && !isDrawing ? (
              selectedFarmId === null ? (
                <div className="bg-surface/90 backdrop-blur-md border border-outline-variant shadow-md rounded-xl p-8 pointer-events-auto flex flex-col gap-4">
                  <span className="material-symbols-outlined text-[36px] text-primary self-center">gite</span>
                  <p className="font-body-md text-body-md text-center text-on-surface-variant leading-relaxed">
                    Para comenzar a dibujar lotes, primero debes agregar una finca.
                  </p>
                  <button 
                    onClick={() => setIsCreatingFarm(true)}
                    className="w-full bg-primary text-on-primary font-title-sm text-title-sm py-3 rounded-lg hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-2 border-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Agregar Finca
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleSelectArea}
                  className="pointer-events-auto bg-[#f3f4ed] text-on-surface border border-outline-variant px-5 py-3 rounded-lg shadow-md flex items-center gap-2 hover:bg-surface-container transition-colors self-start cursor-pointer font-title-sm text-title-sm"
                  title="Añadir cuadro"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Añadir cuadro</span>
                </button>
              )
            ) : (
              <div className="bg-surface/90 backdrop-blur-md border border-outline-variant shadow-md rounded-xl p-10 pointer-events-auto flex flex-col gap-6">
                {isDrawing ? (
                  // Formulario de dibujo y datos de creación
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-headline-md text-headline-md text-on-surface m-0">Crear Nuevo Cuadro</h3>
                      <button 
                        onClick={handleCancelDrawing}
                        className="text-on-surface-variant hover:bg-surface-container-high transition-colors p-1 rounded-full cursor-pointer flex items-center justify-center border-none bg-transparent"
                        title="Cancelar creación"
                      >
                        <span className="material-symbols-outlined text-[24px]">close</span>
                      </button>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-4">Dibuje el área en el mapa y complete los datos.</p>
                    
                    <div className="flex flex-col gap-2 mb-4">
                      <label htmlFor="field-name" className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
                        Nombre del Cuadro <span className="text-red-500">*</span>
                      </label>
                      <input 
                        id="field-name"
                        type="text"
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value)}
                        placeholder="Ej: Lote 1, Parcela Norte"
                        className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary text-body-md font-body-md"
                      />
                    </div>

                    <div className="flex flex-col gap-2 mb-4">
                      <label htmlFor="field-desc" className="font-label-caps text-label-caps text-on-surface-variant">
                        Descripción / Variedad (Opcional)
                      </label>
                      <input 
                        id="field-desc"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ej: Malbec COT, Cabernet Franc"
                        className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary text-body-md font-body-md"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <button 
                          onClick={handleUndo}
                          className="flex-1 bg-surface-container text-on-surface-variant font-title-sm text-title-sm py-3 rounded-lg hover:bg-surface-container-high transition-colors shadow-sm flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[20px]">undo</span>
                          Deshacer
                        </button>
                        <button 
                          onClick={handleClear}
                          className="flex-1 bg-surface-container text-on-surface-variant font-title-sm text-title-sm py-3 rounded-lg hover:bg-surface-container-high transition-colors shadow-sm flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                          Limpiar
                        </button>
                      </div>

                      {area !== null && (
                        <div className="flex flex-col gap-2 mt-4 mb-2">
                          <label htmlFor="field-area" className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
                            Tamaño (ha) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            id="field-area"
                            type="number"
                            step="0.01"
                            min="0"
                            value={customAreaHa}
                            onChange={(e) => setCustomAreaHa(e.target.value)}
                            placeholder="Tamaño en Hectáreas"
                            className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary text-body-md font-body-md"
                          />
                        </div>
                      )}

                      <button 
                        disabled={area === null || vertices === null || !fieldName.trim() || isSavingField}
                        onClick={handleAddField}
                        className="w-full bg-primary text-on-primary font-title-sm text-title-sm py-4 rounded-lg hover:bg-surface-tint disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm mt-3 flex items-center justify-center gap-2 border-none cursor-pointer"
                      >
                        {isSavingField ? (
                          <>
                            <Spinner size={20} className="text-on-primary" />
                            <span>Guardando cuadro...</span>
                          </>
                        ) : (
                          "Agregar cuadro"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Lote Seleccionado
                  <>
                    <div className="flex flex-col gap-1">
                      <h2 className="font-headline-md text-headline-md text-on-surface m-0 leading-tight">
                        {selectedField ? selectedField.name : "Sin Selección"}
                      </h2>
                      {selectedField?.description && (
                        <p className="font-body-md text-body-md text-on-surface-variant mt-1 italic">
                          {selectedField.description}
                        </p>
                      )}
                      <span className="self-start bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-3 py-1.5 rounded-md text-[14px] mt-2">
                        Seleccionado
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg">
                        <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Tipo de Cultivo</p>
                        <p className="font-title-sm text-title-sm font-semibold text-primary">Uva</p>
                      </div>
                      <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg">
                        <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Subtipo</p>
                        <p className="font-title-sm text-title-sm font-semibold text-primary">Malbec</p>
                      </div>
                      <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg">
                        <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Tamaño</p>
                        <p className="font-data-mono text-data-mono text-primary text-[16px]">
                          {selectedField ? (selectedField.totalArea / 10000).toFixed(2) : "0"} ha
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 pointer-events-auto">
                      <button className="w-full bg-primary text-on-primary font-title-sm text-title-sm py-6 rounded-lg hover:bg-surface-tint transition-colors shadow-sm">
                        Ver Informe Completo
                      </button>
                      
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      {isCreatingFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-auto">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 flex flex-col gap-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <h3 className="font-headline-md text-headline-md text-on-surface m-0">Agregar Nueva Finca</h3>
              <button 
                onClick={() => setIsCreatingFarm(false)}
                className="text-on-surface-variant hover:bg-surface-container-high transition-colors p-1 rounded-full cursor-pointer flex items-center justify-center border-none bg-transparent"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateFarm} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="farm-name" className="font-label-caps text-label-caps text-on-surface-variant uppercase ml-1">Nombre de la Finca</label>
                <input 
                  id="farm-name"
                  type="text"
                  required
                  value={newFarmName}
                  onChange={(e) => setNewFarmName(e.target.value)}
                  placeholder="Ej. Finca Valle Hermoso, Luján de Cuyo"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary text-body-md font-body-md"
                />
              </div>

              <div className="flex gap-3 mt-4 border-t border-outline-variant pt-6">
                <button 
                  type="button"
                  onClick={() => setIsCreatingFarm(false)}
                  className="flex-1 bg-surface-container text-on-surface-variant font-title-sm text-title-sm py-3 rounded-lg hover:bg-surface-container-high transition-colors shadow-sm cursor-pointer border-none"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSavingFarm || !newFarmName.trim()}
                  className="flex-1 bg-primary text-on-primary font-title-sm text-title-sm py-3 rounded-lg hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  {isSavingFarm ? (
                    <>
                      <Spinner size={20} className="text-on-primary" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    "Crear Finca"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoadingFarms && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md pointer-events-auto">
          <div className="bg-surface border border-outline-variant p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full text-center">
            <Spinner size={40} className="text-primary animate-spin" />
            <p className="font-title-md text-title-md text-on-surface">Cargando fincas...</p>
          </div>
        </div>
      )}
    </div>
  );
}
