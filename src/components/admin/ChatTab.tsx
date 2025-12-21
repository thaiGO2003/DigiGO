import { Send } from 'lucide-react'
import { ChatTabProps } from './types'

export default function ChatTab({
    chatUsers,
    selectedUser,
    messages,
    newMessage,
    onSelectUser,
    onMessageChange,
    onSendMessage
}: ChatTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">Cuộc trò chuyện</h3>
                <div className="space-y-2">
                    {chatUsers.map((chatUser) => (
                        <button
                            key={chatUser.id}
                            onClick={() => onSelectUser(chatUser)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${selectedUser?.id === chatUser.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                                }`}
                        >
                            <div className="font-medium">{chatUser.full_name || 'Người dùng'}</div>
                            <div className="text-xs opacity-70">{chatUser.username || chatUser.email}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col h-96">
                {selectedUser ? (
                    <>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold">{selectedUser.full_name || 'Người dùng'}</h3>
                            <p className="text-xs text-gray-500">{selectedUser.username || selectedUser.email}</p>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto space-y-3">
                            {messages.map((message) => (
                                <div key={message.id} className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs px-3 py-2 rounded-lg ${message.is_admin ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}>
                                        <p className="text-sm">{message.message}</p>
                                        <p className={`text-xs mt-1 ${message.is_admin ? 'text-blue-100' : 'text-gray-500'}`}>
                                            {new Date(message.created_at).toLocaleTimeString('vi-VN')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={onSendMessage} className="p-4 border-t">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => onMessageChange(e.target.value)}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-gray-500">Chọn một cuộc trò chuyện</p>
                    </div>
                )}
            </div>
        </div>
    )
}
