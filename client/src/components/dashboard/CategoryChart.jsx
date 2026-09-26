import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const COLORS = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#64748b', // slate
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
        <p className="font-bold text-slate-900 dark:text-slate-100">{item.name}</p>
        <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
          {formatCurrency(item.value)}
        </p>
      </div>
    );
  }
  return null;
};

const CategoryChart = ({ data = [] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
        <span>No category expenses recorded this month</span>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryChart;
