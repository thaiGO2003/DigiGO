import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: string
  email: string
  full_name?: string
  balance: number
  is_admin: boolean
  created_at: string
}

export type Product = {
  id: string
  name: string
  price: number
  category: string
  type: 'email' | 'key' | 'package'
  description: string
  image_url: string
  quantity: number
  duration: string
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  amount: number
  type: 'top_up' | 'purchase'
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

export type ChatMessage = {
  id: string
  user_id: string
  admin_id?: string
  message: string
  is_admin: boolean
  created_at: string
}