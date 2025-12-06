'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCurrentUser,
  getDashboardSummary,
  getOrdersByDate,
  getTopCustomers,
  getEventsTimeline,
  triggerSync,
  logout,
  getShopifyConnectUrl,
} from '@/lib/api';
import SummaryCards from '@/components/SummaryCards';
import OrdersChart from '@/components/OrdersChart';
import TopCustomersTable from '@/components/TopCustomersTable';
import EventsChart from '@/components/EventsChart';
import { format, subDays } from 'date-fns';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, dateRange]);

  const loadUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [summaryData, ordersData, customersData, eventsData] =
        await Promise.all([
          getDashboardSummary(),
          getOrdersByDate(dateRange.from, dateRange.to),
          getTopCustomers(5),
          getEventsTimeline(30),
        ]);

      setSummary(summaryData);
      setOrdersData(ordersData);
      setTopCustomers(customersData);
      setEventsData(eventsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSync();
      await loadDashboardData();
      alert('Sync completed successfully!');
    } catch (error) {
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleConnectShopify = async () => {
    try {
      const { url } = await getShopifyConnectUrl(user.tenantId);
      window.location.href = url;
    } catch (error) {
      alert('Failed to get Shopify connection URL. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                </svg>
                Xeno Analytics Dashboard
              </h1>
              <p className="text-blue-100 mt-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">{user?.tenant?.name}</span>
                <span className="opacity-75">•</span>
                <span className="opacity-90">{user?.tenant?.shopDomain}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-6 py-2.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        {summary && <SummaryCards data={summary} />}

        {/* Charts Row */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Orders Chart */}
          <OrdersChart data={ordersData} dateRange={dateRange} />

          {/* Events Chart */}
          <EventsChart data={eventsData} />
        </div>

        {/* Top Customers Table */}
        <div className="mt-8">
          <TopCustomersTable customers={topCustomers} />
        </div>
      </div>
    </div>
  );
}
