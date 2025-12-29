import { useEffect, useState, useMemo } from 'react'
import { supabase, ProductVariant, User } from '../lib/supabase'

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

  const rankPercent = (rank?: User['rank']) => {
    switch (rank) {
      case 'bronze': return 2
      case 'silver': return 4
      case 'gold': return 6
      case 'platinum': return 8
      case 'diamond': return 10
      default: return 0
    }
  }

  const computePercent = (user: User | null | undefined, variant: ProductVariant) => {
    const variantDiscount = variant.discount_percent || 0
    const referralCount = user?.referral_count ?? 0
    const referralMax = settings.referral_max_discount ?? 10
    const referralCountDiscount = Math.min(referralCount * 1, referralMax)
    const rankDiscount = rankPercent(user?.rank)
    const integratedPercent = Math.min(variantDiscount + rankDiscount + referralCountDiscount, 20)
    const buyerPercent = user?.referred_by ? (settings.referral_buyer_discount ?? 1) : 0
    return {
      integratedPercent,
      buyerPercent,
      totalPercentAppliedToPrice: integratedPercent, // applied first
      breakdown: {
        variantDiscount,
        rankDiscount,
        referralCountDiscount,
        buyerPercent,
        cappedAt20: integratedPercent >= 20,
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
