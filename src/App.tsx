import { useState } from 'react'
import Header from './components/Header'
import ProductsPage from './components/ProductsPage'
import TopUpPage from './components/TopUpPage'
import PurchasedPage from './components/PurchasedPage'
import AboutPage from './components/AboutPage'
import AdminPage from './components/AdminPage'
import ProfilePage from './components/ProfilePage'
import ReferralPage from './components/ReferralPage'
import ChatWidget from './components/ChatWidget'
import { useAuth } from './hooks/useAuth'

function App() {
  const [currentPage, setCurrentPage] = useState('products')
  const { user, loading } = useAuth()

  // Check if user is admin
  const isAdmin = user?.email === 'luongquocthai.thaigo.2003@gmail.com' || user?.is_admin

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
      {isAdmin && (
        <button
          onClick={() => setCurrentPage('admin')}
          className="fixed bottom-20 left-6 bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors z-40"
          title="Admin Panel"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      <ChatWidget />
    </div>
  )
}

export default App