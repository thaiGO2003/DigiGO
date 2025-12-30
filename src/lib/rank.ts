import { UserRank } from './supabase'

export const getRankPercent = (rank?: UserRank) => {
  switch (rank) {
    case 'dong': return 1
    case 'sat': return 2
    case 'vang': return 3
    case 'luc_bao': return 4
    case 'kim_cuong': return 5
    default: return 0
  }
}

export const rankDisplay: Record<UserRank | 'unknown', { label: string; threshold: number }> = {
  newbie: { label: 'Tân binh', threshold: 0 },
  dong: { label: 'Đồng', threshold: 100000 },
  sat: { label: 'Sắt', threshold: 200000 },
  vang: { label: 'Vàng', threshold: 300000 },
  luc_bao: { label: 'Lục bảo', threshold: 400000 },
  kim_cuong: { label: 'Kim cương', threshold: 500000 },
  unknown: { label: 'Không xác định', threshold: 0 },
}
