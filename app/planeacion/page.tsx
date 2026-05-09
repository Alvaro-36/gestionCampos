import Image from 'next/image';
import Link from 'next/link';

export default function Planeacion() {
  return (
    <div className="flex flex-row h-screen w-full overflow-hidden">
<nav className="hidden md:flex flex-col h-full w-64 border-r border-outline-variant dark:border-outline bg-surface-container dark:bg-surface-container-low shrink-0 z-20 shadow-[0_0_15px_rgba(0,0,0,0.05)]">
<div className="p-6 border-b border-outline-variant/30 flex items-center gap-3">
<div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-on-primary text-[24px]" data-icon="agriculture" data-weight="fill" style={{fontVariationSettings: '\'FILL\' 1'}}>agriculture</span>
</div>
<div>
<h1 className="text-headline-md font-headline-md text-primary dark:text-primary-fixed-dim leading-none">AgroManage</h1>
<p className="text-label-caps font-label-caps text-on-surface-variant mt-1">Datos de Precisión</p>
</div>
</div>
<div className="flex-1 overflow-y-auto py-3">
<ul className="flex flex-col gap-1 px-3">
<li>
<a className="flex items-center gap-6 px-3 py-3 rounded-lg text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
<span className="material-symbols-outlined text-[20px]" data-icon="map">map</span>
<span className="font-body-sm text-body-sm">Tablero</span>
</a>
</li>
<li>
<a className="flex items-center gap-6 px-3 py-3 rounded-lg text-primary font-bold border-r-4 border-primary bg-primary-container/10 cursor-pointer select-none" href="#">
<span className="material-symbols-outlined text-[20px]" data-icon="agriculture" data-weight="fill" style={{fontVariationSettings: '\'FILL\' 1'}}>agriculture</span>
<span className="font-body-sm text-body-sm">Planeación</span>
</a>
</li>
<li>
<a className="flex items-center gap-6 px-3 py-3 rounded-lg text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
<span className="material-symbols-outlined text-[20px]" data-icon="compare_arrows">compare_arrows</span>
<span className="font-body-sm text-body-sm">Análisis</span>
</a>
</li>
<li>
<a className="flex items-center gap-6 px-3 py-3 rounded-lg text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
<span className="material-symbols-outlined text-[20px]" data-icon="history_edu">history_edu</span>
<span className="font-body-sm text-body-sm">Registro de Actividades</span>
</a>
</li>
<li>
<a className="flex items-center gap-6 px-3 py-3 rounded-lg text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
<span className="material-symbols-outlined text-[20px]" data-icon="bar_chart">bar_chart</span>
<span className="font-body-sm text-body-sm">Reportes</span>
</a>
</li>
<li>
<a className="flex items-center gap-6 px-3 py-3 rounded-lg text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
<span className="material-symbols-outlined text-[20px]" data-icon="settings_applications">settings_applications</span>
<span className="font-body-sm text-body-sm">Configuración de Temporada</span>
</a>
</li>
</ul>
</div>
<div className="p-3 border-t border-outline-variant/30 mt-auto">
<a className="flex items-center gap-6 px-3 py-3 rounded-lg text-on-surface-variant dark:text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 cursor-pointer select-none" href="#">
<span className="material-symbols-outlined text-[20px]" data-icon="contact_support">contact_support</span>
<span className="font-body-sm text-body-sm">Soporte</span>
</a>
</div>
</nav>

<main className="flex-1 flex flex-col h-screen overflow-hidden relative">

<header className="flex justify-between items-center px-6 h-16 w-full border-b border-outline-variant/30 bg-surface z-10 shrink-0">
<div className="flex items-center gap-6">
<button className="md:hidden text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container-high transition-colors">
<span className="material-symbols-outlined" data-icon="menu">menu</span>
</button>
<h2 className="text-title-sm font-title-sm font-bold text-on-surface md:hidden">Planeación</h2>
<div className="hidden md:block">
<h2 className="text-title-sm font-title-sm font-bold text-on-surface">Planeación de Tratamientos y Costos</h2>
</div>
</div>
<div className="flex items-center gap-3">
<div className="hidden md:flex items-center bg-surface-container-high rounded-full px-3 py-1 border border-outline-variant/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
<span className="material-symbols-outlined text-on-surface-variant text-[20px]" data-icon="search">search</span>
<input className="bg-transparent border-none focus:ring-0 text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant/70 w-64 h-8" placeholder="Buscar campos, productos..." type="text"/>
</div>
<button className="text-on-surface-variant hover:text-primary p-3 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer active:opacity-80">
<span className="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<button className="text-on-surface-variant hover:text-primary p-3 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer active:opacity-80">
<span className="material-symbols-outlined" data-icon="settings">settings</span>
</button>
<div className="w-8 h-8 rounded-full overflow-hidden ml-1 border border-outline-variant/50 cursor-pointer">
<img alt="User profile avatar" className="w-full h-full object-cover" data-alt="A close-up, professional headshot of a middle-aged male farm manager in agricultural workwear. The lighting is bright and natural, reflecting an outdoor environment. The mood is confident and reliable, matching the corporate modern agricultural brand. Colors are natural with subtle green and slate tones." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_PmK8L8hoVYu535PA0p0gOlT3CEs18zRFH_v4PWAyyTT_R5KK1lxCIVDzc-DkcdEWWfMvj2a4kuPLsl-DCKCCDcfusR-OMEEzDBxQxiMUqTq-IKy4qNJTC08-JuCZ7QdQPQItvsvXAdLMIFUWtq4qDn9uH61OJG6xOz_RReMVr88onz2ncDctV3ISc2O4Kcji4Qb8wMon_PF5tLrZQQGOidL6ft_ONHoL_7Nfod2LVXsTQ8yzG4FwqS3HDjfEtabqcrk83flVPl8"/>
</div>
</div>
</header>

<div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest">
<div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

<div className="lg:col-span-7 flex flex-col gap-6">

<div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-3">
<div className="flex items-center justify-between">
<h3 className="text-title-sm font-title-sm text-on-surface flex items-center gap-1">
<span className="material-symbols-outlined text-primary text-[20px]" data-icon="filter_list">filter_list</span>
                                Selección de Campo
                            </h3>
<span className="text-label-caps font-label-caps text-on-surface-variant bg-surface-container-high px-2 py-1 rounded">240 ha SELECCIONADAS</span>
</div>
<div className="flex flex-wrap gap-6 items-center mt-2">
<div className="flex-1 min-w-[150px]">
<label className="block text-label-caps font-label-caps text-on-surface-variant mb-1">TIPO DE CULTIVO</label>
<select className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-6">
<option>Maíz</option>
<option>Soya</option>
<option>Trigo</option>
</select>
</div><div className="flex-1 min-w-[150px]">
<label className="block text-label-caps font-label-caps text-on-surface-variant mb-1">SUBTIPO</label>
<select className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-6">
<option>Variedad A</option>
<option>Variedad B</option>
</select>
</div>
<div className="flex-1 min-w-[150px]">
<label className="block text-label-caps font-label-caps text-on-surface-variant mb-1">TEMPORADA</label>
<select className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-6">
<option>Primavera 2024</option>
<option>Invierno 2023</option>
</select>
</div>
<div className="flex items-end gap-3 h-[76px]">
<button className="h-14 px-6 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/50 rounded-lg text-body-md font-body-md font-medium transition-colors flex items-center gap-3">
<span className="material-symbols-outlined text-[20px]" data-icon="select_all">select_all</span>
                                    Seleccionar Todo
                                </button>
<button className="h-14 px-6 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/50 rounded-lg text-body-md font-body-md font-medium transition-colors flex items-center gap-3">
<span className="material-symbols-outlined text-[20px]" data-icon="clear_all">clear_all</span>
                                    Limpiar
                                </button>
</div>
</div>
</div>

<div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden relative min-h-[400px] flex-1 flex flex-col">
<div className="absolute top-sm right-sm z-10 flex flex-col gap-3">
<button className="w-12 h-12 bg-surface rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center text-on-surface hover:text-[#0ea5e9] transition-colors border border-outline-variant/20">
<span className="material-symbols-outlined text-[24px]" data-icon="layers">layers</span>
</button>
<button className="w-12 h-12 bg-surface rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex items-center justify-center text-on-surface hover:text-[#0ea5e9] transition-colors border border-outline-variant/20">
<span className="material-symbols-outlined text-[24px]" data-icon="my_location">my_location</span>
</button>
<div className="w-12 h-[96px] bg-surface rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.1)] flex flex-col items-center justify-between py-1 border border-outline-variant/20 mt-2">
<button className="flex-1 flex items-center justify-center text-on-surface hover:text-[#0ea5e9] w-full"><span className="material-symbols-outlined text-[24px]" data-icon="add">add</span></button>
<div className="w-8 h-[1px] bg-outline-variant/30"></div>
<button className="flex-1 flex items-center justify-center text-on-surface hover:text-[#0ea5e9] w-full"><span className="material-symbols-outlined text-[24px]" data-icon="remove">remove</span></button>
</div>
</div>
<div className="absolute bottom-sm left-sm z-10 bg-surface/90 backdrop-blur-sm px-6 py-3 rounded-lg border border-outline-variant/30 shadow-sm pointer-events-none">
<p className="text-body-md font-body-md text-on-surface flex items-center gap-1">
<span className="material-symbols-outlined text-[#0ea5e9] text-[20px]" data-icon="touch_app">touch_app</span>
                                Haz clic en las parcelas del mapa para seleccionar tratamiento
                            </p>
</div>

<div className="w-full h-full bg-[#e5e5f7] relative" style={{opacity: '0.8', backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px'}}>

<svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
<polygon fill="rgba(45, 90, 39, 0.2)" points="12,12 38,15 42,42 15,38" stroke="#e9c349" strokeWidth="0.5"></polygon>
<polygon fill="rgba(45, 90, 39, 0.2)" points="48,18 88,12 92,58 52,65" stroke="#e9c349" strokeWidth="0.5"></polygon>
<polygon fill="transparent" points="22,62 48,58 45,92 18,88" stroke="#cbd5e1" strokeDasharray="1,1" strokeWidth="0.5"></polygon>
</svg>
</div>
</div>
</div>

<div className="lg:col-span-5 flex flex-col gap-6">

<div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 flex flex-col">
<h3 className="text-title-sm font-title-sm text-on-surface border-b border-outline-variant/30 pb-3 mb-6 flex items-center gap-1">
<span className="material-symbols-outlined text-primary text-[20px]" data-icon="calculate">calculate</span>
                            Calculadora de Tratamientos
                        </h3>
<div className="space-y-md">
<div>
<label className="block text-body-md font-body-md text-on-surface-variant font-medium mb-1">Formulación del Producto</label>
<select className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-6">
<option>Nitrógeno Plus 28% (Líquido)</option>
<option>Fósforo Max (Granulado)</option>
<option>Mezcla Personalizada A</option>
</select>
</div>
<div className="grid grid-cols-2 gap-6">
<div>
<label className="block text-body-md font-body-md text-on-surface-variant font-medium mb-1">Dosis (por ha)</label>
<div className="relative">
<input className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg font-data-mono text-title-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-6 pr-14 text-right" type="number" value="45"/>
<span className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">L</span>
</div>
</div>
<div>
<label className="block text-body-md font-body-md text-on-surface-variant font-medium mb-1">Costo Unitario</label>
<div className="relative">
<span className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md text-body-md">$</span>
<input className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg font-data-mono text-title-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary h-14 px-6 pl-10 text-right" type="number" value="1.85"/>
</div>
</div>
</div>
<div className="bg-surface-container-low rounded-lg p-6 border border-outline-variant/20 mt-6">
<div className="flex justify-between items-center mb-3">
<span className="text-body-md font-body-md text-on-surface-variant">Área Total</span>
<span className="font-data-mono text-data-mono text-[16px] text-on-surface font-semibold">240.0 ha</span>
</div>
<div className="flex justify-between items-center mb-3">
<span className="text-body-md font-body-md text-on-surface-variant">Volúmen Total Req.</span>
<span className="font-data-mono text-data-mono text-[16px] text-on-surface font-semibold">10,800 L</span>
</div>
<div className="w-full h-[1px] bg-outline-variant/30 my-6"></div>
<div className="flex justify-between items-end">
<span className="text-title-sm font-title-sm text-on-surface font-semibold">Costo Estimado</span>
<span className="font-data-mono text-[32px] leading-tight font-bold text-primary">$19,980.00</span>
</div>
</div>
</div>
</div>

<div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6">
<h3 className="text-title-sm font-title-sm text-on-surface mb-3 flex items-center gap-1">
<span className="material-symbols-outlined text-on-surface-variant text-[20px]" data-icon="monitoring">monitoring</span>
                            Comparación Histórica
                        </h3>
<div className="overflow-x-auto border border-outline-variant/20 rounded-lg">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-low border-b border-outline-variant/30">
<th className="px-3 py-1 text-label-caps font-label-caps text-on-surface-variant font-semibold">TEMPORADA</th>
<th className="px-3 py-1 text-label-caps font-label-caps text-on-surface-variant font-semibold text-right">COSTO/HA</th>
<th className="px-3 py-1 text-label-caps font-label-caps text-on-surface-variant font-semibold text-right">VARIACIÓN</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-outline-variant/10 hover:bg-surface-container-lowest/50 transition-colors">
<td className="px-3 py-6 text-body-md font-body-md text-on-surface">Actual (Planeado)</td>
<td className="px-3 py-6 font-data-mono text-body-md text-on-surface text-right">$83.25</td>
<td className="px-3 py-6 font-data-mono text-body-md text-on-surface text-right">-</td>
</tr>
<tr className="border-b border-outline-variant/10 bg-surface-container-lowest/30 hover:bg-surface-container-lowest/50 transition-colors">
<td className="px-3 py-6 text-body-md font-body-md text-on-surface">Primavera 2023</td>
<td className="px-3 py-6 font-data-mono text-body-md text-on-surface text-right">$78.50</td>
<td className="px-3 py-6 font-data-mono text-body-md text-error text-right flex items-center justify-end gap-1">
<span className="material-symbols-outlined text-[16px]" data-icon="trending_up">trending_up</span> +6.0%
                                        </td>
</tr>
<tr className="hover:bg-surface-container-lowest/50 transition-colors">
<td className="px-3 py-6 text-body-md font-body-md text-on-surface">Primavera 2022</td>
<td className="px-3 py-6 font-data-mono text-body-md text-on-surface text-right">$85.10</td>
<td className="px-3 py-6 font-data-mono text-body-md text-primary text-right flex items-center justify-end gap-1">
<span className="material-symbols-outlined text-[16px]" data-icon="trending_down">trending_down</span> -2.1%
                                        </td>
</tr>
</tbody>
</table>
</div>
</div>

<div className="bg-surface rounded-xl border border-outline-variant/30 shadow-[0_2px_8px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-6">
<div>
<label className="block text-body-md font-body-md text-on-surface-variant font-medium mb-2">Notas del Tratamiento</label>
<textarea className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary p-6 min-h-[120px] resize-y" placeholder="Agrega instrucciones de aplicación específicas o notas aquí..."></textarea>
</div>
<div className="flex gap-6 justify-end pt-6 border-t border-outline-variant/20">
<button className="px-16 py-3 bg-surface text-on-surface border border-outline-variant hover:bg-surface-container-high hover:border-outline rounded-lg text-title-sm font-title-sm font-semibold transition-all h-14">
                                Guardar Borrador
                            </button>
<button className="px-16 py-3 bg-primary text-on-primary hover:bg-primary-container rounded-lg text-title-sm font-title-sm font-semibold shadow-[0_4px_10px_rgba(21,66,18,0.2)] transition-all flex items-center gap-1 h-14">
<span className="material-symbols-outlined text-[24px]" data-icon="play_arrow" data-weight="fill" style={{fontVariationSettings: '\'FILL\' 1'}}>play_arrow</span>
                                Ejecutar Tratamiento
                            </button>
</div>
</div>
</div>
</div>
</div>
</main>

    </div>
  );
}
