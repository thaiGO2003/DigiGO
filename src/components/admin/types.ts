import { Product, ProductVariant, User, BankConfig, ChatMessage } from '../../lib/supabase'

// Tab Types
export type AdminTabType = 'stats' | 'products' | 'users' | 'chat' | 'transactions' | 'bank' | 'settings' | 'ranks'
export type TransactionFilter = 'all' | 'purchase' | 'pending' | 'completed' | 'expired'

// Bank list
export const VIETNAM_BANKS = [
    { id: 'VietinBank', name: 'VietinBank', code: 'ICB' },
    { id: 'Vietcombank', name: 'Vietcombank', code: 'VCB' },
    { id: 'BIDV', name: 'BIDV', code: 'BIDV' },
    { id: 'Agribank', name: 'Agribank', code: 'VBA' },
    { id: 'OCB', name: 'OCB', code: 'OCB' },
    { id: 'MBBank', name: 'MBBank', code: 'MB' },
    { id: 'Techcombank', name: 'Techcombank', code: 'TCB' },
    { id: 'ACB', name: 'ACB', code: 'ACB' },
    { id: 'VPBank', name: 'VPBank', code: 'VPB' },
    { id: 'Sacombank', name: 'Sacombank', code: 'STB' },
    { id: 'TPBank', name: 'TPBank', code: 'TPB' },
    { id: 'HDBank', name: 'HDBank', code: 'HDB' },
    { id: 'VIB', name: 'VIB', code: 'VIB' },
    { id: 'MSB', name: 'MSB', code: 'MSB' },
    { id: 'SHB', name: 'SHB', code: 'SHB' },
    { id: 'ABBANK', name: 'ABBANK', code: 'ABB' },
    { id: 'VietABank', name: 'VietABank', code: 'VAB' },
    { id: 'NamABank', name: 'NamABank', code: 'NAB' },
    { id: 'PGBank', name: 'PGBank', code: 'PGB' },
    { id: 'VietBank', name: 'VietBank', code: 'VIETBANK' },
    { id: 'BVB', name: 'BaoVietBank', code: 'BVB' },
    { id: 'KienLongBank', name: 'Kienlongbank', code: 'KLB' },
]

// Utility function
export const removeVietnameseTones = (str: string) => {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|ã|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
    str = str.replace(/\u02C6|\u0306|\u031B/g, "");
    return str.toUpperCase();
}

// Props interfaces
export interface ProductsTabProps {
    products: Product[]
    highlightedProductId?: string | null
    onAddProduct: () => void
    onEditProduct: (product: Product) => void
    onDeleteProduct: (id: string) => void
    onToggleHot: (product: Product) => void
    onMoveProduct: (product: Product, direction: 'up' | 'down') => void
    onAddVariant: (product: Product) => void
    onEditVariant: (product: Product, variant: ProductVariant) => void
    onDeleteVariant: (id: string) => void
    onMoveVariant: (product: Product, variant: ProductVariant, direction: 'up' | 'down') => void
    onManageKeys: (product: Product, variant: ProductVariant) => void
}

export interface UsersTabProps {
    users: User[]
    currentUserId?: string
    searchTerm?: string
    onSearchChange?: (term: string) => void
    onRefresh?: () => void
    onAdjustBalance: (user: User) => void
    onToggleAdmin: (userId: string, currentStatus: boolean) => void
    onToggleBan: (user: User) => void
    onDeleteUser: (user: User) => void
    onUpdateRank?: (userId: string, rank: User['rank']) => void
    onChat?: (user: User) => void
}

export interface TransactionsTabProps {
    transactions: any[]
    transactionFilter: TransactionFilter
    dateFilter?: { start: string, end: string } | null
    onFilterChange: (filter: TransactionFilter) => void
    onDateFilterChange?: (range: { start: string, end: string } | null) => void
    onRefresh: () => void
    onApprove: (transaction: any) => void
    onReject: (transaction: any) => void
    expandedOrders: Set<string>
    onToggleExpand: (id: string) => void
    onNavigateToUser?: (userId: string) => void
}

export interface StatsTabProps {
    onNavigateToTransactions?: (date: string) => void
    onNavigateToProducts?: (productId: string) => void
}

export interface RanksTabProps {
    users: User[]
    onUpdateRank: (userId: string, rank: User['rank']) => void
}

export interface ChatTabProps {
    chatUsers: User[]
    selectedUser: User | null
    messages: ChatMessage[]
    newMessage: string
    onSelectUser: (user: User) => void
    onMessageChange: (message: string) => void
    onSendMessage: (e: React.FormEvent) => void
}

export interface BankTabProps {
    bankConfigs: BankConfig[]
    onAddBank: () => void
    onEditBank: (config: BankConfig) => void
    onDeleteBank: (id: string) => void
    onActivateBank: (id: string) => void
}

// Modal Props
export interface ProductModalProps {
    isOpen: boolean
    onClose: () => void
    product: Product | null
    onSave: () => void
}

export interface VariantModalProps {
    isOpen: boolean
    onClose: () => void
    product: Product | null
    variant: ProductVariant | null
    onSave: () => void
}

export interface KeyModalProps {
    isOpen: boolean
    onClose: () => void
    variant: ProductVariant | null
    onSave: () => void
}

export interface BankModalProps {
    isOpen: boolean
    onClose: () => void
    bankConfig: BankConfig | null
    onSave: (e: React.FormEvent<HTMLFormElement>) => void
}

export interface AdjustBalanceModalProps {
    isOpen: boolean
    onClose: () => void
    user: User | null
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}
