import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: string
  email: string
  username?: string
  full_name?: string
  balance: number
  is_admin: boolean
  is_banned?: boolean
  referral_code?: string
  referred_by?: string
  last_username_change?: string
  created_at: string
  rank?: UserRank
  referral_count?: number
}

export type UserRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type ReferralEarning = {
  id: string
  referrer_id: string
  referred_user_id: string
  transaction_id: string
  amount: number
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
  guide_url?: string
  created_at: string
  variants?: ProductVariant[]
}

export type ProductVariant = {
  id: string
  product_id: string
  name: string
  price: number
  discount_percent?: number
  duration_days?: number
  description?: string
  stock?: number
  guide_url?: string
  created_at: string
  is_manual_delivery?: boolean
  manual_stock?: number
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
  metadata?: any
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

export type BankConfig = {
  id: string
  bank_id: string
  bank_name: string
  napas_code?: string
  account_number: string
  account_name: string
  is_active: boolean
  created_at: string
}
