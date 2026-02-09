/**
 * IP-ROAS Calculator Types
 * Exact reimplementation of the Python dataclasses from streamlit_app.py
 */

/** Represents a product in the client's portfolio (Python: Producto) */
export interface Producto {
  nombre: string;
  precio: number;
  margenBruto: number; // Percentage as decimal (0.30 = 30%)
}

/** Client input parameters (Python: ParametrosCliente) */
export interface ParametrosCliente {
  inversionPublicitaria: number; // IP
  tarifaFija: number;           // TF
  ingresoEsperado: number;      // IE
  productos: Producto[];
}

/** Calculation results (Python: ResultadosIPROAS) */
export interface ResultadosIPROAS {
  ipRoas: number;
  vum: number;
  roasMinTradicional: number;
  cprEstimado: number;
  costosTotales: number;
  margenMinimoUsado: number;
  precioProductoMinimo: number;
  productoCritico: string;
}

/** Sensitivity analysis types */
export type SensitivityType = 'IP' | 'TF' | 'IE' | 'Margen';

/** A single data point for sensitivity charts */
export interface SensitivityDataPoint {
  x: number;
  ipRoas: number;
  roasTradicional: number;
}

/** Configuration for a sensitivity chart */
export interface SensitivityConfig {
  type: SensitivityType;
  title: string;
  xLabel: string;
  xFormat: 'currency' | 'percent';
}

/** All sensitivity chart configurations */
export const SENSITIVITY_CONFIGS: SensitivityConfig[] = [
  { type: 'IP', title: 'Sensibilidad IP-ROAS vs Inversi\u00f3n Publicitaria', xLabel: 'Inversi\u00f3n Publicitaria ($)', xFormat: 'currency' },
  { type: 'TF', title: 'Sensibilidad IP-ROAS vs Tarifa Fija', xLabel: 'Tarifa Fija ($)', xFormat: 'currency' },
  { type: 'IE', title: 'Sensibilidad IP-ROAS vs Ingreso Esperado', xLabel: 'Ingreso Esperado ($)', xFormat: 'currency' },
  { type: 'Margen', title: 'Sensibilidad IP-ROAS vs Margen Bruto', xLabel: 'Margen Bruto (%)', xFormat: 'percent' },
];
