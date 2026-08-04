"use client";

import Link from 'next/link';

interface SidebarProps {
  activePage: 'panel' | 'planeacion' | 'temporadas' | 'usuarios' | 'equipamiento';
  selectedFarmId?: string | null;
  selectedFieldIds?: string[];
}

export default function Sidebar({ activePage, selectedFarmId, selectedFieldIds = [] }: SidebarProps) {
  const query = {
    ...(selectedFarmId ? { farmId: selectedFarmId } : {}),
    ...(selectedFieldIds.length > 0 ? { fieldIds: selectedFieldIds.join(',') } : {}),
  };

  const getLinkClass = (page: string) => {
    if (activePage === page) {
      return "flex items-center gap-3 px-3 py-3 rounded text-primary font-bold border-r-4 border-primary bg-primary-container/10 cursor-pointer select-none text-decoration-none";
    }
    return "flex items-center gap-3 px-3 py-3 rounded text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none text-decoration-none";
  };

  return (
    <nav className="hidden md:flex flex-col h-full border-r border-outline-variant dark:border-outline bg-surface-container dark:bg-surface-container-low w-64 flex-shrink-0 z-20 relative">
      <div className="p-6 border-b border-outline-variant flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-container/40 border border-primary/30 flex items-center justify-center flex-shrink-0 text-primary">
          <span className="material-symbols-outlined text-[24px]">agriculture</span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary dark:text-primary-fixed-dim m-0 leading-tight">AgroManage</h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant opacity-80">Datos de Precisión</p>
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto py-3 list-none m-0">
        <li className="px-3 py-1">
          <Link
            href={{ pathname: '/panel', query }}
            className={getLinkClass('panel')}
          >
            <span className="material-symbols-outlined text-[24px]" data-icon="map">map</span>
            <span className="font-label-caps text-label-caps text-[14px]">Vista de Mapa</span>
          </Link>
        </li>

        <li className="px-3 py-1">
          <Link
            href={{ pathname: '/planeacion', query }}
            className={getLinkClass('planeacion')}
          >
            <span className="material-symbols-outlined text-[24px]" data-icon="agriculture">agriculture</span>
            <span className="font-label-caps text-label-caps text-[14px]">Planificación</span>
          </Link>
        </li>

        <li className="px-3 py-1">
          <Link
            href={{ pathname: '/temporadas', query }}
            className={getLinkClass('temporadas')}
          >
            <span className="material-symbols-outlined text-[24px]" data-icon="settings_applications">settings_applications</span>
            <span className="font-label-caps text-label-caps text-[14px]">Temporadas</span>
          </Link>
        </li>

        <li className="px-3 py-1">
          <Link
            href={{ pathname: '/usuarios', query }}
            className={getLinkClass('usuarios')}
          >
            <span className="material-symbols-outlined text-[24px]" data-icon="group">group</span>
            <span className="font-label-caps text-label-caps text-[14px]">Usuarios</span>
          </Link>
        </li>

        <li className="px-3 py-1">
          <Link
            href={{ pathname: '/equipamiento', query }}
            className={getLinkClass('equipamiento')}
          >
            <span className="material-symbols-outlined text-[24px]" data-icon="build">build</span>
            <span className="font-label-caps text-label-caps text-[14px]">Equipamiento</span>
          </Link>
        </li>
      </ul>

    </nav>
  );
}
