import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CursorTab, ProgramsTab } from './utilities'

export default function UtilitiesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'cursor' | 'programs'>('cursor')

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash === 'programs') {
      setActiveTab('programs')
    } else if (hash === 'cursor') {
      setActiveTab('cursor')
    }
  }, [location.hash])

  const handleTabChange = (tab: 'cursor' | 'programs') => {
    setActiveTab(tab)
    navigate(`#${tab}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tiện ích & Phần mềm</h1>
        <p className="mt-2 text-gray-600">Các công cụ và phần mềm hỗ trợ được chia sẻ miễn phí</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => handleTabChange('cursor')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'cursor'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cursor
          </button>
          <button
            onClick={() => handleTabChange('programs')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'programs'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Chương trình
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'cursor' ? (
          <CursorTab />
        ) : (
          <ProgramsTab />
        )}
      </div>
    </div>
  )
}
