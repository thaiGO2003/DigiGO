import { useState } from 'react'
import { X, Key, Check } from 'lucide-react'

interface FormatMessageModalProps {
    isOpen: boolean
    onClose: () => void
    onSend: (message: string) => void
}

export default function FormatMessageModal({ isOpen, onClose, onSend }: FormatMessageModalProps) {
    const [activeTab, setActiveTab] = useState<'cursor'>('cursor')
    const [formData, setFormData] = useState({
        key: '',
        tokenKey: ''
    })

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        // Validate
        if (!formData.key.trim() || !formData.tokenKey.trim()) {
            alert('Vui lòng nhập đầy đủ Key và Token key')
            return
        }

        // Construct message
        // Format:
        // Key: <value>
        // Token key: <value>
        const message = `Key: ${formData.key.trim()}\nToken key: ${formData.tokenKey.trim()}`
        
        onSend(message)
        
        // Reset and close
        setFormData({ key: '', tokenKey: '' })
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Key className="h-5 w-5 text-blue-600" />
                        Gửi tin nhắn định dạng
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'cursor'
                                ? 'border-blue-600 text-blue-600 bg-blue-50'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab('cursor')}
                    >
                        Cursor
                    </button>
                    {/* Add more tabs here if needed */}
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {activeTab === 'cursor' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Key
                                </label>
                                <input
                                    type="text"
                                    value={formData.key}
                                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                    placeholder="Nhập giá trị Key..."
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Token key
                                </label>
                                <input
                                    type="text"
                                    value={formData.tokenKey}
                                    onChange={(e) => setFormData({ ...formData, tokenKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                    placeholder="Nhập giá trị Token key..."
                                />
                            </div>
                        </>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Gửi ngay
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
