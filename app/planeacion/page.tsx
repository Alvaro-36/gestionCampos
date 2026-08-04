"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FarmMapView, { FarmMapViewRef } from '@/components/map/FarmMapView';
import { Field } from '@/lib/domain/field';
import { Farm } from '@/lib/domain/farm';
import { authFirebase, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { FirestoreFarmRepository } from '@/lib/infrastructure/firebase/FirestoreFarmRepository';
import { FirestoreUserRepository } from '@/lib/infrastructure/firebase/FirestoreUserRepository';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import { FirestoreSeasonRepository } from '@/lib/infrastructure/firebase/FirestoreSeasonRepository';
import { FirestoreTaskRepository } from '@/lib/infrastructure/firebase/FirestoreTaskRepository';
import { Product } from '@/lib/domain/product';
import { FirestoreProductRepository } from '@/lib/infrastructure/firebase/FirestoreProductRepository';
import { Season } from '@/lib/domain/season';
import Sidebar from '@/components/ui/Sidebar';
import FarmDropdown from '@/components/ui/FarmDropdown';

function PlaneacionContent() {
  const farmMapRef = useRef<FarmMapViewRef>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedFromParams = useRef(false);

  // Autenticación y usuario
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Fincas y Campos
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [isFarmDropdownOpen, setIsFarmDropdownOpen] = useState<boolean>(false);
  const [isLoadingFarms, setIsLoadingFarms] = useState<boolean>(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([]);
  const [isGroupSelectMode, setIsGroupSelectMode] = useState<boolean>(false);

  // Calculadora
  const [dosis, setDosis] = useState<string>("");
  const [costoUnitario, setCostoUnitario] = useState<string>("");
  const [formulation, setFormulation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedSeasonName, setSelectedSeasonName] = useState<string>("Temporada 2026");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState<boolean>(false);
  const [newSeasonName, setNewSeasonName] = useState<string>("");
  const [newSeasonStartDate, setNewSeasonStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [fieldsNeedingSeason, setFieldsNeedingSeason] = useState<string[]>([]);
  const [activeSeasonsForModal, setActiveSeasonsForModal] = useState<Season[]>([]);
  const [selectedExistingSeasonId, setSelectedExistingSeasonId] = useState<string>("");
  const [activeSeasons, setActiveSeasons] = useState<Season[]>([]);
  const [selectedFilterSeasonId, setSelectedFilterSeasonId] = useState<string>("");

  // Cargar temporadas activas de la finca seleccionada para los filtros
  useEffect(() => {
    if (selectedFarmId) {
      const fetchSeasons = async () => {
        try {
          const seasonRepo = new FirestoreSeasonRepository(db);
          const allSeasons = await seasonRepo.listByFarm(selectedFarmId);
          const active = allSeasons.filter(s => s.endDate === null || s.endDate === undefined);
          setActiveSeasons(active);
        } catch (error) {
          console.error("Error fetching active seasons:", error);
        }
      };
      fetchSeasons();
    } else {
      setActiveSeasons([]);
    }
  }, [selectedFarmId]);

  // Productos
  const [products, setProducts] = useState<Product[]>([]);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>("");
  const [newProductPrice, setNewProductPrice] = useState<string>("");
  const [newProductDose, setNewProductDose] = useState<string>("");

  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Toast
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isVisible: false,
    message: '',
    type: 'success'
  });

  // Cerrar dropdowns al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFarmDropdownOpen(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Monitorear estado de autenticación
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

  // Cargar productos
  useEffect(() => {
    if (selectedFarmId) {
      const fetchProducts = async () => {
        try {
          const productRepo = new FirestoreProductRepository(db);
          const farmProducts = await productRepo.listByFarm(selectedFarmId);
          setProducts(farmProducts);
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      };
      fetchProducts();
    } else {
      setProducts([]);
    }
  }, [selectedFarmId]);

  const handleCreateProduct = async () => {
    if (!selectedFarmId || !newProductName.trim()) return;
    
    const parsedPrice = newProductPrice ? parseFloat(newProductPrice) : undefined;
    const parsedDose = newProductDose ? parseFloat(newProductDose) : undefined;

    if (parsedPrice !== undefined && parsedPrice < 0) {
      setToast({ isVisible: true, message: "El precio por unidad no puede ser negativo.", type: "error" });
      return;
    }
    if (parsedDose !== undefined && parsedDose <= 0) {
      setToast({ isVisible: true, message: "La dosis por Ha debe ser mayor a 0.", type: "error" });
      return;
    }

    try {
      setIsExecuting(true);
      const productRepo = new FirestoreProductRepository(db);
      const newProductData = {
        farmId: selectedFarmId,
        name: newProductName.trim(),
        unit: 'L',
        defaultPrice: newProductPrice ? parseFloat(newProductPrice) : undefined,
        defaultDose: newProductDose ? parseFloat(newProductDose) : undefined,
      };
      
      const newProductId = await productRepo.create(newProductData);
      const newProduct = { id: newProductId, ...newProductData };
      
      setProducts(prev => [...prev, newProduct]);
      setFormulation(newProductId);
      if (newProductData.defaultDose !== undefined) setDosis(newProductData.defaultDose.toString());
      if (newProductData.defaultPrice !== undefined) setCostoUnitario(newProductData.defaultPrice.toString());
      
      setIsNewProductModalOpen(false);
      setNewProductName("");
      setNewProductPrice("");
      setNewProductDose("");
      
      setToast({ isVisible: true, message: "Producto creado con éxito", type: "success" });
    } catch (error: any) {
      console.error("Error al crear producto:", error);
      setToast({ isVisible: true, message: "Error al crear producto", type: "error" });
    } finally {
      setIsExecuting(false);
    }
  };

  // Callback cuando FarmMapView carga los lotes
  const handleFieldsLoaded = useCallback((loadedFields: Field[]) => {
    setFields(loadedFields);
    setLoadedFieldsFarmId(selectedFarmId);
  }, [selectedFarmId]);

  useEffect(() => {
    console.log("Planeacion - Reset init - selectedFarmId changed to:", selectedFarmId);
    initializedFromParams.current = false;
  }, [selectedFarmId]);

  useEffect(() => {
    console.log("Planeacion - Init Effect - initialized:", initializedFromParams.current, "farmIdParam:", searchParams.get('farmId'), "selectedFarmId:", selectedFarmId, "fieldsCount:", fields.length, "loadedFieldsFarmId:", loadedFieldsFarmId);
    if (initializedFromParams.current) return;
    
    const farmIdParam = searchParams.get('farmId');
    const isParamFarmValid = farmIdParam ? farms.some(f => f.id === farmIdParam) : false;
    
    if (isParamFarmValid && farmIdParam !== selectedFarmId) {
      console.log("Planeacion - Init Effect - farmId mismatch, returning...");
      return; // Esperar a que cambie la finca
    }
    
    if (selectedFarmId && loadedFieldsFarmId === selectedFarmId) {
      const fieldIdsStr = searchParams.get('fieldIds');
      console.log("Planeacion - Init Effect - fieldIdsStr in URL:", fieldIdsStr);
      if (isParamFarmValid && fieldIdsStr) {
        const ids = fieldIdsStr.split(',');
        const validIds = ids.filter(id => fields.some(f => f.id === id));
        console.log("Planeacion - Init Effect - validIds filtered:", validIds);
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

  // Manejo de clic en lote en el mapa
  const handleFieldClick = useCallback((id: string) => {
    setSelectedFieldIds(prev => {
      if (isGroupSelectMode) {
        // Modo múltiple: toggle
        if (prev.includes(id)) {
          return prev.filter(item => item !== id);
        } else {
          return [...prev, id];
        }
      } else {
        // Modo único: reemplaza
        return [id];
      }
    });
    setSelectedFilterSeasonId("");
  }, [isGroupSelectMode]);

  // Manejo de clic en el fondo del mapa para limpiar selección
  const handleMapClick = useCallback(() => {
    setSelectedFieldIds([]);
    setSelectedFilterSeasonId("");
  }, []);

  // Cambio de finca en dropdown
  const handleFarmChange = (id: string | null) => {
    setSelectedFarmId(id);
    setIsFarmDropdownOpen(false);
    setSelectedFieldIds([]); // Limpiar selección al cambiar de finca
    setSelectedFilterSeasonId("");
  };

  // Activar/desactivar selección grupal
  const toggleGroupSelectMode = () => {
    setIsGroupSelectMode(prev => {
      const newMode = !prev;
      if (!newMode) {
        // Al desactivar el modo "Seleccionar grupo", mantendremos el último lote seleccionado.
        // Si no había ninguno, queda vacío.
        setSelectedFieldIds(current => {
          if (current.length > 0) {
            return [current[current.length - 1]];
          }
          return [];
        });
      }
      return newMode;
    });
  };

  const areAllSelected = fields.length > 0 && selectedFieldIds.length === fields.length;

  const handleToggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedFieldIds([]);
    } else {
      setIsGroupSelectMode(true);
      setSelectedFieldIds(fields.map(f => f.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedFieldIds([]);
    setSelectedFilterSeasonId("");
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

  // Cálculos de la calculadora
  const selectedFields = fields.filter(f => selectedFieldIds.includes(f.id));
  const totalAreaM2 = selectedFields.reduce((acc, f) => acc + f.totalArea, 0);
  const totalAreaHa = totalAreaM2 / 10000;

  const parsedDosis = parseFloat(dosis) || 0;
  const parsedCosto = parseFloat(costoUnitario) || 0;

  const volumenTotal = totalAreaHa * parsedDosis;
  const costoTotal = volumenTotal * parsedCosto;

  const handleSaveDraft = () => {
    if (selectedFieldIds.length === 0) {
      setToast({
        isVisible: true,
        message: "Por favor, selecciona al menos un lote para guardar el borrador.",
        type: "error"
      });
      return;
    }
    setToast({
      isVisible: true,
      message: "¡Borrador de tratamiento guardado con éxito!",
      type: "success"
    });
  };

  const saveTask = async (seasonId: string) => {
    if (!selectedFarmId) return;
    const taskRepo = new FirestoreTaskRepository(db);
    
    const selectedProduct = products.find(p => p.id === formulation);
    const parsedDosis = parseFloat(dosis) || 0;
    const parsedCosto = parseFloat(costoUnitario) || 0;
    const totalAreaM2 = selectedFields.reduce((acc, f) => acc + f.totalArea, 0);
    const totalAreaHa = totalAreaM2 / 10000;
    const volumenTotal = totalAreaHa * parsedDosis;

    await taskRepo.create(selectedFarmId, seasonId, {
      dateTime: new Date(),
      name: selectedProduct?.name || formulation,
      description: notes.trim(),
      affectedFields: selectedFieldIds,
      appliedProducts: [
        {
          productId: selectedProduct?.id || 'manual',
          name: selectedProduct?.name || formulation,
          quantity: volumenTotal,
          unit: selectedProduct?.unit || 'L',
          estimatedPrice: parsedCosto,
          realPrice: parsedCosto
        }
      ]
    });
    
    const productName = products.find(p => p.id === formulation)?.name || formulation;
    setToast({
      isVisible: true,
      message: `¡Tratamiento de ${productName} iniciado con éxito en ${selectedFields.length} lotes!`,
      type: "success"
    });
    
    setNotes("");
    setIsExecuting(false);
  };

  const handleConfirmNewSeason = async () => {
    if (!selectedFarmId) return;

    if (!selectedExistingSeasonId && (!newSeasonStartDate || !newSeasonName.trim())) {
      setToast({ isVisible: true, message: "Por favor ingresa un nombre y fecha para la temporada o selecciona una existente.", type: "error" });
      return;
    }
    
    try {
      setIsExecuting(true);
      const seasonRepo = new FirestoreSeasonRepository(db);

      if (selectedExistingSeasonId) {
        const existingSeason = activeSeasonsForModal.find(s => s.id === selectedExistingSeasonId);
        if (!existingSeason) throw new Error("Temporada no encontrada.");
        
        const newFieldIds = Array.from(new Set([...(existingSeason.fieldIds || []), ...fieldsNeedingSeason]));
        await seasonRepo.update(selectedFarmId, {
          ...existingSeason,
          fieldIds: newFieldIds
        });
      } else {
        const startDate = new Date(newSeasonStartDate);
        
        await seasonRepo.create(selectedFarmId, {
          name: newSeasonName.trim(),
          startDate,
          endDate: null,
          estimatedPricePerKg: 0,
          realPricePerKg: 0,
          kilosObtained: 0,
          fieldIds: fieldsNeedingSeason
        });
      }
      
      setIsSeasonModalOpen(false);
      setFieldsNeedingSeason([]);
      setNewSeasonName("");
      setSelectedExistingSeasonId("");
      
      // Intentamos ejecutar el tratamiento nuevamente ahora que tienen temporada
      await handleExecuteTreatment();
      
    } catch (error: any) {
      console.error("Error al crear nuevas temporadas:", error);
      setToast({
        isVisible: true,
        message: "Error al crear las nuevas temporadas.",
        type: "error"
      });
      setIsExecuting(false);
    }
  };

  const handleExecuteTreatment = async () => {
    if (!selectedFarmId || selectedFieldIds.length === 0) {
      setToast({
        isVisible: true,
        message: "Por favor, selecciona al menos un lote para ejecutar el tratamiento.",
        type: "error"
      });
      return;
    }
    
    const parsedDosis = parseFloat(dosis) || 0;
    const parsedCosto = parseFloat(costoUnitario) || 0;

    if (parsedCosto < 0) {
      setToast({ isVisible: true, message: "El costo unitario no puede ser negativo.", type: "error" });
      return;
    }
    if (parsedDosis <= 0) {
      setToast({ isVisible: true, message: "La dosis debe ser mayor a 0.", type: "error" });
      return;
    }

    try {
      setIsExecuting(true);
      const seasonRepo = new FirestoreSeasonRepository(db);
      
      const allSeasons = await seasonRepo.listByFarm(selectedFarmId);
      const activeSeasons = allSeasons.filter(s => s.endDate === null || s.endDate === undefined);
      
      const missingSeasons: string[] = [];
      const activeSeasonsList: { fieldId: string, season: any }[] = [];
      
      for (const fieldId of selectedFieldIds) {
        const activeSeasonForField = activeSeasons.find(s => s.fieldIds && s.fieldIds.includes(fieldId));
        if (!activeSeasonForField) {
          missingSeasons.push(fieldId);
        } else {
          activeSeasonsList.push({ fieldId, season: activeSeasonForField });
        }
      }
      
      if (activeSeasonsList.length > 0) {
        // Verificar si las temporadas activas son "diferentes"
        const uniqueSeasonIds = new Set(activeSeasonsList.map(a => a.season.id));

        if (uniqueSeasonIds.size > 1) {
           const fieldNames = activeSeasonsList.map(a => {
               const field = fields.find(f => f.id === a.fieldId);
               return field ? field.name : 'Desconocido';
           });
           setToast({
              isVisible: true,
              message: `Error: No se puede aplicar el tratamiento porque los lotes (${fieldNames.join(", ")}) pertenecen a distintas temporadas vigentes.`,
              type: "error"
           });
           setIsExecuting(false);
           return;
        }

        // Si todas son la misma temporada, sumamos los lotes faltantes a esa temporada
        if (missingSeasons.length > 0) {
           const commonSeason = activeSeasonsList[0].season;
           const newFieldIds = Array.from(new Set([...(commonSeason.fieldIds || []), ...missingSeasons]));
           
           await seasonRepo.update(selectedFarmId, {
             ...commonSeason,
             fieldIds: newFieldIds
           });
           
           for (const fieldId of missingSeasons) {
             activeSeasonsList.push({ fieldId, season: commonSeason });
           }
           missingSeasons.length = 0; 
        }
      }
      
      if (missingSeasons.length > 0) {
        setFieldsNeedingSeason(missingSeasons);
        setActiveSeasonsForModal(activeSeasons);
        setSelectedExistingSeasonId("");
        setIsSeasonModalOpen(true);
        setIsExecuting(false);
        return; // Detenemos la ejecución y abrimos el modal
      }
      
      // Obtener primarySeasonId
      const primaryActive = activeSeasonsList.find(a => a.fieldId === selectedFieldIds[0]);
      
      if (!primaryActive || !primaryActive.season.id) {
         throw new Error("No se pudo obtener la temporada principal.");
      }
      
      await saveTask(primaryActive.season.id);
      
    } catch (error: any) {
      console.error("Error al validar temporadas:", error);
      setToast({
        isVisible: true,
        message: error.message || "Error al validar las temporadas.",
        type: "error"
      });
      setIsExecuting(false);
    }
  };

  const activeFarm = farms.find(f => f.id === selectedFarmId);

  return (
    <div className="flex flex-row h-screen w-full overflow-hidden">
      {/* Sidebar de Navegación */}
      <Sidebar activePage="planeacion" selectedFarmId={selectedFarmId} selectedFieldIds={selectedFieldIds} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="flex justify-between items-center px-6 h-16 w-full border-b border-outline-variant/30 bg-surface z-10 shrink-0">
          <div className="flex items-center gap-6">
            <button className="md:hidden text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-title-sm font-title-sm font-bold text-on-surface md:hidden">Planeación</h2>
            <div className="hidden md:block">
              <h2 className="text-title-sm font-title-sm font-bold text-on-surface">Planeación de Tratamientos y Costos</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-surface-container-high rounded-full px-3 py-1 border border-outline-variant/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <input className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant/70 w-64 h-8 outline-none" placeholder="Buscar campos, productos..." type="text"/>
            </div>


            {/* Menú de perfil de usuario */}
            <div className="relative" ref={userDropdownRef}>
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="w-10 h-10 rounded-full bg-primary text-on-primary font-bold text-[16px] border border-primary/30 cursor-pointer p-0 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary shadow-sm hover:opacity-90 transition-opacity ml-1"
                title="Menú de usuario"
              >
                <span>{(userName || userEmail || 'U').trim().charAt(0).toUpperCase()}</span>
              </button>

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

        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Columna Izquierda: Selector de Finca, Filtros y Mapa */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Dropdown Selector de Finca */}
              <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-4 flex flex-col gap-2">
                <label className="block text-label-caps font-label-caps text-on-surface-variant text-[11px]">Seleccionar Finca</label>
                {farms.length > 0 ? (
                  <FarmDropdown
                    farms={farms}
                    selectedFarmId={selectedFarmId}
                    onChange={(id) => handleFarmChange(id)}
                  />
                ) : (
                  <p className="text-body-sm text-on-surface-variant">No tienes fincas registradas.</p>
                )}
              </div>

              {/* Contenedor del Mapa Reutilizado */}
              <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden relative min-h-[350px] flex-1 flex flex-col">
                <div className="absolute bottom-4 left-4 z-10 bg-surface/90 backdrop-blur-sm px-6 py-3 rounded-lg border border-outline-variant/30 shadow-sm pointer-events-none">
                  <p className="text-body-md font-body-md text-on-surface flex items-center gap-2 m-0">
                    <span className="material-symbols-outlined text-[#0ea5e9] text-[20px]">touch_app</span>
                    <span>
                      {isGroupSelectMode 
                        ? 'Haz clic en los cuadros para sumarlos/restarlos al grupo seleccionado' 
                        : 'Haz clic en un cuadro del mapa para seleccionarlo'}
                    </span>
                  </p>
                </div>

                <div className="w-full h-full relative flex-1">
                  <FarmMapView
                    ref={farmMapRef}
                    farmId={selectedFarmId}
                    centerCoordinates={activeFarm?.centerCoordinates}
                    selectedFieldIds={selectedFieldIds}
                    onFieldClick={handleFieldClick}
                    onMapClick={handleMapClick}
                    onFieldsLoaded={handleFieldsLoaded}
                  />
                </div>
              </div>
            </div>

            {/* Columna Derecha: Calculadora, Tabla Comparativa, Notas */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Selección de Campo / Filtros */}
              <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-title-sm font-title-sm text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary text-[20px]">filter_list</span>
                    Selección de Campo
                  </h3>
                  <span className="text-label-caps font-label-caps text-on-surface-variant bg-surface-container-high px-2 py-1 rounded">
                    {totalAreaHa.toFixed(1)} ha SELECCIONADAS
                  </span>
                </div>
                
                {activeSeasons.length > 0 && (
                  <div className="mt-2">
                    <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">SELECCIONAR POR TEMPORADA</label>
                    <select 
                      value={selectedFilterSeasonId}
                      onChange={(e) => {
                        const seasonId = e.target.value;
                        setSelectedFilterSeasonId(seasonId);
                        if (seasonId) {
                          const season = activeSeasons.find(s => s.id === seasonId);
                          if (season && season.fieldIds) {
                            setSelectedFieldIds(season.fieldIds);
                            // Disable group select mode so next click selects only one field
                            setIsGroupSelectMode(false);
                          }
                        }
                      }}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-12 px-4 outline-none appearance-none cursor-pointer hover:bg-surface-container transition-colors"
                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2349454f%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                    >
                      <option value="" disabled>-- Elige una temporada para seleccionar sus lotes --</option>
                      {activeSeasons.map(season => (
                        <option key={season.id} value={season.id}>{season.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap items-end gap-3 mt-4">
                  <button 
                    onClick={toggleGroupSelectMode}
                    className={`h-14 px-6 border rounded-lg text-body-md font-body-md font-medium transition-colors flex items-center gap-3 cursor-pointer ${
                      isGroupSelectMode 
                        ? 'bg-primary text-on-primary border-primary' 
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isGroupSelectMode ? 'library_add_check' : 'library_add'}
                    </span>
                    <span>{isGroupSelectMode ? 'Modo Selección Múltiple' : 'Seleccionar grupo'}</span>
                  </button>

                  <button 
                    onClick={handleToggleSelectAll}
                    className="h-14 px-6 w-[220px] justify-center bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/50 rounded-lg text-body-md font-body-md font-medium transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {areAllSelected ? 'deselect' : 'select_all'}
                    </span>
                    <span>{areAllSelected ? 'Deseleccionar Todo' : 'Seleccionar Todo'}</span>
                  </button>

                  <button 
                    onClick={handleClearSelection}
                    className="h-14 px-6 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/50 rounded-lg text-body-md font-body-md font-medium transition-colors flex items-center gap-3 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">clear_all</span>
                    <span>Limpiar</span>
                  </button>
                </div>
              </div>
              
              {/* Calculadora de Tratamientos */}
              <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 flex flex-col">
                <h3 className="text-title-sm font-title-sm text-on-surface border-b border-outline-variant/30 pb-3 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calculate</span>
                  Calculadora de Tratamientos
                </h3>
                <div className="space-y-4">
                  <div className="relative" ref={productDropdownRef}>
                    <label className="block text-body-md font-body-md text-on-surface-variant font-medium mb-1">Formulación del Producto</label>
                    {products.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => setIsNewProductModalOpen(true)}
                        className="w-full flex items-center justify-center bg-[#f3f4ed] border border-outline-variant rounded-lg px-4 h-14 text-body-md font-title-sm text-primary hover:bg-surface-container transition-all cursor-pointer shadow-sm gap-2 select-none"
                      >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span>Nuevo Producto</span>
                      </button>
                    ) : (
                      <>
                        <button 
                          type="button"
                          onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                          className="w-full flex items-center justify-between bg-[#f3f4ed] border border-outline-variant rounded-lg px-4 h-14 text-body-md font-title-sm text-on-surface hover:bg-surface-container transition-all cursor-pointer shadow-sm gap-2 select-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px] text-primary">science</span>
                            <span>
                              {products.find(p => p.id === formulation)?.name || "Selecciona un producto..."}
                            </span>
                          </div>
                          <span className={`material-symbols-outlined text-[20px] text-outline transition-transform duration-200 ${isProductDropdownOpen ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </button>

                        <div 
                          className={`absolute top-full mt-1 left-0 w-full bg-surface border border-outline-variant rounded-xl shadow-lg z-30 overflow-hidden transition-all duration-200 origin-top-left ${
                            isProductDropdownOpen 
                              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                              : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                          }`}
                        >
                          <ul className="py-1.5 m-0 list-none max-h-60 overflow-y-auto pl-0">
                            {products.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormulation(p.id);
                                    setIsProductDropdownOpen(false);
                                    if (p.defaultDose !== undefined) setDosis(p.defaultDose.toString());
                                    if (p.defaultPrice !== undefined) setCostoUnitario(p.defaultPrice.toString());
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-body-sm font-body-sm hover:bg-primary-container/20 hover:text-primary transition-colors cursor-pointer border-none bg-transparent ${
                                    p.id === formulation ? 'bg-primary-container/30 text-primary font-semibold' : 'text-on-surface'
                                  }`}
                                >
                                  {p.name}
                                </button>
                              </li>
                            ))}
                            <li className="border-t border-outline-variant/30 mt-1 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsProductDropdownOpen(false);
                                  setIsNewProductModalOpen(true);
                                }}
                                className="w-full text-left px-4 py-2.5 text-body-sm font-body-sm text-primary hover:bg-primary-container/20 hover:text-primary transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2 font-medium"
                              >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                <span>Nuevo Producto</span>
                              </button>
                            </li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-body-md font-body-md text-on-surface-variant font-medium mb-1">Dosis (por ha)</label>
                      <div className="relative">
                        <input 
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg font-data-mono text-title-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-6 pr-14 text-right outline-none" 
                          type="number" 
                          value={dosis}
                          onChange={(e) => setDosis(e.target.value)}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">L</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-body-md font-body-md text-on-surface-variant font-medium mb-1">Costo Unitario</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">$</span>
                        <input 
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg font-data-mono text-title-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-6 pl-10 text-right outline-none" 
                          type="number" 
                          step="0.01"
                          value={costoUnitario}
                          onChange={(e) => setCostoUnitario(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-6 border border-outline-variant/20 mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-body-md font-body-md text-on-surface-variant">Área Total</span>
                      <span className="font-data-mono text-data-mono text-[16px] text-on-surface font-semibold">{totalAreaHa.toFixed(2)} ha</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-body-md font-body-md text-on-surface-variant">Volumen Total Req.</span>
                      <span className="font-data-mono text-data-mono text-[16px] text-on-surface font-semibold">{volumenTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })} L</span>
                    </div>
                    <div className="w-full h-[1px] bg-outline-variant/30 my-6"></div>
                    <div className="flex justify-between items-end">
                      <span className="text-title-sm font-title-sm text-on-surface font-semibold">Costo Estimado</span>
                      <span className="font-data-mono text-[32px] leading-tight font-bold text-primary">${costoTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>



              {/* Notas del Tratamiento */}
              <div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-6">
                <div>
                  <label className="block text-body-md font-body-md text-on-surface-variant font-medium mb-2">Notas del Tratamiento</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary p-4 min-h-[120px] resize-y outline-none" 
                    placeholder="Agrega instrucciones de aplicación específicas o notas aquí..."
                  ></textarea>
                </div>
                <div className="flex gap-4 justify-end pt-6 border-t border-outline-variant/20">
                  <button 
                    onClick={handleSaveDraft}
                    className="px-6 py-3 bg-surface text-on-surface border border-outline-variant hover:bg-surface-container-high hover:border-outline rounded-lg text-title-sm font-title-sm font-semibold transition-all h-14 cursor-pointer"
                  >
                    Guardar Borrador
                  </button>
                  <button 
                    disabled={isExecuting}
                    onClick={handleExecuteTreatment}
                    className="px-6 py-3 bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-title-sm font-title-sm font-semibold shadow-[0_4px_10px_rgba(21,66,18,0.2)] transition-all flex items-center justify-center gap-2 h-14 cursor-pointer border-none"
                  >
                    {isExecuting ? (
                      <>
                        <Spinner size={20} className="text-on-primary animate-spin" />
                        <span>Ejecutando...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                        <span>Ejecutar Tratamiento</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>

      {/* Cargando Fincas Modal */}
      {isLoadingFarms && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md pointer-events-auto">
          <div className="bg-surface border border-outline-variant p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full text-center">
            <Spinner size={40} className="text-primary animate-spin" />
            <p className="font-title-md text-title-md text-on-surface">Cargando fincas...</p>
          </div>
        </div>
      )}

      {/* Toast de Notificaciones */}
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      {/* Modal Nueva Temporada */}
      {isSeasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-title-lg font-title-lg text-on-surface mb-2">Nueva Temporada Requerida</h2>
            <p className="text-body-md font-body-md text-on-surface-variant mb-6">
              Para los siguientes lotes no se encontró una temporada vigente (o ya fue cerrada).
              Por favor, indica la fecha de inicio para abrir una nueva temporada en ellos.
            </p>
            
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">NOMBRE DE LA TEMPORADA</label>
                <input 
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  placeholder="Ej. Temporada 2026"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-4 outline-none"
                />
              </div>
              <div>
                <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">FECHA DE INICIO</label>
                <input 
                  type="date"
                  value={newSeasonStartDate}
                  onChange={(e) => setNewSeasonStartDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-4 outline-none"
                />
              </div>
            </div>

            {activeSeasonsForModal.length > 0 && (
              <>
                <div className="flex items-center gap-4 my-6">
                  <div className="h-px bg-outline-variant flex-1"></div>
                  <span className="text-label-caps font-label-caps text-on-surface-variant">o añadir a una temporada ya existente</span>
                  <div className="h-px bg-outline-variant flex-1"></div>
                </div>

                <div className="mb-6">
                  <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">SELECCIONAR TEMPORADA EXISTENTE</label>
                  <select 
                    value={selectedExistingSeasonId}
                    onChange={(e) => {
                      setSelectedExistingSeasonId(e.target.value);
                      if (e.target.value) {
                        setNewSeasonName("");
                      }
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-4 outline-none appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2349454f%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="">-- Elige una temporada --</option>
                    {activeSeasonsForModal.map(season => (
                      <option key={season.id} value={season.id}>{season.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsSeasonModalOpen(false);
                  setIsExecuting(false);
                }}
                disabled={isExecuting}
                className="px-6 py-2.5 rounded-full text-label-lg font-label-lg font-semibold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmNewSeason}
                disabled={isExecuting || (!selectedExistingSeasonId && !newSeasonStartDate)}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-full text-label-lg font-label-lg font-semibold hover:bg-primary-container transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2 border-none cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <Spinner size={16} className="animate-spin text-on-primary" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <span>{selectedExistingSeasonId ? 'Añadir y Continuar' : 'Crear y Continuar'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Nuevo Producto */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-surface border border-outline-variant rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-title-lg font-title-lg text-on-surface mb-6">Nuevo Producto</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">NOMBRE DEL PRODUCTO</label>
                <input 
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-4 outline-none"
                  placeholder="Ej. Nitrógeno Plus 28%"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">PRECIO POR UNIDAD</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 pl-8 pr-4 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-label-caps font-label-caps text-on-surface-variant mb-2">DOSIS POR Ha</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={newProductDose}
                      onChange={(e) => setNewProductDose(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 pl-4 pr-8 outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">/ha</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsNewProductModalOpen(false);
                  setNewProductName("");
                  setNewProductPrice("");
                  setNewProductDose("");
                }}
                disabled={isExecuting}
                className="px-6 py-2.5 rounded-full text-label-lg font-label-lg font-semibold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={isExecuting || !newProductName.trim()}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-full text-label-lg font-label-lg font-semibold hover:bg-primary-container transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                {isExecuting ? (
                  <>
                    <Spinner size={16} className="animate-spin text-on-primary" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Producto</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Planeacion() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-surface">Cargando...</div>}>
      <PlaneacionContent />
    </Suspense>
  );
}
