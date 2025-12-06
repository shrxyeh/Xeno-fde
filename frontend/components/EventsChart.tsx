import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface EventsChartProps {
  data: Array<{
    date: string;
    cart_abandoned: number;
    checkout_started: number;
    checkout_completed: number;
    order_created: number;
  }>;
}

export default function EventsChart({ data }: EventsChartProps) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-100">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">
        Events Timeline (Last 30 Days)
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
        Track cart abandonment and checkout events
      </p>
      <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
        <AreaChart data={data}>
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
          <YAxis tick={{ fontSize: 10 }} className="sm:text-xs" />
          <Tooltip contentStyle={{ fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Area
            type="monotone"
            dataKey="cart_abandoned"
            stackId="1"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.6}
            name="Cart Abandoned"
          />
          <Area
            type="monotone"
            dataKey="checkout_started"
            stackId="1"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.6}
            name="Checkout Started"
          />
          <Area
            type="monotone"
            dataKey="order_created"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.6}
            name="Order Created"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
