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
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Events Timeline (Last 30 Days)
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Track cart abandonment and checkout events
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="cart_abandoned"
            stackId="1"
            stroke="#ff7c7c"
            fill="#ff7c7c"
            name="Cart Abandoned"
          />
          <Area
            type="monotone"
            dataKey="checkout_started"
            stackId="1"
            stroke="#ffa500"
            fill="#ffa500"
            name="Checkout Started"
          />
          <Area
            type="monotone"
            dataKey="order_created"
            stackId="1"
            stroke="#82ca9d"
            fill="#82ca9d"
            name="Order Created"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
