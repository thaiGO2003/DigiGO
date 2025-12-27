import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, User } from 'lucide-react'
import { supabase, ChatMessage } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { sendTelegramNotification } from '../lib/telegram'
import { useMobileKeyboardFix } from '../hooks/useMobileKeyboardFix'
import AuthModal from './AuthModal'

export default function ChatWidget() {
  useMobileKeyboardFix() // Activate keyboard fix hook
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
    let cleanupSubscription: (() => void) | undefined
    let interval: NodeJS.Timeout | undefined

    if (user && isOpen) {
      fetchMessages()
      cleanupSubscription = subscribeToMessages()

      // Polling every 1s as requested
      interval = setInterval(fetchMessages, 1000)
    }

    return () => {
      if (cleanupSubscription) cleanupSubscription()
      if (interval) clearInterval(interval)
    }
  }, [user, isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Create notification sound
    audioRef.current = new Audio('/notification.mp3')
    audioRef.current.volume = 0.7
  }, [])

  const sendText = async (text: string) => {
    if (!text.trim() || loading) return

    if (!user) {
      setNewMessage(text) // Preserve message
      setShowAuthModal(true)
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: text.trim(),
          is_admin: false
        })

      if (error) throw error

      // Send Telegram notification if user is not admin
      if (!user.is_admin) {
        const telegramMsg = `<b>Tin nhắn mới từ khách hàng:</b>\n\n- Username: ${user.username || 'N/A'}\n- Họ tên: ${user.full_name || 'N/A'}\n- Nội dung: ${text.trim()}`
        sendTelegramNotification(telegramMsg)
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  // Listen for open-chat-support event
  useEffect(() => {
    const handleOpenChat = async (e: any) => {
      setIsOpen(true)
      if (e.detail?.message) {
        // Auto send if logged in, otherwise pre-fill
        if (user) {
          await sendText(e.detail.message)
          
          // Check if message is a manual delivery order request
          // "Tôi vừa mua đơn hàng: ..."
          if (e.detail.message.startsWith('Tôi vừa mua đơn hàng:')) {
            // Send auto reply after 1 second
            setTimeout(async () => {
                try {
                    await supabase.from('chat_messages').insert({
                        user_id: user.id,
                        message: 'Bác hãy chờ em tầm 5-10p ạ',
                        is_admin: true
                    })
                } catch (error) {
                    console.error('Error sending auto reply:', error)
                }
            }, 1000)
          }
        } else {
          setNewMessage(e.detail.message)
          setShowAuthModal(true)
        }
      }
    }

    window.addEventListener('open-chat-support', handleOpenChat)
    return () => window.removeEventListener('open-chat-support', handleOpenChat)
  }, [user, loading]) // Add dependencies

  const fetchMessages = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      const newMessages = data || []
      setMessages(prev => {
        // Only update if messages have changed to avoid auto-scroll
        if (prev.length === newMessages.length && 
            prev.length > 0 && 
            prev[prev.length - 1].id === newMessages[newMessages.length - 1].id) {
          return prev
        }
        return newMessages
      })
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
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

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
      if (!user.is_admin) {
        const telegramMsg = `<b>Tin nhắn mới từ khách hàng:</b>\n\n- Username: ${user.username || 'N/A'}\n- Họ tên: ${user.full_name || 'N/A'}\n- Nội dung: ${newMessage.trim()}`
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

    // Unlock notification sound on first user interaction (autoplay policy)
    if (!isOpen && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().then(() => {
        audioRef.current?.pause()
        if (audioRef.current) audioRef.current.currentTime = 0
      }).catch(() => {})
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
        <div 
          className="fixed right-6 w-80 bg-white rounded-lg shadow-xl border z-40 flex flex-col"
          style={{
            height: '24rem', // 96 = 24rem
            bottom: '5rem' // 20 = 5rem
          }}
        >
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
                      className={`max-w-xs px-3 py-2 rounded-lg ${message.is_admin
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-blue-600 text-white'
                        }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${message.is_admin ? 'text-gray-500' : 'text-blue-100'
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