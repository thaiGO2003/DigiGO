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
  total_deposited?: number
  is_admin: boolean
  is_banned?: boolean
  referral_code?: string
  referred_by?: string
  last_username_change?: string
  created_at: string
  rank?: UserRank
  referral_count?: number
}

export type UserRank = 'newbie' | 'dong' | 'sat' | 'vang' | 'luc_bao' | 'kim_cuong'

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
  is_hot?: boolean
  sort_order?: number
  variant_sort_strategy?: 'default' | 'price_asc' | 'price_desc' | 'duration_asc' | 'duration_desc' | 'bestselling' | 'stock_asc' | 'stock_desc'
  created_at: string
  variants?: ProductVariant[]
}

export type ProductVariant = {
  id: string
  product_id: string
  name: string
  short_name?: string | null
  price: number
  cost_price?: number
  discount_percent?: number
  duration_days?: number
  description?: string
  stock?: number
  guide_url?: string
  created_at: string
  is_manual_delivery?: boolean
  manual_stock?: number
  sort_order?: number
  total_sold?: number
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
  cost_price?: number
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

export type Program = {
  id: string
  title: string
  description?: string
  source_url: string
  download_url: string
  is_active: boolean
  view_count: number
  download_count: number
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
