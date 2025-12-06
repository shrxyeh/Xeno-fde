import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface OrdersChartProps {
  data: Array<{
    date: string;
    ordersCount: number;
    revenue: number;
  }>;
  dateRange: {
    from: string;
    to: string;
  };
}

export default function OrdersChart({ data, dateRange }: OrdersChartProps) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-100">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">
        Orders & Revenue Over Time
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
        {dateRange.from} to {dateRange.to}
      </p>
      <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            className="sm:text-xs"
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="sm:text-xs" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="sm:text-xs" />
          <Tooltip
            contentStyle={{ fontSize: '12px' }}
            formatter={(value: any, name: string) => {
              if (name === 'revenue') {
                return [`₹${value.toFixed(2)}`, 'Revenue'];
              }
              return [value, 'Orders'];
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="ordersCount"
            stroke="#3b82f6"
            name="Orders"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            name="Revenue"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
