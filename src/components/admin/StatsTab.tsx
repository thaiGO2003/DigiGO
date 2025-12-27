import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Calendar, TrendingUp, TrendingDown, BarChart2, DollarSign, Package, PiggyBank } from 'lucide-react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import { StatsTabProps } from './types'

interface StatsData {
    revenue: number
    cost: number
    profit: number
    deposits: number
    productSold: number
    bestSellers: { name: string; count: number; productId?: string }[]
    dailyStats: { date: string; revenue: number; deposits: number }[]
}

export default function StatsTab({ onNavigateToTransactions, onNavigateToProducts }: StatsTabProps) {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().substring(0, 10)
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().substring(0, 10))
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState<StatsData | null>(null)

    useEffect(() => {
        fetchStats()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchStats = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('amount, type, created_at, cost_price, product_variants(name, product_id), users(is_admin, email)')
                .eq('status', 'completed')
                .gte('created_at', `${startDate} 00:00:00`)
                .lte('created_at', `${endDate} 23:59:59`)
                .order('created_at', { ascending: true })

            if (error) throw error

            let revenue = 0
            let cost = 0
            let deposits = 0
            const productCounter: Record<string, { name: string; count: number; productId?: string }> = {}
            const dailyStatsMap: Record<string, { date: string; revenue: number; deposits: number; profit: number }> = {}

            // Initialize daily stats map with all dates in range
            const start = new Date(startDate)
            const end = new Date(endDate)
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().substring(0, 10)
                dailyStatsMap[dateStr] = { date: dateStr, revenue: 0, deposits: 0, profit: 0 }
            }

            (data || []).forEach((tx: any) => {
                const dateStr = new Date(tx.created_at).toISOString().substring(0, 10)
                const isAdmin = tx.users?.is_admin || tx.users?.email === 'luongquocthai.thaigo.2003@gmail.com'
                
                // Ensure date exists in map (for safety if date logic is slightly off)
                if (!dailyStatsMap[dateStr]) {
                    dailyStatsMap[dateStr] = { date: dateStr, revenue: 0, deposits: 0, profit: 0 }
                }

                if (tx.type === 'purchase') {
                    // Only count purchases from NON-ADMIN users for Revenue/Cost/Profit
                    if (!isAdmin) {
                        const amount = Math.abs(tx.amount)
                        const txCost = tx.cost_price || 0
                        
                        revenue += amount
                        cost += txCost
                        
                        dailyStatsMap[dateStr].revenue += amount
                        dailyStatsMap[dateStr].profit += (amount - txCost)
                    }
                    
                    // Product count: Should we count admin purchases? 
                    // "trang thống kê sẽ không thống kê những cái gì liên quan user admin"
                    // So exclude from best sellers too.
                    if (!isAdmin) {
                        const vName = tx.product_variants?.name || 'Khác'
                        const pId = tx.product_variants?.product_id
                        if (!productCounter[vName]) productCounter[vName] = { name: vName, count: 0, productId: pId }
                        productCounter[vName].count += 1
                    }
                } else if (tx.type === 'top_up') {
                    if (!isAdmin) {
                        deposits += tx.amount
                        dailyStatsMap[dateStr].deposits += tx.amount
                    }
                }
            })

            const bestSellers = Object.values(productCounter).sort((a, b) => b.count - a.count).slice(0, 5)
            const dailyStats = Object.values(dailyStatsMap).sort((a, b) => a.date.localeCompare(b.date))

            setStats({ 
                revenue, 
                cost,
                profit: revenue - cost,
                deposits, 
                productSold: Object.values(productCounter).reduce((s, p) => s + p.count, 0), 
                bestSellers,
                dailyStats
            })
        } catch (e) {
            console.error('Error fetching stats', e)
        } finally {
            setLoading(false)
        }
    }

    const handleApply = () => {
        fetchStats()
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">{new Date(label).toLocaleDateString('vi-VN')}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name === 'revenue' ? 'Doanh thu' : 'Tiền nạp'}: {entry.value.toLocaleString('vi-VN')}đ
                        </p>
                    ))}
                    <p className="text-xs text-gray-500 mt-2 italic">Nhấn để xem chi tiết</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="space-y-6">
            {/* Date Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <label className="flex items-center gap-2 text-sm flex-1">
                        <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 whitespace-nowrap">Từ</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm flex-1">
                        <span className="text-gray-700 whitespace-nowrap">Đến</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </label>
                    <button
                        onClick={handleApply}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium text-sm sm:text-base"
                    >
                        {loading ? 'Đang tải...' : 'Áp dụng'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : stats ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                        <StatCard 
                            title="Tổng doanh thu" 
                            value={stats.revenue} 
                            color="emerald" 
                            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
                        />
                        <StatCard 
                            title="Tổng chi phí" 
                            value={stats.cost} 
                            color="red" 
                            icon={<TrendingDown className="h-5 w-5 text-red-600" />}
                        />
                        <StatCard 
                            title="Lợi nhuận" 
                            value={stats.profit} 
                            color="cyan" 
                            icon={<PiggyBank className="h-5 w-5 text-cyan-600" />}
                        />
                        <StatCard 
                            title="Tổng tiền nạp" 
                            value={stats.deposits} 
                            color="blue" 
                            icon={<BarChart2 className="h-5 w-5 text-blue-600" />}
                        />
                        <StatCard 
                            title="Sản phẩm đã bán" 
                            value={stats.productSold} 
                            color="purple" 
                            isCurrency={false} 
                            icon={<Package className="h-5 w-5 text-purple-600" />}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
                             <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Biểu đồ Doanh thu & Lợi nhuận</h3>
                             <div className="h-[250px] sm:h-[300px] w-full -ml-2 sm:ml-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={stats.dailyStats}
                                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                        onClick={(e) => {
                                            if (e && e.activeLabel) {
                                                onNavigateToTransactions?.(String(e.activeLabel))
                                            }
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis 
                                            dataKey="date" 
                                            tickFormatter={(str) => new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                            tick={{ fontSize: 10, fill: '#6b7280' }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis 
                                            tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${(value / 1000).toFixed(0)}K`}
                                            tick={{ fontSize: 10, fill: '#6b7280' }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={45}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Area 
                                            type="monotone" 
                                            dataKey="revenue" 
                                            name="revenue"
                                            stroke="#10b981" 
                                            fillOpacity={1} 
                                            fill="url(#colorRevenue)" 
                                            strokeWidth={2}
                                            activeDot={{ r: 6 }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="profit" 
                                            name="profit"
                                            stroke="#06b6d4" 
                                            fillOpacity={1} 
                                            fill="url(#colorProfit)" 
                                            strokeWidth={2}
                                            activeDot={{ r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                             </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm h-fit">
                            <h4 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                                <TrendingUp className="h-4 w-4 text-purple-600" />
                                Top Bán chạy
                            </h4>
                            {stats.bestSellers.length === 0 ? (
                                <p className="text-xs sm:text-sm text-gray-500">Không có dữ liệu</p>
                            ) : (
                                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                                    {stats.bestSellers.map((p, i) => (
                                        <li 
                                            key={p.name} 
                                            className={`flex justify-between items-center py-1 border-b border-gray-100 last:border-0 ${p.productId ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                            onClick={() => p.productId && onNavigateToProducts?.(p.productId)}
                                        >
                                            <span className="text-gray-700 truncate max-w-[100px] sm:max-w-[120px]" title={p.name}>{i + 1}. {p.name}</span>
                                            <span className="font-medium text-gray-900 bg-purple-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs">{p.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    )
}

function StatCard({ title, value, color = 'blue', isCurrency = true, icon }: { title: string; value: number; color?: string; isCurrency?: boolean; icon?: React.ReactNode }) {
    const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700' },
        red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700' },
        cyan: { bg: 'bg-cyan-50', border: 'border-cyan-100', text: 'text-cyan-700' },
    }

    const classes = colorClasses[color] || colorClasses.blue

    return (
        <div className={`bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm flex flex-col justify-between`}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
                <div className={`p-1.5 sm:p-2 rounded-lg ${classes.bg}`}>
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {isCurrency ? value.toLocaleString('vi-VN') + 'đ' : value.toLocaleString('vi-VN')}
                </p>
            </div>
        </div>
    )
}
