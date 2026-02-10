'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import type { Producto, ParametrosCliente, ResultadosIPROAS } from '@/types/roas';
import { SENSITIVITY_CONFIGS } from '@/types/roas';
import {
  calcularTodo,
  margenAbsoluto,
  costosTotales,
  productoMargenMinimo,
  parseCSV,
  calcularSensibilidad,
} from '@/lib/roas-engine';
import SensitivityChart from './SensitivityChart';

function formatCurrency(n: number): string {
  if (!isFinite(n)) return '$--';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(n: number, decimals = 4): string {
  if (!isFinite(n)) return '--';
  return n.toFixed(decimals);
}

export default function Calculator() {
  // ---------- STATE (equivalent to st.session_state) ----------
  const [ip, setIp] = useState(0);
  const [tf, setTf] = useState(0);
  const [ie, setIe] = useState(0);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [activeTab, setActiveTab] = useState<'resumen' | 'IP' | 'TF' | 'IE' | 'Margen'>('resumen');

  // Add product form
  const [prodNombre, setProdNombre] = useState('');
  const [prodPrecio, setProdPrecio] = useState('');
  const [prodMargen, setProdMargen] = useState('');

  // CSV upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- DERIVED CALCULATIONS ----------
  const params: ParametrosCliente = useMemo(
    () => ({
      inversionPublicitaria: ip,
      tarifaFija: tf,
      ingresoEsperado: ie,
      productos,
    }),
    [ip, tf, ie, productos]
  );

  const resultados: ResultadosIPROAS = useMemo(() => calcularTodo(params), [params]);

  const productoCritico = useMemo(() => productoMargenMinimo(productos), [productos]);

  // ---------- HANDLERS ----------
  const handleAddProduct = useCallback(() => {
    const precio = parseFloat(prodPrecio);
    const margen = parseFloat(prodMargen);
    if (!prodNombre.trim() || isNaN(precio) || precio <= 0 || isNaN(margen) || margen <= 0 || margen > 100) {
      return;
    }
    setProductos((prev) => [...prev, { nombre: prodNombre.trim(), precio, margenBruto: margen / 100 }]);
    setProdNombre('');
    setProdPrecio('');
    setProdMargen('');
  }, [prodNombre, prodPrecio, prodMargen]);

  const handleRemoveProduct = useCallback((index: number) => {
    setProductos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setProductos(parsed);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ---------- TABS ----------
  const tabs = [
    { key: 'resumen' as const, label: 'Resumen' },
    ...SENSITIVITY_CONFIGS.map((c) => ({ key: c.type as typeof activeTab, label: `Sens. ${c.type}` })),
  ];

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-[#1a1a3e] to-[#2a2a5e] p-6 rounded-xl mb-6 mx-4 mt-4">
        <h1 className="text-2xl font-bold text-[#a78bfa]">Calculadora IP-ROAS</h1>
        <p className="text-sm text-slate-400">SaleADS.ai — Metodolog&iacute;a IP-ROAS v1.3</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 px-4 pb-8">
        {/* SIDEBAR */}
        <aside className="lg:w-80 flex-shrink-0 space-y-6">
          {/* Parameters */}
          <div className="bg-[#1a1a2e] rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">Parametros de Entrada</h2>

            <div>
              <label className="block text-sm text-[#a78bfa] font-medium mb-1">Inversi&oacute;n Publicitaria (IP)</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={ip || ''}
                onChange={(e) => setIp(Math.max(0, Number(e.target.value)))}
                placeholder="Presupuesto negociado"
                className="w-full bg-[#0f0f23] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#a78bfa] transition"
              />
            </div>

            <div>
              <label className="block text-sm text-[#a78bfa] font-medium mb-1">Tarifa Fija (TF)</label>
              <input
                type="number"
                min={0}
                step={500}
                value={tf || ''}
                onChange={(e) => setTf(Math.max(0, Number(e.target.value)))}
                placeholder="Fee de agencia"
                className="w-full bg-[#0f0f23] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#a78bfa] transition"
              />
            </div>

            <div>
              <label className="block text-sm text-[#a78bfa] font-medium mb-1">Ingreso Esperado (IE)</label>
              <input
                type="number"
                min={0}
                step={500}
                value={ie || ''}
                onChange={(e) => setIe(Math.max(0, Number(e.target.value)))}
                placeholder="Utilidad objetivo"
                className="w-full bg-[#0f0f23] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#a78bfa] transition"
              />
            </div>
          </div>

          {/* CSV Upload */}
          <div className="bg-[#1a1a2e] rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">Cargar Productos (CSV)</h2>
            <p className="text-xs text-slate-500">Formato: nombre,precio,margen</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#a78bfa] file:text-white file:font-medium file:cursor-pointer hover:file:bg-[#8b5cf6] transition"
            />
          </div>

          {/* Add Product */}
          <div className="bg-[#1a1a2e] rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-semibold text-slate-200">Agregar Producto</h2>

            <input
              type="text"
              value={prodNombre}
              onChange={(e) => setProdNombre(e.target.value)}
              placeholder="Nombre del producto"
              className="w-full bg-[#0f0f23] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#a78bfa] transition"
            />
            <input
              type="number"
              min={0}
              step={100}
              value={prodPrecio}
              onChange={(e) => setProdPrecio(e.target.value)}
              placeholder="Precio ($)"
              className="w-full bg-[#0f0f23] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#a78bfa] transition"
            />
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={prodMargen}
              onChange={(e) => setProdMargen(e.target.value)}
              placeholder="Margen bruto (%)"
              className="w-full bg-[#0f0f23] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#a78bfa] transition"
            />

            <button
              onClick={handleAddProduct}
              className="w-full bg-[#a78bfa] hover:bg-[#8b5cf6] text-white font-medium py-2 rounded-lg transition"
            >
              Agregar
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard color="purple" value={formatNumber(resultados.ipRoas)} label="IP-ROAS" description="&iquest;Cu&aacute;nto debe generar cada peso invertido?" />
            <MetricCard color="green" value={`${resultados.vum.toLocaleString()} unidades`} label="VUM" description="&iquest;Cu&aacute;ntas unidades debo vender?" />
            <MetricCard color="orange" value={formatNumber(resultados.roasMinTradicional)} label="ROAS Tradicional" description="&iquest;Retorno m&iacute;nimo en ventas totales?" />
            <MetricCard color="cyan" value={formatCurrency(resultados.cprEstimado)} label="CPR Estimado" description="&iquest;Cu&aacute;nto me cuesta cada venta?" />
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-700 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[#1a1a2e] text-[#a78bfa] border-b-2 border-[#a78bfa]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-[#1a1a2e] rounded-xl p-6">
            {activeTab === 'resumen' ? (
              <SummaryTab
                productos={productos}
                productoCritico={productoCritico}
                costos={costosTotales(params)}
                onRemove={handleRemoveProduct}
                onClear={() => setProductos([])}
              />
            ) : (
              <SensitivityTab type={activeTab} params={params} />
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="text-center text-slate-600 text-xs py-4 border-t border-slate-800">
        Calculadora IP-ROAS v1.3 | SaleADS.ai — Metodolog&iacute;a IP-ROAS
        <br />
        Desarrollado por Juan Pablo Fern&aacute;ndez Guti&eacute;rrez | &Aacute;rea de Tecnolog&iacute;a
      </footer>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const COLORS: Record<string, string> = {
  purple: '#a78bfa',
  green: '#10b981',
  orange: '#f97316',
  cyan: '#06b6d4',
};

function MetricCard({
  color,
  value,
  label,
  description,
}: {
  color: string;
  value: string;
  label: string;
  description: string;
}) {
  return (
    <div
      className="bg-gradient-to-br from-[#1e1e2e] to-[#2d2d44] rounded-xl p-4 text-center"
      style={{ borderLeft: `4px solid ${COLORS[color]}` }}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-400 mt-1">
        {label}
        <br />
        <span dangerouslySetInnerHTML={{ __html: description }} />
      </div>
    </div>
  );
}

function SummaryTab({
  productos,
  productoCritico,
  costos,
  onRemove,
  onClear,
}: {
  productos: Producto[];
  productoCritico: Producto | null;
  costos: number;
  onRemove: (i: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left - Portfolio */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-slate-200">Portafolio de Productos</h3>
        {productos.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700">
                    <th className="pb-2 pr-3">Nombre</th>
                    <th className="pb-2 pr-3">Precio</th>
                    <th className="pb-2 pr-3">Margen %</th>
                    <th className="pb-2 pr-3">Margen $</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="py-2 pr-3">{p.nombre}</td>
                      <td className="py-2 pr-3">{formatCurrency(p.precio)}</td>
                      <td className="py-2 pr-3">{(p.margenBruto * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-3">{formatCurrency(margenAbsoluto(p))}</td>
                      <td className="py-2">
                        <button
                          onClick={() => onRemove(i)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={onClear}
              className="mt-3 text-sm text-slate-400 hover:text-red-400 transition"
            >
              Limpiar productos
            </button>
          </>
        ) : (
          <p className="text-slate-500 text-sm">
            No hay productos cargados. Use el panel lateral para agregar productos.
          </p>
        )}
      </div>

      {/* Right - Critical Product + Costs */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">Producto Cr&iacute;tico</h3>
        {productoCritico ? (
          <div className="border-2 border-[#f97316] rounded-xl p-4 bg-gradient-to-br from-[#1e1e2e] to-[#2d2d44]">
            <div className="text-[#f97316] font-bold text-lg mb-2">{productoCritico.nombre}</div>
            <div className="space-y-1 text-sm text-slate-300">
              <p><strong className="text-white">Precio:</strong> {formatCurrency(productoCritico.precio)}</p>
              <p><strong className="text-white">Margen %:</strong> {(productoCritico.margenBruto * 100).toFixed(1)}%</p>
              <p><strong className="text-white">Margen $:</strong> {formatCurrency(margenAbsoluto(productoCritico))}</p>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Este es el producto con menor margen absoluto. Los c&aacute;lculos de VUM, ROAS Tradicional y CPR se basan en este producto.
            </p>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Agregue al menos un producto para ver el producto cr&iacute;tico.</p>
        )}

        <div>
          <h3 className="text-lg font-semibold text-slate-200">Resumen de Costos</h3>
          <div className="mt-2 bg-[#0f0f23] rounded-lg p-4">
            <p className="text-sm text-slate-400">Costos Totales (IP + TF + IE)</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(costos)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SensitivityTab({ type, params }: { type: 'IP' | 'TF' | 'IE' | 'Margen'; params: ParametrosCliente }) {
  const config = SENSITIVITY_CONFIGS.find((c) => c.type === type)!;
  const data = useMemo(() => calcularSensibilidad(type, params, 50), [type, params]);

  if (!data || params.productos.length === 0) {
    return <p className="text-slate-500">Agregue productos para ver el an&aacute;lisis de sensibilidad.</p>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-200 mb-4">{config.title}</h3>
      <SensitivityChart data={data} xLabel={config.xLabel} xFormat={config.xFormat} />
    </div>
  );
}
