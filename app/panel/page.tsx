import Image from 'next/image';
import Link from 'next/link';

export default function Panel() {
  return (
    <div className="flex flex-row h-screen w-full overflow-hidden">
<nav className="hidden md:flex flex-col h-full border-r border-outline-variant dark:border-outline bg-surface-container dark:bg-surface-container-low w-64 flex-shrink-0 z-20 relative">
<div className="p-6 border-b border-outline-variant flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden flex-shrink-0">
<img alt="Farm Logo" className="w-full h-full object-cover" data-alt="A stylized, modern geometric logo of a farm or leaf in deep forest green and gold tones, conveying precision agriculture and professional reliability. The design should be clean, corporate, and suitable for a high-end software application." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoKYLRRayAgBpltqTiXAEzY68RgrnVYVdXyYqwEZLk8OmKvfAqYT7bVOpMxXuZrGaktp5Wrf0dA68u4qlIj1iRqIWrjTLjKuNOjxCfCSmQ32O3pMe5tQ8GHMyXjAU_iA4fLnsy2L-VokV-C2P-94qJd6F8wks_N2F4E_UFhkdZoq2zwZfvF-y8ViBLMHaq7cx1RmIB4LMQtAUHQX7ZC-sunIZQlj216n4O2yQvO6CYVVXFWyoRuEvrRnKLTw5j-WBTLT3SJO6TWbI" />
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

<header className="bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline flex justify-between items-center px-6 h-20 w-full flex-shrink-0 z-20 relative">
<div className="flex items-center gap-6">

<button className="md:hidden text-on-surface-variant hover:bg-surface-container-high transition-colors p-3 rounded cursor-pointer active:opacity-80">
<span className="material-symbols-outlined text-[28px]">menu</span>
</button>
<div className="md:hidden font-title-sm text-title-sm font-bold text-primary dark:text-primary-fixed-dim">AgroManage</div>

<div className="relative hidden sm:block">
<button className="flex items-center gap-3 bg-surface-container-low border border-outline-variant px-6 py-3 rounded-lg hover:bg-surface-container-high transition-colors text-body-md font-body-md text-on-surface">
<span className="material-symbols-outlined text-[24px]">location_on</span>
<span className="">Finca Valle Hermoso</span>
<span className="material-symbols-outlined text-[24px]">arrow_drop_down</span>
</button>
</div>
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
<div className="w-12 h-12 rounded-full ml-3 overflow-hidden border-2 border-outline-variant cursor-pointer">
<img alt="User profile avatar" className="w-full h-full object-cover" data-alt="A professional headshot of a person, suitable for a corporate or agricultural management software profile avatar. The lighting should be natural and professional." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC79QaJt9UYNqzVKsvgTtdDW9ljNmbdZO6eL4pquZ3S4PCtOL4WaYrk_x45hYtzCNUenNVSueyO33T9JBg-edKaK0NWcU3vSFJSKZTaQ7ghMqAW2mHUis2s7b1sGScTt9ENoaon2L9rtajDwtbknztKTZAJ4Ku2nM7NcYc6OeG8m5icWfc3WwKIrtG3LOcf8G-hhPuTmf3BYRZEF4RJG5LpZ4rc7Qkrua-jAnYvS7YmqXKNcVTvFy5tx6sJ9Gofj1KeedjI84405Sc" />
</div>
</div>
</header>

<main className="flex-1 relative w-full h-full bg-surface-container-lowest overflow-hidden flex">

<div className="absolute inset-0 z-0 bg-slate-200">
<img alt="Satellite Farm Map" className="w-full h-full object-cover opacity-90" data-alt="A high-resolution, top-down satellite view of a large agricultural farm showing delimited plots. The imagery should be crisp and professional, using natural greens and earth tones, typical of precision agriculture mapping software." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCykAVSbVnwgJnnI32QTI7wAGaUEUH2hcgtYUXjbtYF0E30OdtgNTMy1B3qx_qJr_f9F2LsL7DutrKOrlYYpsURLFJZEOj5CBC89p5r5BzwoI-KYbeBVAIru8DI8W4B2tBR7wasPD1rR9OKIW6PXzcDVGLJ0kAkBS2d3RQvejCZBsEDHJAu_Atm9Gz0KOrhubbve7nVSClc_HU4adff3N7jbriUIgeKYOfRIOi0mqeXTvVagbjl6T9AQwJ94nz9MSymH-tJdxaaPPc" />

<svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 800">

<polygon fill="rgba(255,255,255,0.1)" points="40,120 400,150 380,380 20,350" stroke="rgba(255,255,255,0.4)" strokeWidth="2"></polygon>

<polygon fill="rgba(115, 92, 0, 0.2)" points="410,165 720,185 710,545 390,520" stroke="#ffe088" strokeWidth="3"></polygon>

<polygon fill="rgba(255,255,255,0.1)" points="200,535 500,555 480,780 180,750" stroke="rgba(255,255,255,0.4)" strokeWidth="2"></polygon>
</svg>

<div className="absolute bottom-lg right-lg z-20 flex flex-col gap-3 pointer-events-auto">
<button className="w-14 h-14 bg-surface text-primary rounded-full shadow-md flex items-center justify-center hover:bg-surface-container-high transition-colors">
<span className="material-symbols-outlined text-[28px]">add</span>
</button>
<button className="w-14 h-14 bg-surface text-primary rounded-full shadow-md flex items-center justify-center hover:bg-surface-container-high transition-colors">
<span className="material-symbols-outlined text-[28px]">remove</span>
</button>
<button className="w-14 h-14 bg-surface text-primary rounded-full shadow-md flex items-center justify-center hover:bg-surface-container-high transition-colors mt-6">
<span className="material-symbols-outlined text-[28px]">my_location</span>
</button>
<button className="w-14 h-14 bg-surface text-primary rounded-full shadow-md flex items-center justify-center hover:bg-surface-container-high transition-colors mt-3">
<span className="material-symbols-outlined text-[28px]">layers</span>
</button>
</div>
</div>

<div className="relative z-20 p-6 flex flex-col gap-6 h-full w-full max-w-sm pointer-events-none">

<div className="bg-surface/90 backdrop-blur-md border border-outline-variant shadow-md rounded-xl p-10 pointer-events-auto flex flex-col gap-6">
<div className="flex justify-between items-start">
<div>
<h2 className="font-headline-md text-headline-md text-on-surface m-0">Lote Norte</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Monitoreo Activo</p>
</div>
<span className="bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-3 py-1.5 rounded-md text-[14px]">Seleccionado</span>
</div>
<div className="grid grid-cols-2 gap-6">
<div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg">
<p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Tipo de Cultivo</p>
<p className="font-title-sm text-title-sm font-semibold text-primary">Soja</p>
</div><div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg">
<p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Subtipo</p>
<p className="font-title-sm text-title-sm font-semibold text-primary">A</p>
</div>
<div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-lg">
<p className="font-label-caps text-label-caps text-on-surface-variant mb-2">Tamaño</p>
<p className="font-data-mono text-data-mono text-primary text-[16px]">45.2 ha</p>
</div>
</div>
<div className="mt-6">
<button className="w-full bg-primary text-on-primary font-title-sm text-title-sm py-6 rounded-lg hover:bg-surface-tint transition-colors shadow-sm">
                            Ver Informe Completo
                        </button>
</div>
</div>
</div>
</main>
</div>

    </div>
  );
}
