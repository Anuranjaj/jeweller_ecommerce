import { useState } from 'react';

const AdminStockChart = ({ stockData, adminStats, isStatsLoading, isStatsError, days, setDays, isLoading }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const dailyChart = stockData?.dailyChart || [];
  const totalInventoryCount = stockData?.totalInventoryCount || 0;
  const totalProductsCount = stockData?.totalProductsCount || 0;
  const lowStockAlerts = stockData?.lowStockAlerts || [];
  const recentMovements = stockData?.recentMovements || [];

  // Calculate maximum value for chart scaling
  const maxInflow = Math.max(...dailyChart.map((d) => d.inflow || 0), 10);
  const maxOutflow = Math.max(...dailyChart.map((d) => d.outflow || 0), 10);
  const maxVal = Math.max(maxInflow, maxOutflow, 15);

  const chartHeight = 220;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 25;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  // Compute points for SVG bars / lines
  const pointWidth = dailyChart.length > 0 ? usableWidth / dailyChart.length : 40;

  return (
    <div className="space-y-8">
      {/* ── Key Metrics Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
              Captured Revenue
            </span>
            <span className="material-symbols-outlined text-[22px] text-primary">payments</span>
          </div>
          <div className="font-headline-lg text-3xl text-on-surface mb-1">
            {isStatsLoading ? '—' : `₹ ${(adminStats?.totalRevenue || 0).toLocaleString('en-IN')}`}
          </div>
          <p className="text-xs text-on-surface-variant font-body-md">
            {isStatsError ? 'Revenue data is temporarily unavailable' : 'Verified payments only'}
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
              Total Orders
            </span>
            <span className="material-symbols-outlined text-[22px] text-primary">receipt_long</span>
          </div>
          <div className="font-headline-lg text-3xl text-on-surface mb-1">
            {isStatsLoading ? '—' : (adminStats?.totalOrders || 0).toLocaleString()}
          </div>
          <p className="text-xs text-on-surface-variant font-body-md">
            {adminStats?.pendingPayments || 0} awaiting payment
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
              Total Stock Units
            </span>
            <span className="material-symbols-outlined text-[22px] text-primary">inventory_2</span>
          </div>
          <div className="font-headline-lg text-3xl text-on-surface mb-1">
            {totalInventoryCount.toLocaleString()}
          </div>
          <p className="text-xs text-on-surface-variant font-body-md">
            Across {totalProductsCount} active jewelry pieces
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
              Stock Inflow ({days}d)
            </span>
            <span className="material-symbols-outlined text-[22px] text-emerald-600">add_circle</span>
          </div>
          <div className="font-headline-lg text-3xl text-emerald-700 mb-1">
            +
            {dailyChart
              .reduce((acc, d) => acc + (d.inflow || 0), 0)
              .toLocaleString()}
          </div>
          <p className="text-xs text-on-surface-variant font-body-md">Units added or restocked</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
              Stock Outflow ({days}d)
            </span>
            <span className="material-symbols-outlined text-[22px] text-rose-600">shopping_cart_checkout</span>
          </div>
          <div className="font-headline-lg text-3xl text-rose-700 mb-1">
            -
            {dailyChart
              .reduce((acc, d) => acc + (d.outflow || 0), 0)
              .toLocaleString()}
          </div>
          <p className="text-xs text-on-surface-variant font-body-md">Units sold via purchases</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <span className="material-symbols-outlined text-[22px] text-amber-600">warning</span>
          </div>
          <div className="font-headline-lg text-3xl text-amber-700 mb-1">
            {lowStockAlerts.length}
          </div>
          <p className="text-xs text-on-surface-variant font-body-md">
            {lowStockAlerts.length > 0 ? 'Requires immediate restock' : 'All levels healthy'}
          </p>
        </div>
      </div>

      {/* ── Daily Stock Movement Interactive Chart ── */}
      <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 md:p-8 rounded-xs shadow-xs">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 pb-4 border-b border-outline-variant/30">
          <div>
            <span className="font-label-caps text-xs text-primary uppercase tracking-widest block mb-1">
              Real-Time Inventory Movement
            </span>
            <h3 className="font-headline-md text-xl md:text-2xl text-on-surface">
              Daily Stock Inflow vs. Outflow Trend
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-label-caps text-on-surface-variant uppercase mr-1">Timeframe:</span>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs font-label-caps uppercase rounded-xs transition-colors cursor-pointer ${
                  days === d
                    ? 'bg-on-surface text-surface'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/40'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 mb-6 text-xs font-body-md">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-600 rounded-xs" />
            <span className="text-on-surface">Stock Inflow (Received / Restocked)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-rose-500 rounded-xs" />
            <span className="text-on-surface">Stock Outflow (Sold / Purchased)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-primary" />
            <span className="text-on-surface">Net Balance Variance</span>
          </div>
        </div>

        {/* SVG Chart */}
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-on-surface-variant">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-label-caps uppercase">Loading Stock Metrics...</p>
          </div>
        ) : dailyChart.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-on-surface-variant text-sm">
            No stock movements recorded in the last {days} days.
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-64 select-none min-w-[580px]"
            >
              {/* Background Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingY + usableHeight * (1 - ratio);
                const value = Math.round(maxVal * ratio);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#e5e2e1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="10"
                      fill="#80756b"
                      fontFamily="sans-serif"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {/* Zero baseline */}
              <line
                x1={paddingX}
                y1={paddingY + usableHeight}
                x2={chartWidth - paddingX}
                y2={paddingY + usableHeight}
                stroke="#80756b"
                strokeWidth="1"
              />

              {/* Bars for Each Day */}
              {dailyChart.map((d, idx) => {
                const x = paddingX + idx * pointWidth + pointWidth / 2;
                const barWidth = Math.max(6, Math.min(16, pointWidth / 3));

                const inflowHeight = (Math.max(0, d.inflow) / maxVal) * usableHeight;
                const outflowHeight = (Math.max(0, d.outflow) / maxVal) * usableHeight;

                const isHovered = hoveredPoint?.idx === idx;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredPoint({ ...d, idx, x })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Hover column background */}
                    <rect
                      x={paddingX + idx * pointWidth}
                      y={paddingY}
                      width={pointWidth}
                      height={usableHeight}
                      fill={isHovered ? '#75593a' : 'transparent'}
                      fillOpacity="0.06"
                    />

                    {/* Inflow Bar (Green) */}
                    {inflowHeight > 0 && (
                      <rect
                        x={x - barWidth - 1}
                        y={paddingY + usableHeight - inflowHeight}
                        width={barWidth}
                        height={inflowHeight}
                        fill="#059669"
                        rx="2"
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Outflow Bar (Red) */}
                    {outflowHeight > 0 && (
                      <rect
                        x={x + 1}
                        y={paddingY + usableHeight - outflowHeight}
                        width={barWidth}
                        height={outflowHeight}
                        fill="#e11d48"
                        rx="2"
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Date Label on X Axis */}
                    {(dailyChart.length <= 14 || idx % Math.ceil(dailyChart.length / 10) === 0) && (
                      <text
                        x={x}
                        y={chartHeight - 4}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#80756b"
                        fontFamily="sans-serif"
                      >
                        {d.date}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Net Trend Line Overlay */}
              {dailyChart.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#75593a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={dailyChart
                    .map((d, idx) => {
                      const x = paddingX + idx * pointWidth + pointWidth / 2;
                      const netClamped = Math.max(0, Math.min(maxVal, d.inflow - d.outflow + maxVal / 2));
                      const y = paddingY + usableHeight - (netClamped / maxVal) * usableHeight;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}
            </svg>

            {/* Hover Tooltip Card */}
            {hoveredPoint && (
              <div
                className="absolute bg-surface-container-highest border border-outline p-3 rounded-xs shadow-lg text-xs z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: '45px',
                }}
              >
                <div className="font-semibold text-on-surface border-b border-outline-variant/60 pb-1 mb-1">
                  {hoveredPoint.date}
                </div>
                <div className="text-emerald-700 font-medium">Inflow: +{hoveredPoint.inflow} units</div>
                <div className="text-rose-700 font-medium">Outflow: -{hoveredPoint.outflow} units</div>
                <div className="text-primary font-bold pt-1">
                  Net: {hoveredPoint.net > 0 ? `+${hoveredPoint.net}` : hoveredPoint.net} units
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Low Stock Warnings & Recent Movements ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Low Stock Alerts */}
        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-amber-600">warning</span>
              <h4 className="font-headline-sm text-lg text-on-surface">Low Stock Alerts (≤ 5 units)</h4>
            </div>
            <span className="font-label-caps text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
              {lowStockAlerts.length} items
            </span>
          </div>

          {lowStockAlerts.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-6 text-center italic">
              All inventory levels are currently above reorder thresholds.
            </p>
          ) : (
            <div className="divide-y divide-outline-variant/20">
              {lowStockAlerts.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-on-surface block">{item.name}</span>
                    <span className="text-on-surface-variant">ID: #{item.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-700 block">{item.stock} in stock</span>
                    <span className="text-[10px] text-amber-800 font-label-caps uppercase">Restock Soon</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Stock Inflow/Outflow Log */}
        <div className="bg-surface-container-lowest border border-outline-variant/50 p-6 rounded-xs shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-outline-variant/30">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">history</span>
              <h4 className="font-headline-sm text-lg text-on-surface">Recent Stock Activity Log</h4>
            </div>
          </div>

          {recentMovements.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-6 text-center italic">
              No stock transactions recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-outline-variant/20 max-h-80 overflow-y-auto pr-1">
              {recentMovements.slice(0, 8).map((m) => {
                const isInflow = m.movement_type === 'IN' || m.movement_type === 'RETURN';
                return (
                  <div key={m.id} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-on-surface block">{m.product_name}</span>
                      <span className="text-on-surface-variant text-[11px]">
                        {m.reason || (isInflow ? 'Stock Restock' : 'Customer Purchase')} •{' '}
                        {new Date(m.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold ${
                          isInflow ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isInflow ? `+${m.quantity}` : `-${m.quantity}`} units
                      </span>
                      <span className="text-[10px] text-on-surface-variant block">
                        Bal: {m.balance_after}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminStockChart;
