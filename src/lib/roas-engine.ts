/**
 * IP-ROAS Calculation Engine
 * ===========================
 * Exact reimplementation of CalculadoraIPROAS from streamlit_app.py
 * All formulas, parameters, and behavior are preserved 1:1.
 */

import type {
  Producto,
  ParametrosCliente,
  ResultadosIPROAS,
  SensitivityType,
  SensitivityDataPoint,
} from '@/types/roas';

// ============================================================================
// HELPER FUNCTIONS (match Python Producto/ParametrosCliente properties)
// ============================================================================

/** Producto.margen_absoluto → precio * margen_bruto */
export function margenAbsoluto(producto: Producto): number {
  return producto.precio * producto.margenBruto;
}

/** ParametrosCliente.costos_totales → IP + TF + IE */
export function costosTotales(params: ParametrosCliente): number {
  return params.inversionPublicitaria + params.tarifaFija + params.ingresoEsperado;
}

/** ParametrosCliente.producto_margen_minimo → min by margen_absoluto */
export function productoMargenMinimo(productos: Producto[]): Producto | null {
  if (productos.length === 0) return null;
  return productos.reduce((min, p) =>
    margenAbsoluto(p) < margenAbsoluto(min) ? p : min
  );
}

// ============================================================================
// CORE CALCULATIONS (match CalculadoraIPROAS methods exactly)
// ============================================================================

/**
 * IP-ROAS = 1 + (TF + IE) / IP
 * Python: calcular_ip_roas / f_ip_roas
 */
export function calcularIpRoas(IP: number, TF: number, IE: number): number {
  if (IP <= 0) return Infinity;
  return 1 + (TF + IE) / IP;
}

/**
 * VUM = ceil(costos_totales / margen_absoluto)
 * Python: calcular_vum
 */
export function calcularVum(params: ParametrosCliente, margenAbs?: number): number {
  if (margenAbs === undefined) {
    const producto = productoMargenMinimo(params.productos);
    if (!producto || margenAbsoluto(producto) <= 0) return 0;
    margenAbs = margenAbsoluto(producto);
  }
  if (margenAbs <= 0) return 0;
  return Math.ceil(costosTotales(params) / margenAbs);
}

/**
 * ROAS Tradicional = (precio * VUM) / IP
 * Python: calcular_roas_minimo_tradicional
 */
export function calcularRoasMinTradicional(
  IP: number,
  vum: number,
  precio: number
): number {
  if (IP <= 0) return Infinity;
  return (precio * vum) / IP;
}

/**
 * CPR Estimado = IP / VUM
 * Python: calcular_cpr_estimado
 */
export function calcularCprEstimado(IP: number, vum: number): number {
  if (vum <= 0) return Infinity;
  return IP / vum;
}

/**
 * Static helper: f_roas_tradicional(IP, TF, IE, m_star, p_star)
 * Computes VUM internally then returns (p_star * vum) / IP
 * Python: CalculadoraIPROAS.f_roas_tradicional
 */
export function fRoasTradicional(
  IP: number,
  TF: number,
  IE: number,
  mStar: number,
  pStar: number
): number {
  if (IP <= 0 || mStar <= 0) return Infinity;
  const vum = Math.ceil((TF + IP + IE) / mStar);
  return (pStar * vum) / IP;
}

// ============================================================================
// MAIN CALCULATION (match calcular_todo)
// ============================================================================

/**
 * Runs all calculations and returns a ResultadosIPROAS object.
 * Python: CalculadoraIPROAS.calcular_todo
 */
export function calcularTodo(params: ParametrosCliente): ResultadosIPROAS {
  const producto = productoMargenMinimo(params.productos);
  if (!producto) {
    return {
      ipRoas: 0,
      vum: 0,
      roasMinTradicional: 0,
      cprEstimado: 0,
      costosTotales: 0,
      margenMinimoUsado: 0,
      precioProductoMinimo: 0,
      productoCritico: 'N/A',
    };
  }

  const IP = params.inversionPublicitaria;
  const TF = params.tarifaFija;
  const IE = params.ingresoEsperado;

  const ipRoas = calcularIpRoas(IP, TF, IE);
  const vum = calcularVum(params);
  const roasMinTradicional = calcularRoasMinTradicional(IP, vum, producto.precio);
  const cprEstimado = calcularCprEstimado(IP, vum);

  return {
    ipRoas,
    vum,
    roasMinTradicional,
    cprEstimado,
    costosTotales: costosTotales(params),
    margenMinimoUsado: margenAbsoluto(producto),
    precioProductoMinimo: producto.precio,
    productoCritico: producto.nombre,
  };
}

// ============================================================================
// SENSITIVITY ANALYSIS (match calcular_sensibilidad exactly)
// ============================================================================

/**
 * Generates linearly spaced values (equivalent to numpy.linspace).
 */
function linspace(start: number, end: number, n: number): number[] {
  if (n <= 1) return [start];
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + step * i);
}

/**
 * Computes sensitivity data for a given parameter.
 * Returns an array of data points for charting.
 * Python: calcular_sensibilidad
 */
export function calcularSensibilidad(
  tipo: SensitivityType,
  params: ParametrosCliente,
  numPoints: number = 50
): SensitivityDataPoint[] | null {
  const producto = productoMargenMinimo(params.productos);
  if (!producto) return null;

  const mStar = margenAbsoluto(producto);
  const pStar = producto.precio;
  let IP = params.inversionPublicitaria;
  let TF = params.tarifaFija;
  let IE = params.ingresoEsperado;

  let xValues: number[];

  switch (tipo) {
    case 'IP': {
      if (IP <= 0) IP = 10000;
      const xMin = Math.max(100, IP * 0.5);
      const xMax = IP * 1.5;
      xValues = linspace(xMin, xMax, numPoints);
      return xValues.map((x) => ({
        x,
        ipRoas: calcularIpRoas(x, TF, IE),
        roasTradicional: fRoasTradicional(x, TF, IE, mStar, pStar),
      }));
    }
    case 'TF': {
      if (TF <= 0) TF = 5000;
      const xMin = Math.max(0, TF * 0.5);
      const xMax = TF * 1.5;
      xValues = linspace(xMin, xMax, numPoints);
      return xValues.map((x) => ({
        x,
        ipRoas: calcularIpRoas(IP, x, IE),
        roasTradicional: fRoasTradicional(IP, x, IE, mStar, pStar),
      }));
    }
    case 'IE': {
      if (IE <= 0) IE = 5000;
      const xMin = Math.max(0, IE * 0.5);
      const xMax = IE * 1.5;
      xValues = linspace(xMin, xMax, numPoints);
      return xValues.map((x) => ({
        x,
        ipRoas: calcularIpRoas(IP, TF, x),
        roasTradicional: fRoasTradicional(IP, TF, x, mStar, pStar),
      }));
    }
    case 'Margen': {
      let margenPct = producto.margenBruto;
      if (margenPct <= 0) margenPct = 0.3;
      const xMin = Math.max(0.05, margenPct * 0.5);
      const xMax = Math.min(0.95, margenPct * 1.5);
      xValues = linspace(xMin, xMax, numPoints);
      return xValues.map((x) => ({
        x,
        ipRoas: calcularIpRoas(IP, TF, IE), // IP-ROAS does not depend on margin
        roasTradicional: fRoasTradicional(IP, TF, IE, pStar * x, pStar),
      }));
    }
    default:
      return null;
  }
}

// ============================================================================
// CSV PARSING (match the CSV import logic from streamlit_app.py)
// ============================================================================

/**
 * Parses CSV text into an array of Producto objects.
 * Supports column names: nombre/name, precio/price, margen/margen_bruto/margin
 * If margen > 1, assumes percentage (e.g., 35 → 0.35)
 */
export function parseCSV(csvText: string): Producto[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const productos: Producto[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });

    const nombre = row['nombre'] || row['name'] || `P${productos.length + 1}`;
    const precio = parseFloat(row['precio'] || row['price'] || '0');
    let margen = parseFloat(row['margen'] || row['margen_bruto'] || row['margin'] || '0');

    // If margen > 1, assume it's a percentage
    if (margen > 1) {
      margen = margen / 100;
    }

    if (!isNaN(precio) && !isNaN(margen)) {
      productos.push({ nombre, precio, margenBruto: margen });
    }
  }

  return productos;
}
