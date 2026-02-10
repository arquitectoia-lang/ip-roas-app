'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { SensitivityDataPoint } from '@/types/roas';

interface SensitivityChartProps {
  data: SensitivityDataPoint[];
  xLabel: string;
  xFormat: 'currency' | 'percent';
}

function formatCurrencyTick(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatXTick(value: number, format: 'currency' | 'percent'): string {
  if (format === 'percent') {
    return `${(value * 100).toFixed(0)}%`;
  }
  return formatCurrencyTick(value);
}

function formatXTooltip(value: number, format: 'currency' | 'percent'): string {
  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`;
  }
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Pick at most maxTicks equispaced tick values from the data's x range. */
function computeTicks(data: SensitivityDataPoint[], maxTicks: number = 7): number[] {
  if (data.length === 0) return [];
  const xValues = data.map((d) => d.x);
  const min = xValues[0];
  const max = xValues[xValues.length - 1];
  if (min === max) return [min];
  const step = (max - min) / (maxTicks - 1);
  return Array.from({ length: maxTicks }, (_, i) => min + step * i);
}

export default function SensitivityChart({ data, xLabel, xFormat }: SensitivityChartProps) {
  const ticks = useMemo(() => computeTicks(data, 7), [data]);

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={ticks}
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 11, angle: -45, textAnchor: 'end' }}
            tickFormatter={(v) => formatXTick(v, xFormat)}
            label={{ value: xLabel, position: 'bottom', offset: 20, fill: '#94a3b8', fontSize: 13 }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'ROAS', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 13 }}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '13px',
            }}
            labelFormatter={(v) => `${xLabel}: ${formatXTooltip(Number(v), xFormat)}`}
            formatter={(value, name) => [
              Number(value).toFixed(4),
              name === 'ipRoas' ? 'IP-ROAS' : 'ROAS Tradicional',
            ]}
          />
          <Legend
            verticalAlign="top"
            formatter={(value: string) =>
              value === 'ipRoas' ? 'IP-ROAS' : 'ROAS Tradicional'
            }
            wrapperStyle={{ color: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="ipRoas"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#a78bfa' }}
          />
          <Line
            type="monotone"
            dataKey="roasTradicional"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#f97316' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
