import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchStockMovements, fetchAdminStats } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AdminStockChart from './AdminStockChart';
import AdminAddProduct from './AdminAddProduct';
import AdminOrders from './AdminOrders';

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, logout } = useAuth();

  // Active Tab: 'analytics' | 'products' | 'orders'
  const [activeTab, setActiveTab] = useState('analytics');

  // Chart timeframe state
  const [chartDays, setChartDays] = useState(14);

  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(),
    enabled: Boolean(isAuthenticated && (user?.is_staff || user?.is_superuser)),
  });

  // 2. Fetch Stock Movements & Daily Chart Data
  const { data: stockData, isLoading: isStockLoading } = useQuery({
    queryKey: ['stockMovements', chartDays],
    queryFn: () => fetchStockMovements(chartDays),
    enabled: Boolean(isAuthenticated && (user?.is_staff || user?.is_superuser)),
  });

  // 3. Fetch Admin Stats
  const { data: adminStats, isLoading: isStatsLoading, isError: isStatsError } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => fetchAdminStats(),
    enabled: Boolean(isAuthenticated && (user?.is_staff || user?.is_superuser)),
  });

  // Strict backend-verified admin privileges check
  const isAdminAuthorized = Boolean(
    isAuthenticated && (user?.is_staff || user?.is_superuser)
  );

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    try {
      const res = await login({ email: staffEmail, password: staffPassword });
      if (!res.success) {
        setAuthError(res.error || 'Invalid administrator credentials.');
      } else if (!res.user?.is_staff && !res.user?.is_superuser) {
        setAuthError('Access Denied: This account does not possess staff privileges.');
      }
    } catch {
      setAuthError('Connection error. Please verify the backend server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not authorized, render the Admin Access Guard
  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant/60 p-8 rounded-xs shadow-xl text-center">
          <span className="material-symbols-outlined text-[48px] text-primary mb-3">
            admin_panel_settings
          </span>
          <span className="font-label-caps text-xs text-primary uppercase tracking-widest block mb-1">
            Restricted Access
          </span>
          <h2 className="font-headline-md text-2xl text-on-surface mb-2">
            Lumière Admin Console
          </h2>
          <p className="font-body-md text-xs text-on-surface-variant mb-6">
            This management console is restricted to authorized store administrators for catalog, order, and stock control.
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded text-center">
              {authError}
            </div>
          )}

          {isAuthenticated && !user?.is_staff && !user?.is_superuser && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded text-center">
              Logged in as <strong>{user?.name || user?.username}</strong> (Customer). Please log in with a staff administrator account.
            </div>
          )}

          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <input
                type="text"
                required
                placeholder="Staff Username or Email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <input
                type="password"
                required
                placeholder="Administrator Password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-on-surface text-surface py-3.5 font-button text-xs uppercase tracking-widest hover:bg-on-surface-variant transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Authorize & Enter Console'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-outline-variant/30 flex justify-between items-center text-xs">
            <Link to="/" className="text-on-surface-variant hover:text-primary transition-colors">
              ← Return to Boutique
            </Link>
            {isAuthenticated && (
              <button
                onClick={logout}
                className="text-rose-600 font-semibold hover:underline cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* ── Admin Top Navigation Bar ── */}
      <header className="bg-surface-container-lowest border-b border-outline-variant/50 sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="font-headline-sm text-xl tracking-[0.2em] text-on-background uppercase hover:opacity-80 transition-opacity"
            >
              LUMIÈRE
            </Link>
            <span className="text-outline">/</span>
            <span className="font-label-caps text-xs text-primary uppercase tracking-widest font-semibold flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[14px]">shield_person</span>
              Admin Console
            </span>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <Link
              to="/shop"
              className="text-xs font-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              View Live Store
            </Link>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="text-xs font-label-caps uppercase text-rose-700 hover:text-rose-900 border border-rose-200 px-3 py-1 rounded transition-colors cursor-pointer"
            >
              Exit Console
            </button>
          </div>
        </div>
      </header>

      {/* ── Admin Dashboard Container ── */}
      <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 py-8 flex-grow">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap gap-2 md:gap-4 border-b border-outline-variant/40 pb-4 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2.5 rounded-xs font-label-caps text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-on-surface text-surface shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/40'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">query_stats</span>
            Daily Stock Movement Chart &amp; Analytics
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 rounded-xs font-label-caps text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-on-surface text-surface shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/40'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            Add &amp; Manage Products ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2.5 rounded-xs font-label-caps text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-on-surface text-surface shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/40'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            Customer Purchases History
          </button>
        </div>

        {/* ── Active Tab View ── */}
        <main>
          {activeTab === 'analytics' && (
            <AdminStockChart
              stockData={stockData}
              adminStats={adminStats}
              isStatsLoading={isStatsLoading}
              isStatsError={isStatsError}
              days={chartDays}
              setDays={setChartDays}
              isLoading={isStockLoading}
            />
          )}

          {activeTab === 'products' && (
            <AdminAddProduct products={products} />
          )}

          {activeTab === 'orders' && (
            <AdminOrders />
          )}
        </main>
      </div>

      {/* Admin Footer */}
      <footer className="border-t border-outline-variant/30 py-6 bg-surface-container-low text-center text-xs text-on-surface-variant mt-auto">
        <p>Lumière Maison Fine Jewelry • Executive Administrator Dashboard</p>
      </footer>
    </div>
  );
};

export default Admin;
