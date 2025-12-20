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
  mechanism?: string
  recommended_model?: string
  strengths?: string
  weaknesses?: string
  image_url?: string
  category: string
  created_at: string
  variants?: ProductVariant[]
}

export type ProductVariant = {
  id: string
  product_id: string
  name: string
  price: number
  duration_days?: number
  description?: string
  stock?: number
  created_at: string
}

export type ProductKey = {
  id: string
  variant_id: string
  key_value: string
  is_used: boolean
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  amount: number
  type: 'top_up' | 'purchase'
  status: 'pending' | 'completed' | 'failed'
  variant_id?: string
  key_id?: string
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