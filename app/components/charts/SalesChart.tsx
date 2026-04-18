"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

type TimeRange = "week" | "month" | "year";
type ChartType = "area" | "bar";

interface SalesDataPoint {
  date: string;
  sales: number;
  units: number;
}

interface SalesChartProps {
  apiEndpoint: string;
  title?: string;
  walletAddress?: string;
}

export function SalesChart({
  apiEndpoint,
  title = "Sales Analytics",
  walletAddress,
}: SalesChartProps) {
  const [data, setData] = useState<SalesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [totalSales, setTotalSales] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const url = new URL(apiEndpoint, window.location.origin);
        url.searchParams.set("range", timeRange);

        const headers: Record<string, string> = {};
        if (walletAddress) {
          headers["x-wallet-address"] = walletAddress;
        }

        const res = await fetch(url.toString(), { headers });
        if (res.ok) {
          const result = await res.json();
          setData(result.data || []);
          setTotalSales(result.totalSales || 0);
          setTotalUnits(result.totalUnits || 0);
        }
      } catch (err) {
        console.error("Failed to fetch sales data:", err);
        // Generate mock data for demo
        setData(generateMockData(timeRange));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [apiEndpoint, timeRange, walletAddress]);

  function generateMockData(range: TimeRange): SalesDataPoint[] {
    const points: SalesDataPoint[] = [];
    const now = new Date();
    const daysBack = range === "week" ? 7 : range === "month" ? 30 : 365;

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const baseValue = Math.floor(Math.random() * 50) + 20;
      points.push({
        date:
          range === "year"
            ? date.toLocaleDateString("en-US", { month: "short" })
            : date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
        sales: baseValue * 100,
        units: baseValue,
      });
    }

    // Aggregate by week/month for larger ranges
    if (range === "month") {
      const aggregated: SalesDataPoint[] = [];
      for (let i = 0; i < points.length; i += 7) {
        const week = points.slice(i, i + 7);
        aggregated.push({
          date: week[0].date,
          sales: week.reduce((sum, p) => sum + p.sales, 0),
          units: week.reduce((sum, p) => sum + p.units, 0),
        });
      }
      return aggregated;
    }

    if (range === "year") {
      const monthlyMap: Record<string, { sales: number; units: number }> = {};
      for (const point of points) {
        if (!monthlyMap[point.date]) {
          monthlyMap[point.date] = { sales: 0, units: 0 };
        }
        monthlyMap[point.date].sales += point.sales;
        monthlyMap[point.date].units += point.units;
      }
      return Object.entries(monthlyMap).map(([date, vals]) => ({
        date,
        ...vals,
      }));
    }

    return points;
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-xs text-zinc-500">
              Total:{" "}
              <span className="text-zinc-300 font-medium">
                {totalUnits.toLocaleString()} units
              </span>
            </p>
            <p className="text-xs text-zinc-500">
              Revenue:{" "}
              <span className="text-emerald-400 font-medium">
                ${totalSales.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            {(["week", "month", "year"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Chart type selector */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            <button
              onClick={() => setChartType("area")}
              className={`p-1.5 rounded-md transition-colors ${
                chartType === "area"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Area chart"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16"
                />
              </svg>
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`p-1.5 rounded-md transition-colors ${
                chartType === "bar"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Bar chart"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#10b981" }}
              />
              <Area
                type="monotone"
                dataKey="units"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#27272a" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#10b981" }}
              />
              <Bar dataKey="units" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
