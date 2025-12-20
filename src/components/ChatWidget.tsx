import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, User } from 'lucide-react'
import { supabase, ChatMessage } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { sendTelegramNotification } from '../lib/telegram'
import AuthModal from './AuthModal'

export default function ChatWidget() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (user && isOpen) {
      fetchMessages()
      subscribeToMessages()
    }
  }, [user, isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Create notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2i78OeeSwkNUKrkwXkqBSh+zPLaizsKEle06umrVhgLUKXh8bllGgU2jdXxxn0tBSh+zvHajzsKEla56++lWRgLUKHk8L1nHwU3i9bwxn4tBSd+zfHYjTsKElW36+ypWxkLT6Hk7sBoHwc5jNXxxX0tBSZ/zPHWjzoKEVa15++pWxkLTqDl7cBpIQc5i9XwxH4sBSV/y/HWjjoKEFS05O+qXRkLTaDl7L9qIQc5i9TwxH4sBCV/y/HWjToKEVS04++rXRkLTKDl7L9qIQc5i9TwxH0rBSR/y/HWjToKD1S04e+rXhkLTKDl675rIAc5i9TwxH0rBSR/y/HWjToKD1S04e+rXhkLTKDl675rIAc5i9TwxH0rBSR/y/HWjToKD1S04e+rXhkLTKDl675rIAc5i9TwxH0rBSR/y/HWjToKD1S04e+rXhkLTKDl675rIAc5i9TwxH0rBSR/y/HWjToKD1S04e+rXhkLTKDl675rIAc5i9TwxH0rBSR/y/HWjToKD1S04e+rXhkL')
  }, [])

  const fetchMessages = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const subscribeToMessages = () => {
    if (!user) return

    const channel = supabase
      .channel(`chat:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages(prev => [...prev, newMsg])
          
          // If message from admin and chat is closed, play sound and increase unread
          if (newMsg.is_admin && !isOpen) {
            setUnreadCount(prev => prev + 1)
            audioRef.current?.play().catch(err => console.log('Audio play failed:', err))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || loading) return

    if (!user) {
      setShowAuthModal(true)
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: newMessage.trim(),
          is_admin: false
        })

      if (error) throw error
      
      // Send Telegram notification if user is not admin
      if (user.email !== 'luongquocthai.thaigo.2003@gmail.com') {
        const telegramMsg = `<b>Tin nhắn mới từ khách hàng:</b>\n\nUser: ${user.email}\nNội dung: ${newMessage.trim()}`
        sendTelegramNotification(telegramMsg)
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleToggle = () => {
    if (!isOpen && !user) {
      setShowAuthModal(true)
      return
    }
    setIsOpen(!isOpen)
    if (!isOpen) {
      setUnreadCount(0) // Reset unread when opening chat
    }
  }

  return (
    <>
      {/* Chat Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          <button
            onClick={handleToggle}
            className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          >
            {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </button>
          {unreadCount > 0 && !isOpen && (
            <div className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white rounded-lg shadow-xl border z-40 flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <h3 className="font-semibold">Hỗ trợ khách hàng</h3>
            <p className="text-sm opacity-90">
              {user ? 'Chúng tôi sẽ phản hồi sớm nhất có thể' : 'Vui lòng đăng nhập để chat'}
            </p>
          </div>

          {user ? (
            <>
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_admin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.is_admin
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.is_admin ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        {new Date(message.created_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Nhập Tin nhắn..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newMessage.trim()}
                    className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Vui lòng đăng nhập để sử dụng chat</p>
              </div>
            </div>
          )}
        </div>
      )}

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  )
}