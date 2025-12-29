import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import ProductsPage from './components/ProductsPage'
import TopUpPage from './components/TopUpPage'
import PurchasedPage from './components/PurchasedPage'
import AdminPage from './components/AdminPage'
import UtilitiesPage from './components/UtilitiesPage'
import ProfilePage from './components/ProfilePage'

import PaymentReturnPage from './components/PaymentReturnPage'
import ChatWidget from './components/ChatWidget'
import RecentPurchasesNotification from './components/RecentPurchasesNotification'
import SnowEffect from './components/SnowEffect'
import { useAuth } from './hooks/useAuth'
import { useEffect } from 'react'
import { setupAntiDebug } from './lib/antiDebug'

function App() {
  const { user, loading, isRetrying, retryCount } = useAuth()
  
  useEffect(() => {
    const cleanup = setupAntiDebug()
    return () => { cleanup && cleanup() }
  }, [])

  // Check if user is admin
  const isAdmin = user?.email?.toLowerCase() === 'luongquocthai.thaigo.2003@gmail.com' || user?.is_admin

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        {isRetrying && (
          <div className="text-center">
            <p className="text-gray-600 font-medium">Đang kết nối lại...</p>
            <p className="text-sm text-gray-400">Lần thử {retryCount + 1}/3</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="pb-20">
          <Routes>
            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/topup" element={<TopUpPage />} />
            <Route path="/purchased" element={<PurchasedPage />} />

            <Route
              path="/admin"
              element={isAdmin ? <AdminPage /> : <Navigate to="/products" replace />}
            />
            <Route path="/utilities" element={<UtilitiesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/payment-return" element={<PaymentReturnPage />} />
            <Route path="*" element={<Navigate to="/products" replace />} />
          </Routes>
        </main>

        <ChatWidget />
        <RecentPurchasesNotification />
        <SnowEffect />
      </div>
    </Router>
  )
}

export default App
