/**
 * Unit tests for IP-ROAS Calculation Engine
 * Validates that all formulas match the Python Streamlit implementation exactly.
 */

import {
  margenAbsoluto,
  costosTotales,
  productoMargenMinimo,
  calcularIpRoas,
  calcularVum,
  calcularRoasMinTradicional,
  calcularCprEstimado,
  fRoasTradicional,
  calcularTodo,
  calcularSensibilidad,
  parseCSV,
} from '../roas-engine';
import type { Producto, ParametrosCliente } from '@/types/roas';

// ============================================================================
// TEST DATA
// ============================================================================

const productoA: Producto = { nombre: 'Producto A', precio: 1000, margenBruto: 0.30 };
const productoB: Producto = { nombre: 'Producto B', precio: 500, margenBruto: 0.20 };
const productoC: Producto = { nombre: 'Producto C', precio: 2000, margenBruto: 0.50 };

const baseParams: ParametrosCliente = {
  inversionPublicitaria: 50000,
  tarifaFija: 10000,
  ingresoEsperado: 15000,
  productos: [productoA, productoB, productoC],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

describe('margenAbsoluto', () => {
  test('calculates precio * margenBruto', () => {
    expect(margenAbsoluto(productoA)).toBe(300);  // 1000 * 0.30
    expect(margenAbsoluto(productoB)).toBe(100);  // 500 * 0.20
    expect(margenAbsoluto(productoC)).toBe(1000); // 2000 * 0.50
  });
});

describe('costosTotales', () => {
  test('calculates IP + TF + IE', () => {
    expect(costosTotales(baseParams)).toBe(75000); // 50000 + 10000 + 15000
  });

  test('handles zero values', () => {
    expect(costosTotales({ ...baseParams, tarifaFija: 0, ingresoEsperado: 0 })).toBe(50000);
  });
});

describe('productoMargenMinimo', () => {
  test('returns product with lowest absolute margin', () => {
    const resultado = productoMargenMinimo([productoA, productoB, productoC]);
    expect(resultado).not.toBeNull();
    expect(resultado!.nombre).toBe('Producto B'); // 500 * 0.20 = 100 is the lowest
  });

  test('returns null for empty array', () => {
    expect(productoMargenMinimo([])).toBeNull();
  });

  test('returns single product when only one exists', () => {
    const resultado = productoMargenMinimo([productoA]);
    expect(resultado!.nombre).toBe('Producto A');
  });
});

// ============================================================================
// CORE CALCULATIONS
// ============================================================================

describe('calcularIpRoas', () => {
  test('formula: 1 + (TF + IE) / IP', () => {
    // 1 + (10000 + 15000) / 50000 = 1 + 0.5 = 1.5
    expect(calcularIpRoas(50000, 10000, 15000)).toBe(1.5);
  });

  test('returns Infinity when IP <= 0', () => {
    expect(calcularIpRoas(0, 10000, 15000)).toBe(Infinity);
    expect(calcularIpRoas(-1, 10000, 15000)).toBe(Infinity);
  });

  test('returns 1 when TF and IE are zero', () => {
    expect(calcularIpRoas(50000, 0, 0)).toBe(1);
  });

  test('handles large values correctly', () => {
    const result = calcularIpRoas(1000000, 500000, 200000);
    expect(result).toBeCloseTo(1.7, 5);
  });
});

describe('calcularVum', () => {
  test('formula: ceil(costos_totales / margen_absoluto)', () => {
    // costos = 75000, min margin = 100 (Producto B) → ceil(75000/100) = 750
    expect(calcularVum(baseParams)).toBe(750);
  });

  test('uses provided margen when given', () => {
    // ceil(75000 / 300) = ceil(250) = 250
    expect(calcularVum(baseParams, 300)).toBe(250);
  });

  test('returns 0 when no products', () => {
    expect(calcularVum({ ...baseParams, productos: [] })).toBe(0);
  });

  test('returns 0 when margen is zero', () => {
    expect(calcularVum(baseParams, 0)).toBe(0);
  });

  test('rounds up correctly', () => {
    // ceil(75000 / 400) = ceil(187.5) = 188
    expect(calcularVum(baseParams, 400)).toBe(188);
  });
});

describe('calcularRoasMinTradicional', () => {
  test('formula: (precio * VUM) / IP', () => {
    // (500 * 750) / 50000 = 375000 / 50000 = 7.5
    expect(calcularRoasMinTradicional(50000, 750, 500)).toBe(7.5);
  });

  test('returns Infinity when IP <= 0', () => {
    expect(calcularRoasMinTradicional(0, 750, 500)).toBe(Infinity);
  });
});

describe('calcularCprEstimado', () => {
  test('formula: IP / VUM', () => {
    // 50000 / 750 = 66.666...
    expect(calcularCprEstimado(50000, 750)).toBeCloseTo(66.6667, 3);
  });

  test('returns Infinity when VUM <= 0', () => {
    expect(calcularCprEstimado(50000, 0)).toBe(Infinity);
  });
});

describe('fRoasTradicional', () => {
  test('formula: (p_star * ceil((TF + IP + IE) / m_star)) / IP', () => {
    // vum = ceil((10000 + 50000 + 15000) / 100) = ceil(750) = 750
    // (500 * 750) / 50000 = 7.5
    expect(fRoasTradicional(50000, 10000, 15000, 100, 500)).toBe(7.5);
  });

  test('returns Infinity when IP <= 0', () => {
    expect(fRoasTradicional(0, 10000, 15000, 100, 500)).toBe(Infinity);
  });

  test('returns Infinity when mStar <= 0', () => {
    expect(fRoasTradicional(50000, 10000, 15000, 0, 500)).toBe(Infinity);
  });
});

// ============================================================================
// FULL CALCULATION
// ============================================================================

describe('calcularTodo', () => {
  test('computes all results correctly for base params', () => {
    const resultado = calcularTodo(baseParams);

    expect(resultado.ipRoas).toBe(1.5);
    expect(resultado.vum).toBe(750);
    expect(resultado.roasMinTradicional).toBe(7.5);
    expect(resultado.cprEstimado).toBeCloseTo(66.6667, 3);
    expect(resultado.costosTotales).toBe(75000);
    expect(resultado.margenMinimoUsado).toBe(100);
    expect(resultado.precioProductoMinimo).toBe(500);
    expect(resultado.productoCritico).toBe('Producto B');
  });

  test('returns zeros when no products', () => {
    const resultado = calcularTodo({ ...baseParams, productos: [] });
    expect(resultado.ipRoas).toBe(0);
    expect(resultado.vum).toBe(0);
    expect(resultado.roasMinTradicional).toBe(0);
    expect(resultado.cprEstimado).toBe(0);
    expect(resultado.productoCritico).toBe('N/A');
  });

  test('handles single product', () => {
    const params: ParametrosCliente = {
      inversionPublicitaria: 20000,
      tarifaFija: 5000,
      ingresoEsperado: 3000,
      productos: [{ nombre: 'Unico', precio: 800, margenBruto: 0.25 }],
    };
    const resultado = calcularTodo(params);

    // IP-ROAS = 1 + (5000 + 3000) / 20000 = 1.4
    expect(resultado.ipRoas).toBe(1.4);
    // Margen abs = 800 * 0.25 = 200
    // VUM = ceil(28000 / 200) = 140
    expect(resultado.vum).toBe(140);
    // ROAS Trad = (800 * 140) / 20000 = 5.6
    expect(resultado.roasMinTradicional).toBe(5.6);
    // CPR = 20000 / 140 ≈ 142.857
    expect(resultado.cprEstimado).toBeCloseTo(142.857, 2);
    expect(resultado.productoCritico).toBe('Unico');
  });
});

// ============================================================================
// SENSITIVITY ANALYSIS
// ============================================================================

describe('calcularSensibilidad', () => {
  test('returns null when no products', () => {
    expect(calcularSensibilidad('IP', { ...baseParams, productos: [] })).toBeNull();
  });

  test('IP sensitivity returns correct number of points', () => {
    const data = calcularSensibilidad('IP', baseParams, 20);
    expect(data).not.toBeNull();
    expect(data!.length).toBe(20);
  });

  test('IP sensitivity range is [max(100, IP*0.5), IP*1.5]', () => {
    const data = calcularSensibilidad('IP', baseParams, 50)!;
    expect(data[0].x).toBeCloseTo(25000, 0); // max(100, 50000*0.5) = 25000
    expect(data[data.length - 1].x).toBeCloseTo(75000, 0); // 50000*1.5 = 75000
  });

  test('TF sensitivity returns correct data', () => {
    const data = calcularSensibilidad('TF', baseParams, 10);
    expect(data).not.toBeNull();
    expect(data!.length).toBe(10);
    // First point x should be TF * 0.5 = 5000
    expect(data![0].x).toBeCloseTo(5000, 0);
  });

  test('IE sensitivity returns correct data', () => {
    const data = calcularSensibilidad('IE', baseParams, 10);
    expect(data).not.toBeNull();
    expect(data!.length).toBe(10);
    // First point x should be IE * 0.5 = 7500
    expect(data![0].x).toBeCloseTo(7500, 0);
  });

  test('Margen sensitivity: IP-ROAS is constant', () => {
    const data = calcularSensibilidad('Margen', baseParams, 10)!;
    // IP-ROAS does not depend on margin
    const ipRoasValues = data.map((d) => d.ipRoas);
    expect(new Set(ipRoasValues).size).toBe(1);
    expect(ipRoasValues[0]).toBe(1.5);
  });

  test('Margen sensitivity: ROAS trad decreases as margin increases', () => {
    const data = calcularSensibilidad('Margen', baseParams, 10)!;
    // Higher margin → fewer units needed → lower ROAS trad (or same due to ceil)
    // At minimum, it should not increase monotonically
    const firstRoasTrad = data[0].roasTradicional;
    const lastRoasTrad = data[data.length - 1].roasTradicional;
    expect(lastRoasTrad).toBeLessThanOrEqual(firstRoasTrad);
  });

  test('IP sensitivity with IP=0 defaults to 10000', () => {
    const params = { ...baseParams, inversionPublicitaria: 0 };
    const data = calcularSensibilidad('IP', params, 10)!;
    // Range: [max(100, 10000*0.5), 10000*1.5] = [5000, 15000]
    expect(data[0].x).toBeCloseTo(5000, 0);
    expect(data[data.length - 1].x).toBeCloseTo(15000, 0);
  });

  test('TF sensitivity with TF=0 defaults to 5000', () => {
    const params = { ...baseParams, tarifaFija: 0 };
    const data = calcularSensibilidad('TF', params, 10)!;
    // Range: [max(0, 5000*0.5), 5000*1.5] = [2500, 7500]
    expect(data[0].x).toBeCloseTo(2500, 0);
  });
});

// ============================================================================
// CSV PARSING
// ============================================================================

describe('parseCSV', () => {
  test('parses standard CSV with nombre,precio,margen headers', () => {
    const csv = `nombre,precio,margen
Zapatos,1500,0.35
Camisa,800,0.25`;
    const productos = parseCSV(csv);
    expect(productos).toHaveLength(2);
    expect(productos[0]).toEqual({ nombre: 'Zapatos', precio: 1500, margenBruto: 0.35 });
    expect(productos[1]).toEqual({ nombre: 'Camisa', precio: 800, margenBruto: 0.25 });
  });

  test('converts percentage margen > 1 to decimal', () => {
    const csv = `nombre,precio,margen
Zapatos,1500,35`;
    const productos = parseCSV(csv);
    expect(productos[0].margenBruto).toBe(0.35);
  });

  test('supports alternative column names', () => {
    const csv = `name,price,margin
Shoes,100,0.40`;
    const productos = parseCSV(csv);
    expect(productos[0]).toEqual({ nombre: 'Shoes', precio: 100, margenBruto: 0.40 });
  });

  test('supports margen_bruto column name', () => {
    const csv = `nombre,precio,margen_bruto
Test,200,0.15`;
    const productos = parseCSV(csv);
    expect(productos[0].margenBruto).toBe(0.15);
  });

  test('returns empty array for empty CSV', () => {
    expect(parseCSV('')).toEqual([]);
    expect(parseCSV('nombre,precio,margen')).toEqual([]);
  });

  test('skips rows with invalid numbers', () => {
    const csv = `nombre,precio,margen
Valid,100,0.30
Invalid,abc,xyz`;
    const productos = parseCSV(csv);
    expect(productos).toHaveLength(1);
  });
});
