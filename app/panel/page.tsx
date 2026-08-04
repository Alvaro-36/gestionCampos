"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FarmMapView, { FarmMapViewRef } from '@/components/map/FarmMapView';
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
import Sidebar from '@/components/ui/Sidebar';
import FarmDropdown from '@/components/ui/FarmDropdown';

function PanelContent() {
  const farmMapRef = useRef<FarmMapViewRef>(null);
  const [area, setArea] = useState<number | null>(null);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [isGroupSelectMode, setIsGroupSelectMode] = useState<boolean>(false);
  const [vertices, setVertices] = useState<PolygonVertices | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [fieldName, setFieldName] = useState<string>("");
  const [fields, setFields] = useState<Field[]>([]);
  const [isSavingField, setIsSavingField] = useState<boolean>(false);
  const [isSavingFarm, setIsSavingFarm] = useState<boolean>(false);
  const [isLoadingFarms, setIsLoadingFarms] = useState<boolean>(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [customAreaHa, setCustomAreaHa] = useState<string>("");
  const [currentAreaId, setCurrentAreaId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedFromParams = useRef(false);
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
      setSelectedFieldIds([]);
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
    } catch (err) {
      console.error("Error al cargar fincas:", err);
    } finally {
      setIsLoadingFarms(false);
    }
  }, []);

  const initializedFarm = useRef(false);

  // Seleccionar la finca inicial (respetando los parámetros de la URL)
  useEffect(() => {
    if (farms.length === 0 || initializedFarm.current) return;
    
    const farmIdParam = searchParams.get('farmId');
    if (farmIdParam && farms.some(f => f.id === farmIdParam)) {
      setSelectedFarmId(farmIdParam);
    } else {
      setSelectedFarmId(farms[0].id || null);
    }
    initializedFarm.current = true;
  }, [farms, searchParams]);

  useEffect(() => {
    if (userId) {
      loadFarms(userId);
    }
  }, [userId, loadFarms]);

  const [loadedFieldsFarmId, setLoadedFieldsFarmId] = useState<string | null>(null);

  // 3. Callback cuando FarmMapView carga los lotes
  const handleFieldsLoaded = useCallback((loadedFields: Field[]) => {
    setFields(loadedFields);
    setLoadedFieldsFarmId(selectedFarmId);
  }, [selectedFarmId]);

  const handleSelectArea = async () => {
    const provider = farmMapRef.current?.getProvider();
    if (provider) {
      try {
        setIsDrawing(true);
        // Deseleccionamos cualquier área actual al empezar a dibujar
        setSelectedFieldIds([]);
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
            setSelectedFieldIds([id]);
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
    const provider = farmMapRef.current?.getProvider();
    if (provider) {
      provider.undoLastVertex();
    }
  };

  const handleClear = () => {
    const provider = farmMapRef.current?.getProvider();
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
    const provider = farmMapRef.current?.getProvider();
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
        tags: ["lote-manual"],
        dateHourDown: null
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
      await farmMapRef.current?.reloadFields();

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
      setSelectedFieldIds([]);

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

  const handleSoftDeleteField = () => {
    if (selectedFieldIds.length !== 1 || !selectedFarmId || !selectedField) return;
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteField = async () => {
    if (selectedFieldIds.length !== 1 || !selectedFarmId || !selectedField) return;

    try {
      setIsDeleting(true);
      const fieldRepo = new FirestoreFieldRepository(db);
      const updatedField = { ...selectedField, dateHourDown: new Date() };
      await fieldRepo.update(selectedFarmId, updatedField);

      // Recargar los lotes para que desaparezca del mapa
      await farmMapRef.current?.reloadFields();
      
      setSelectedFieldIds([]);
      setIsDeleteModalOpen(false);
      
      setToast({
        isVisible: true,
        message: '¡El lote se ha eliminado correctamente!',
        type: 'success'
      });
    } catch (error: any) {
      console.error("Error al eliminar el lote:", error);
      setToast({
        isVisible: true,
        message: error.message || 'Error al eliminar el lote.',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
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
      const userRepo = new FirestoreUserRepository(db);
      const newFarm = {
        name: newFarmName,
        centerCoordinates: [-33.0392, -68.8795] as [number, number],
        ownerId: userId,
        userIds: [userId]
      };
      
      const farmId = await farmRepo.create(newFarm);

      // Agregar acceso de owner al usuario
      const userData = await userRepo.getById(userId);
      if (userData) {
        const updatedAccesses = [...(userData.accesses || []), { farmId, role: 'owner' as const }];
        await userRepo.updateAccesses(userId, updatedAccesses);
      }

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

  useEffect(() => {
    console.log("Panel - Reset init - selectedFarmId changed to:", selectedFarmId);
    initializedFromParams.current = false;
  }, [selectedFarmId]);

  useEffect(() => {
    console.log("Panel - Init Effect - initialized:", initializedFromParams.current, "farmIdParam:", searchParams.get('farmId'), "selectedFarmId:", selectedFarmId, "fieldsCount:", fields.length, "loadedFieldsFarmId:", loadedFieldsFarmId);
    if (initializedFromParams.current) return;
    
    const farmIdParam = searchParams.get('farmId');
    const isParamFarmValid = farmIdParam ? farms.some(f => f.id === farmIdParam) : false;
    
    if (isParamFarmValid && farmIdParam !== selectedFarmId) {
      console.log("Panel - Init Effect - farmId mismatch, returning...");
      return; // Esperar a que cambie la finca
    }
    
    if (selectedFarmId && loadedFieldsFarmId === selectedFarmId) {
      const fieldIdsStr = searchParams.get('fieldIds');
      console.log("Panel - Init Effect - fieldIdsStr in URL:", fieldIdsStr);
      if (isParamFarmValid && fieldIdsStr) {
        const ids = fieldIdsStr.split(',');
        const validIds = ids.filter(id => fields.some(f => f.id === id));
        console.log("Panel - Init Effect - validIds filtered:", validIds);
        if (validIds.length > 0) {
          setSelectedFieldIds(validIds);
        }
      }
      initializedFromParams.current = true;
    }
  }, [farms, fields, searchParams, selectedFarmId, loadedFieldsFarmId]);

  // Sincronizar el estado actual de selección con la URL de forma reactiva al hacer click o cambiar de finca
  useEffect(() => {
    if (!initializedFromParams.current) return;

    const params = new URLSearchParams();
    if (selectedFarmId) {
      params.set('farmId', selectedFarmId);
    }
    if (selectedFieldIds.length > 0) {
      params.set('fieldIds', selectedFieldIds.join(','));
    }
    
    const newRelativePathQuery = window.location.pathname + '?' + params.toString();
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [selectedFarmId, selectedFieldIds]);

  const handleFieldClick = useCallback((id: string) => {
    setSelectedFieldIds(prev => {
      if (isGroupSelectMode) {
        if (prev.includes(id)) {
          return prev.filter(x => x !== id);
        } else {
          return [...prev, id];
        }
      } else {
        return [id];
      }
    });
  }, [isGroupSelectMode]);

  const selectedField = selectedFieldIds.length === 1 ? fields.find(f => f.id === selectedFieldIds[0]) : null;

  return (
    <div className="flex flex-row h-screen w-full overflow-hidden">
      <Sidebar activePage="panel" selectedFarmId={selectedFarmId} selectedFieldIds={selectedFieldIds} />

      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline flex justify-between items-center px-6 h-20 w-full flex-shrink-0 z-40 relative">
          <div className="flex items-center gap-6">
            <button className="md:hidden text-on-surface-variant hover:bg-surface-container-high transition-colors p-3 rounded cursor-pointer active:opacity-80">
              <span className="material-symbols-outlined text-[28px]">menu</span>
            </button>
            <div className="md:hidden font-title-sm text-title-sm font-bold text-primary dark:text-primary-fixed-dim">AgroManage</div>

            {farms.length > 0 ? (
              <div className="relative hidden sm:flex items-center gap-2" ref={dropdownRef}>
                  <FarmDropdown
                    farms={farms}
                    selectedFarmId={selectedFarmId}
                    onChange={(id) => setSelectedFarmId(id)}
                  />
                
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

            <div className="relative" ref={userDropdownRef}>
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="w-11 h-11 rounded-full ml-3 bg-primary text-on-primary font-bold text-[18px] border-2 border-primary/30 cursor-pointer p-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary shadow-sm hover:opacity-90 transition-opacity"
                title="Menú de usuario"
              >
                <span>{(userName || userEmail || 'U').trim().charAt(0).toUpperCase()}</span>
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
              <FarmMapView
                ref={farmMapRef}
                farmId={selectedFarmId}
                centerCoordinates={farms.find(f => f.id === selectedFarmId)?.centerCoordinates}
                selectedFieldIds={selectedFieldIds}
                onFieldClick={handleFieldClick}
                onMapClick={() => {
                  setSelectedFieldIds([]);
                }}
                onFieldsLoaded={handleFieldsLoaded}
                onReady={handleMapReady}
              />
            </div>
          </div>

          <div className="relative z-20 p-6 flex flex-col gap-6 h-full w-full max-w-sm pointer-events-none">
            {selectedFieldIds.length === 0 && !isDrawing ? (
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
                <div className="flex flex-col gap-3 pointer-events-auto">
                  <button 
                    onClick={handleSelectArea}
                    className="w-full bg-[#f3f4ed] text-on-surface border border-outline-variant px-5 py-3 rounded-lg shadow-md flex items-center justify-center gap-2 hover:bg-surface-container transition-colors font-title-sm text-title-sm cursor-pointer border-none"
                    title="Añadir cuadro"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    <span>Añadir cuadro</span>
                  </button>
                  <button 
                    onClick={() => setIsGroupSelectMode(!isGroupSelectMode)}
                    className={`w-full border px-5 py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-colors font-title-sm text-title-sm cursor-pointer ${
                      isGroupSelectMode 
                        ? 'bg-primary text-on-primary border-primary' 
                        : 'bg-[#f3f4ed] text-on-surface border-outline-variant hover:bg-surface-container'
                    }`}
                    title="Seleccionar grupo"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isGroupSelectMode ? 'library_add_check' : 'library_add'}
                    </span>
                    <span>{isGroupSelectMode ? 'Modo Selección Múltiple' : 'Seleccionar grupo'}</span>
                  </button>
                </div>
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
                  // Lotes Seleccionados
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="font-headline-md text-headline-md text-on-surface m-0 leading-tight">
                        {selectedFieldIds.length === 1 ? (selectedField ? selectedField.name : "Cargando...") : "Grupo Seleccionado"}
                      </h2>
                      <button 
                        onClick={() => setSelectedFieldIds([])}
                        className="text-on-surface-variant hover:bg-surface-container-high transition-colors p-1 rounded-full cursor-pointer flex items-center justify-center border-none bg-transparent"
                        title="Limpiar selección"
                      >
                        <span className="material-symbols-outlined text-[24px]">close</span>
                      </button>
                    </div>

                    {selectedFieldIds.length === 1 && selectedField?.description && (
                      <p className="font-body-md text-body-md text-on-surface-variant mt-0 italic">
                        {selectedField.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 my-2">
                      <span className="bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-3 py-1.5 rounded-md text-[14px]">
                        {selectedFieldIds.length === 1 ? "Seleccionado" : `${selectedFieldIds.length} Lotes`}
                      </span>
                      <button 
                        onClick={() => setIsGroupSelectMode(!isGroupSelectMode)}
                        className={`px-3 py-1.5 rounded-md text-[14px] font-label-caps text-label-caps border cursor-pointer transition-colors ${
                          isGroupSelectMode 
                            ? 'bg-primary text-on-primary border-primary' 
                            : 'bg-surface-container text-on-surface border-outline-variant'
                        }`}
                      >
                        {isGroupSelectMode ? 'Selección Múltiple: ON' : 'Selección Múltiple: OFF'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {selectedFieldIds.length === 1 ? (
                        <>
                          <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg">
                            <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Tipo de Cultivo</p>
                            <p className="font-title-sm text-title-sm font-semibold text-primary">Uva</p>
                          </div>
                          <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg">
                            <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Subtipo</p>
                            <p className="font-title-sm text-title-sm font-semibold text-primary">Malbec</p>
                          </div>
                          <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg col-span-2">
                            <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Tamaño</p>
                            <p className="font-data-mono text-data-mono text-primary text-[16px]">
                              {selectedField ? (selectedField.totalArea / 10000).toFixed(2) : "0"} ha
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg col-span-2">
                            <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Lotes Seleccionados</p>
                            <div className="max-h-24 overflow-y-auto text-body-sm text-on-surface font-semibold flex flex-wrap gap-1">
                              {fields.filter(f => selectedFieldIds.includes(f.id)).map(f => f.name).join(', ')}
                            </div>
                          </div>
                          <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg col-span-2">
                            <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Tamaño Total</p>
                            <p className="font-data-mono text-data-mono text-primary text-[16px]">
                              {(fields.filter(f => selectedFieldIds.includes(f.id)).reduce((acc, f) => acc + f.totalArea, 0) / 10000).toFixed(2)} ha
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {selectedFieldIds.length === 1 && (
                      <div className="mt-6 flex flex-col gap-3 pointer-events-auto">
                        <button 
                          onClick={handleSoftDeleteField}
                          className="w-full bg-error text-on-error font-title-sm text-title-sm py-4 rounded-lg hover:bg-error/90 transition-colors shadow-sm flex items-center justify-center gap-2 border-none cursor-pointer"
                          title="Eliminar lote"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                          Eliminar Lote
                        </button>
                      </div>
                    )}
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

      {/* Modal Confirmar Eliminar Lote */}
      {isDeleteModalOpen && selectedField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-[24px] font-bold text-on-surface mb-2">Eliminar Lote</h2>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6">
              ¿Estás seguro de que deseas eliminar el lote <strong className="text-primary font-bold">{selectedField.name}</strong>? Esta acción lo ocultará del mapa, aunque mantendrá su historial.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-full text-label-lg font-label-lg font-semibold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer border-none bg-transparent"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteField}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-error text-on-error rounded-full text-label-lg font-label-lg font-semibold hover:bg-error/95 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2 cursor-pointer border-none"
              >
                {isDeleting ? (
                  <>
                    <Spinner size={16} className="text-on-error" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Eliminar Lote</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

export default function Panel() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-surface">Cargando...</div>}>
      <PanelContent />
    </Suspense>
  );
}
