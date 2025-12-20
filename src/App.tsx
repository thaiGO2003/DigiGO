import { useState } from 'react'
import Header from './components/Header'
import ProductsPage from './components/ProductsPage'
import TopUpPage from './components/TopUpPage'
import PurchasedPage from './components/PurchasedPage'
import AboutPage from './components/AboutPage'
import AdminPage from './components/AdminPage'
import ProfilePage from './components/ProfilePage'
import ReferralPage from './components/ReferralPage'
import PaymentReturnPage from './components/PaymentReturnPage'
import ChatWidget from './components/ChatWidget'
import { useAuth } from './hooks/useAuth'

function App() {
  const [currentPage, setCurrentPage] = useState('products')
  const { user, loading } = useAuth()

  // Check if user is admin
  const isAdmin = user?.email?.toLowerCase() === 'luongquocthai.thaigo.2003@gmail.com' || user?.is_admin

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'products':
        return <ProductsPage />
      case 'topup':
        return <TopUpPage />
      case 'purchased':
        return <PurchasedPage />
      case 'referral':
        return <ReferralPage />
      case 'about':
        return <AboutPage />
      case 'admin':
        return <AdminPage />
      case 'profile':
        return <ProfilePage />
      case 'payment-return':
        return <PaymentReturnPage onNavigate={(page) => setCurrentPage(page)} />
      default:
        return <ProductsPage />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentPage={currentPage}
        onNavigate={(page) => {
          // Special handling for admin route
          if (page === 'admin') {
            if (isAdmin) {
              setCurrentPage(page)
            }
          } else {
            setCurrentPage(page)
          }
        }}
      />

      <main className="pb-20">
        {renderPage()}
      </main>

      {/* Admin Access - Hidden button for the specified admin email */}
      {/* Button removed as requested */}

      <ChatWidget />
    </div>
  )
}

export default App