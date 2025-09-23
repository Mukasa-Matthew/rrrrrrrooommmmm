'use client';

import React from 'react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export interface PieDatum {
  name: string;
  value: number;
}

type NumericRecord = Record<string, number | string>;

interface PieChartProps {
  data: PieDatum[] | NumericRecord[];
  colors?: string[];
  height?: number; // in px
}

export default function PieChart({ data, colors = ["#22c55e", "#e5e7eb", "#3b82f6", "#f59e0b"], height = 256 }: PieChartProps) {
  const normalized = Array.isArray(data)
    ? data.map((d: any) => ({ name: String(d.name ?? d.label ?? ''), value: Number(d.value ?? d.total ?? 0) }))
    : [];
  const hasData = normalized.some(d => Number(d.value) > 0);
  return (
    <div style={{ width: '100%', height }}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie data={normalized} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {normalized.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </RePieChart>
        </ResponsiveContainer>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
          No data
        </div>
      )}
    </div>
  );
}
