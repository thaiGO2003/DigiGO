import { useEffect, useState, useMemo } from 'react'
import { supabase, ProductVariant, User } from '../lib/supabase'
import { getRankPercent } from '../lib/rank'

type DiscountSettings = {
  referral_buyer_discount?: number
  referral_max_discount?: number
}

export function useDiscounts(settingsOverride?: DiscountSettings) {
  const [settings, setSettings] = useState<DiscountSettings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchSettings = async () => {
      if (settingsOverride) {
        setSettings(settingsOverride)
        setLoading(false)
        return
      }
      try {
        const { data } = await supabase
          .from('global_settings')
          .select('referral_buyer_discount, referral_max_discount')
          .limit(1)
          .maybeSingle()
        if (active) {
          setSettings({
            referral_buyer_discount: data?.referral_buyer_discount ?? 1,
            referral_max_discount: data?.referral_max_discount ?? 10,
          })
        }
      } catch {
        if (active) {
          setSettings({ referral_buyer_discount: 1, referral_max_discount: 10 })
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchSettings()
    return () => { active = false }
  }, [settingsOverride])

  const rankPercent = (rank?: User['rank']) => getRankPercent(rank)

  const computePercent = (user: User | null | undefined, variant: ProductVariant) => {
    const variantDiscount = variant.discount_percent || 0
    const referralCount = user?.referral_count ?? 0
    const referralMax = settings.referral_max_discount ?? 10
    
    // Giảm giá tích lũy = Rank + Tích lũy giới thiệu (Giới hạn tối đa 10%)
    const rankDiscount = rankPercent(user?.rank)
    const referralCountDiscount = Math.min(referralCount * 1, referralMax)
    const accumulatedDiscount = Math.min(rankDiscount + referralCountDiscount, 10)
    
    // Tổng giảm giá áp dụng lên giá gốc = Giảm giá gói + Giảm giá tích lũy
    // Tuy nhiên, nếu bạn muốn TỔNG giảm giá cuối cùng (bao gồm cả gói) không quá 10% thì dùng dòng dưới:
    // const integratedPercent = Math.min(variantDiscount + accumulatedDiscount, 10)
    
    // Theo yêu cầu "giảm giá tích lũy tối đa 10%", tôi giả định giảm giá gói (variant) là riêng biệt:
    const integratedPercent = variantDiscount + accumulatedDiscount
    
    const buyerPercent = user?.referred_by ? (settings.referral_buyer_discount ?? 1) : 0
    return {
      integratedPercent,
      buyerPercent,
      totalPercentAppliedToPrice: integratedPercent, // applied first
      breakdown: {
        variantDiscount,
        rankDiscount,
        referralCountDiscount,
        accumulatedDiscount,
        buyerPercent,
        cappedAt10: accumulatedDiscount >= 10,
      }
    }
  }

  const getUnitPrice = (user: User | null | undefined, variant: ProductVariant) => {
    const { integratedPercent, buyerPercent } = computePercent(user, variant)
    const afterIntegrated = Math.round(variant.price * (100 - integratedPercent) / 100)
    const final = Math.round(afterIntegrated * (100 - buyerPercent) / 100)
    return final
  }

  return useMemo(() => ({
    loading,
    settings,
    computePercent,
    getUnitPrice,
  }), [loading, settings])
}
