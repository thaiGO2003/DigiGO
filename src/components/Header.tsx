import { useState } from 'react'
import { User, LogOut, Menu, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

export default function Header() {
  const { user, signOut, isInitializing } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Current page based on location path
  const currentPage = location.pathname.substring(1) || 'products'

  // Check if user is admin
  const isAdmin = user?.email?.toLowerCase() === 'luongquocthai.thaigo.2003@gmail.com' || user?.is_admin

  const menuItems = [
    { key: 'products', label: 'Sản phẩm' },
    { key: 'topup', label: 'Nạp tiền' },

    { key: 'about', label: 'Về chúng tôi' },
    ...(isAdmin ? [{ key: 'admin', label: 'Quản lý' }] : []),
  ]

  const handleNavigation = (page: string) => {
    // Wait for auth to initialize before making navigation decisions
    if (isInitializing) return

    if ((page === 'purchased' || page === 'topup' || page === 'admin') && !user) {
      setShowAuthModal(true)
      return
    }
    if (page === 'admin' && !isAdmin) {
      return // Don't allow non-admin access
    }
    navigate(`/${page}`)
    setMobileMenuOpen(false)
  }

  const handleAccountAction = () => {
    if (user) {
      signOut()
    } else {
      setShowAuthModal(true)
    }
  }

  return (
    <>
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/products')}
            >
              <img
                src="/logo.png"
                alt="DigiGO"
                className="h-8 w-8 rounded-full object-cover mr-2"
              />
              <span className="text-xl font-bold text-gray-900">DigiGO</span>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex space-x-8">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNavigation(item.key)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${currentPage === item.key
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* User Info & Auth */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {user && (
                <div
                  onClick={() => navigate('/profile')}
                  className="hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  title="Xem trang cá nhân"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-start mr-2">
                    <span className="text-sm font-semibold text-gray-900 leading-none">
                      {user.full_name || 'Người dùng'}
                    </span>
                    <span className="text-xs text-blue-600 font-medium leading-none mt-1">
                      {user.balance.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              )}

              {/* Zalo Button */}
              <a
                href="https://zalo.me/g/xjqyly291"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center justify-center p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="Tham gia nhóm Zalo"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg"
                  alt="Zalo"
                  className="w-6 h-6"
                />
              </a>

              <button
                onClick={handleAccountAction}
                className="flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                title={user ? "Đăng xuất" : "Đăng nhập"}
              >
                {user ? (
                  <LogOut className="h-5 w-5" />
                ) : (
                  <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <User className="h-5 w-5" />
                    <span>Đăng nhập</span>
                  </div>
                )}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <nav className="flex flex-col space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleNavigation(item.key)}
                    className={`px-3 py-2 rounded-md text-left text-sm font-medium transition-colors duration-200 ${currentPage === item.key
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
                {user && (
                  <>
                    <button
                      onClick={() => handleNavigation('profile')}
                      className={`px-3 py-2 rounded-md text-left text-sm font-medium transition-colors duration-200 ${currentPage === 'profile'
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                    >
                      Hồ sơ cá nhân
                    </button>
                    <div className="px-3 py-2 border-t border-gray-200 mt-2 pt-4">
                      <span className="text-sm text-gray-600">Số dư: </span>
                      <span className="font-bold text-blue-600">
                        {user.balance.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  )
}