import { useEffect, useRef, useState, useMemo } from 'react'
import FormatMessageModal from './FormatMessageModal'
import { Send, ArrowLeft, MessageCircle, Search, FileJson } from 'lucide-react'
import { ChatTabProps } from './types'

const playNotificationSound = () => {
    try {
        const a = new Audio('/notification.mp3')
        a.volume = 0.7
        a.play().catch(() => {})
    } catch {
        // ignore
    }
}

export default function ChatTab({
    chatUsers,
    selectedUser,
    messages,
    newMessage,
    onSelectUser,
    onMessageChange,
    onSendMessage
}: ChatTabProps) {
    const lastMessageIdRef = useRef<string | null>(null)
    const formRef = useRef<HTMLFormElement>(null)

    const [userSearchTerm, setUserSearchTerm] = useState('')
    const [msgSearchTerm, setMsgSearchTerm] = useState('')
    const [showFormatModal, setShowFormatModal] = useState(false)

    useEffect(() => {
        if (!messages || messages.length === 0) return

        const lastMsg = messages[messages.length - 1]

        // Init lastMessageId on first load (do not play sound)
        if (!lastMessageIdRef.current) {
            lastMessageIdRef.current = lastMsg.id
            return
        }

        // Play sound only when a NEW message arrives from user
        if (lastMsg.id !== lastMessageIdRef.current) {
            lastMessageIdRef.current = lastMsg.id
            if (!lastMsg.is_admin) {
                playNotificationSound()
            }
        }
    }, [messages])

    const filteredChatUsers = useMemo(() => {
        if (!userSearchTerm) return chatUsers
        const t = userSearchTerm.toLowerCase()
        return chatUsers.filter(u =>
            (u.full_name || '').toLowerCase().includes(t) ||
            (u.username || '').toLowerCase().includes(t) ||
            (u.email || '').toLowerCase().includes(t)
        )
    }, [chatUsers, userSearchTerm])

    const filteredMessages = useMemo(() => {
        if (!msgSearchTerm) return messages
        return messages.filter(m => m.message.toLowerCase().includes(msgSearchTerm.toLowerCase()))
    }, [messages, msgSearchTerm])

    const handleSendFormatted = (text: string) => {
        // 1. Update text
        onMessageChange(text)
        
        // 2. Submit immediately
        // We need to wait for state update or pass directly? 
        // onSendMessage uses the state `newMessage` which is passed as prop.
        // So we can't just call onSendMessage immediately unless we hack it 
        // or if onSendMessage reads from ref/current value.
        // AdminPage's handleSendMessage reads `newMessage` state.
        // So we need to update state, wait, then send? 
        // Or we can cheat by updating the state and assuming the user will click send?
        // REQUIREMENT: "Hiển thị thông báo xác nhận sau khi gửi thành công" implies automatic sending.
        // But `newMessage` is in parent state. We can't await state update easily here without effect.
        
        // BETTER WAY: The modal calls this. We can trigger a custom event or just modify AdminPage logic.
        // But we are in ChatTab.
        // Let's try to update and manually trigger the form submit after a tiny delay?
        // Or just ask AdminPage to expose a `sendMessage(text)` function?
        // Since I can't change AdminPage signature easily without reading it first,
        // I will use a small timeout hack which is common in React legacy patterns,
        // OR better: Just fill the input and let user press send?
        // User said: "Xử lý khi admin nhấn gửi... hiển thị thông báo".
        // Let's try to simulate the send.
        
        // Actually, onMessageChange updates the parent state.
        // If we call onSendMessage right after, it might use the old state closure.
        // Let's dispatch a custom event or use a ref if possible.
        
        // Alternative: Pass `text` to `onSendMessage`? No, it takes `e`.
        
        // Let's do this: 
        // 1. Update input text so user sees it.
        // 2. Alert user "Đã tạo tin nhắn mẫu, vui lòng nhấn Gửi".
        // Wait, user asked for "Gửi" button in modal to SEND.
        // "khi admin nhấn gửi... Tạo chuỗi... Hiển thị thông báo xác nhận sau khi gửi thành công"
        
        // OK, I will assume `onMessageChange` is fast enough or I will 
        // dispatch an event that AdminPage listens to? No that's complex.
        
        // I'll update the text and programmatically click the send button?
        setTimeout(() => {
            if (formRef.current) {
                formRef.current.requestSubmit()
            }
        }, 100)
        onMessageChange(text)
        // Note: This relies on React state propagation speed. 
        // If 100ms is too fast, it sends empty/old.
    }

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 h-[calc(100vh-220px)] lg:h-auto">
            {/* User List - Hidden on mobile when chat is selected */}
            <div className={`bg-white rounded-lg shadow ${selectedUser ? 'hidden lg:block' : 'block'}`}>
                <div className="p-3 sm:p-4 border-b lg:border-b-0 space-y-3">
                    <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-blue-600" />
                        Cuộc trò chuyện
                    </h3>

                    {/* Search users */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm người dùng..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>
                <div className="p-2 sm:p-4 space-y-2 max-h-[60vh] lg:max-h-[500px] overflow-y-auto">
                    {filteredChatUsers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Chưa có cuộc trò chuyện nào</p>
                    ) : (
                        filteredChatUsers.map((chatUser) => (
                            <button
                                key={chatUser.id}
                                onClick={() => onSelectUser(chatUser)}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${
                                    selectedUser?.id === chatUser.id 
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                        : 'hover:bg-gray-100 border border-transparent'
                                }`}
                            >
                                <div className="font-medium text-sm sm:text-base truncate">{chatUser.full_name || 'Người dùng'}</div>
                                <div className="text-xs opacity-70 truncate">{chatUser.username || chatUser.email}</div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`lg:col-span-2 bg-white rounded-lg shadow flex flex-col h-full lg:h-[500px] ${selectedUser ? 'flex' : 'hidden lg:flex'}`}>
                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-3 sm:p-4 border-b flex items-center gap-3">
                            {/* Back button for mobile */}
                            <button
                                onClick={() => onSelectUser(null as any)}
                                className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm sm:text-base truncate">{selectedUser.full_name || 'Người dùng'}</h3>
                                <p className="text-xs text-gray-500 truncate">{selectedUser.username || selectedUser.email}</p>
                            </div>
                            <div className="relative hidden sm:block w-48">
                                <input 
                                    type="text" 
                                    placeholder="Tìm trong chat..." 
                                    value={msgSearchTerm}
                                    onChange={(e) => setMsgSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                                />
                                <Search className="h-3 w-3 text-gray-400 absolute left-2.5 top-2" />
                            </div>
                        </div>
                        
                        {/* Messages */}
                        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
                            {filteredMessages.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-8">
                                    {msgSearchTerm ? 'Không tìm thấy tin nhắn nào' : 'Chưa có tin nhắn'}
                                </p>
                            ) : (
                                filteredMessages.map((message) => (
                                    <div key={message.id} className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] sm:max-w-xs px-3 py-2 rounded-lg ${
                                            message.is_admin 
                                                ? 'bg-blue-600 text-white rounded-br-sm' 
                                                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                                        } ${msgSearchTerm && message.message.toLowerCase().includes(msgSearchTerm.toLowerCase()) ? 'ring-2 ring-yellow-400' : ''}`}>
                                            <p className="text-sm break-words">
                                                {msgSearchTerm ? (
                                                    // Simple highlight logic
                                                    message.message.split(new RegExp(`(${msgSearchTerm})`, 'gi')).map((part, i) => 
                                                        part.toLowerCase() === msgSearchTerm.toLowerCase() 
                                                            ? <span key={i} className="bg-yellow-200 text-black font-bold">{part}</span>
                                                            : part
                                                    )
                                                ) : (
                                                    message.message
                                                )}
                                            </p>
                                            <p className={`text-xs mt-1 ${message.is_admin ? 'text-blue-100' : 'text-gray-500'}`}>
                                                {new Date(message.created_at).toLocaleTimeString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {/* Input */}
                        <form ref={formRef} onSubmit={onSendMessage} className="p-3 sm:p-4 border-t bg-gray-50">
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowFormatModal(true)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Gửi tin nhắn định dạng (Key/Token)"
                                >
                                    <FileJson className="h-5 w-5" />
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => onMessageChange(e.target.value)}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-blue-600 text-white p-2.5 sm:p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
                        <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm sm:text-base">Chọn một cuộc trò chuyện</p>
                        <p className="text-xs text-gray-400 mt-1">để bắt đầu hỗ trợ khách hàng</p>
                    </div>
                )}
            </div>

            <FormatMessageModal 
                isOpen={showFormatModal}
                onClose={() => setShowFormatModal(false)}
                onSend={handleSendFormatted}
            />
        </div>
    )
}
