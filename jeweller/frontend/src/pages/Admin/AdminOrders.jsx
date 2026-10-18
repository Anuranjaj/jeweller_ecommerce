import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrders, updateOrderStatus } from '../../services/api';
import { ProductImage } from '../../services/media';


const AdminOrders = () => {
  const queryClient = useQueryClient();

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Fetch all orders from backend database
  const { data: dbOrders = [], isLoading } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: fetchOrders,
  });

  // Update order status mutation
  const statusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }) => updateOrderStatus(orderId, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });

  // Real database orders
  const allOrdersList = Array.isArray(dbOrders) ? dbOrders : [];


  // Filter orders by search & status
  const filteredOrders = allOrdersList.filter((order) => {
    const matchesSearch =
      String(order.id || order.order_number || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      String(order.customer_name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      String(order.customer_email || '').toLowerCase().includes(searchFilter.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || order.status?.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const totalSalesRevenue = allOrdersList
    .filter((o) => o.status !== 'Cancelled')
    .reduce((acc, o) => acc + (parseFloat(o.total_price || o.total) || 0), 0);

  return (
    <div className="space-y-8">
      {/* ── Order Summary Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
            Total Orders Logged
          </span>
          <div className="font-headline-lg text-3xl text-on-surface">
            {allOrdersList.length}
          </div>
          <span className="text-xs text-on-surface-variant font-body-md">
            Customer purchases across all time
          </span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
            Active / Processing Orders
          </span>
          <div className="font-headline-lg text-3xl text-emerald-700">
            {allOrdersList.filter((o) => o.status !== 'Cancelled').length}
          </div>
          <span className="text-xs text-on-surface-variant font-body-md">
            Awaiting delivery &amp; fulfillment
          </span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
            Gross Verified Purchases
          </span>
          <div className="font-headline-lg text-3xl text-primary">
            ₹ {totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-on-surface-variant font-body-md">
            Excluding cancelled orders
          </span>
        </div>
      </div>

      {/* ── Orders Table & Filter Controls ── */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 p-6 md:p-8 rounded-xs shadow-xs">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 pb-4 border-b border-outline-variant/30">
          <div>
            <span className="font-label-caps text-xs text-primary uppercase tracking-widest block mb-1">
              Sales History
            </span>
            <h3 className="font-headline-md text-xl md:text-2xl text-on-surface">
              Customer Purchases &amp; Fulfillment
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Search order #, client..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded py-2 pl-8 pr-3 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute left-2.5 top-2.5">
                search
              </span>
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 bg-surface-container-low border border-outline-variant rounded py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Listing */}
        {isLoading ? (
          <div className="py-16 text-center text-on-surface-variant">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-label-caps uppercase">Loading Customer Orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant mb-2">
              receipt_long
            </span>
            <p className="text-sm font-headline-sm">No customer purchase history found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const orderId = order.order_number || order.id;
              const orderTotal = parseFloat(order.total_price || order.total || 0);
              const orderItems = order.items || [];
              const isCancelled = order.status === 'Cancelled';

              const orderDateStr = order.created_at
                ? new Date(order.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : order.formattedDate || 'Recent';

              return (
                <div
                  key={orderId}
                  className={`border rounded-xs p-5 md:p-6 transition-all ${
                    isCancelled
                      ? 'border-outline-variant/30 bg-surface-container-low/40 opacity-80'
                      : 'border-outline-variant/60 bg-surface-container-lowest shadow-xs'
                  }`}
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-outline-variant/20 gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-headline-sm text-base text-on-surface font-semibold">
                          Order #{orderId}
                        </span>
                        <span
                          className={`font-label-caps text-[10px] uppercase px-2.5 py-0.5 rounded-full border ${
                            isCancelled
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : order.status === 'Delivered'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {order.status || 'Confirmed'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Client: <strong className="text-on-surface">{order.customer_name || 'Verified Client'}</strong>{' '}
                        {order.customer_email ? `(${order.customer_email})` : ''} • Date: {orderDateStr}
                      </p>
                    </div>

                    {/* Order Action & Status Change */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] font-label-caps uppercase text-on-surface-variant block">
                          Total Amount
                        </span>
                        <span className="font-headline-sm text-base font-bold text-on-surface">
                          ₹ {orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Status select for admin */}
                      <select
                        value={order.status || 'Confirmed'}
                        onChange={(e) =>
                          statusMutation.mutate({
                            orderId: order.id,
                            newStatus: e.target.value,
                          })
                        }
                        className="bg-surface-container-low border border-outline-variant rounded p-1.5 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Purchased Items List */}
                  <div className="divide-y divide-outline-variant/20 pt-3">
                    {orderItems.map((item, idx) => {
                      const img = item.product_image || item.image || '';
                      return (
                        <div
                          key={item.id || idx}
                          className="py-3 flex justify-between items-center text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-surface-container-low rounded border border-outline-variant/30 overflow-hidden shrink-0">
                              <ProductImage
                                src={img}
                                alt={item.product_name || item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div>
                              <span className="font-semibold text-on-surface block">
                                {item.product_name || item.name}
                              </span>
                              <span className="text-on-surface-variant text-[11px]">
                                {item.metal} {item.size ? `• Size ${item.size}` : ''} • Qty: {item.quantity}
                              </span>
                            </div>
                          </div>

                          <div className="text-right font-semibold text-on-surface">
                            ₹ {(parseFloat(item.price || 0) * parseInt(item.quantity || 1, 10)).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
