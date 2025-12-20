interface VNPayConfig {
  vnp_TmnCode: string
  vnp_HashSecret: string
  vnp_Url: string
  vnp_ReturnUrl: string
}

interface VNPayPaymentRequest {
  vnp_Amount: number
  vnp_Command: string
  vnp_CreateDate: string
  vnp_CurrCode: string
  vnp_IpAddr: string
  vnp_Locale: string
  vnp_OrderInfo: string
  vnp_ReturnUrl: string
  vnp_TmnCode: string
  vnp_TxnRef: string
  vnp_Version: string
  vnp_SecureHash?: string
}

class VNPayService {
  private config: VNPayConfig

  constructor(config: VNPayConfig) {
    this.config = config
  }

  private async createSecureHash(data: string): Promise<string> {
    // Use Web Crypto API for browser compatibility
    const encoder = new TextEncoder()
    const keyData = encoder.encode(this.config.vnp_HashSecret)
    const messageData = encoder.encode(data)
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData)
    
    // Convert to hex string
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {}
    const keys = Object.keys(obj).sort()
    
    for (const key of keys) {
      if (obj[key] !== '' && key !== 'vnp_SecureHash') {
        sorted[key] = obj[key]
      }
    }
    
    return sorted
  }

  public async createPaymentUrl(params: {
    amount: number
    orderId: string
    orderInfo: string
    ipAddress: string
    locale?: string
  }): Promise<string> {
    const date = new Date()
    const createDate = date.toISOString().replace(/[-:T.]/g, '').slice(0, 14)
    
    const vnpParams: VNPayPaymentRequest = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.vnp_TmnCode,
      vnp_Locale: params.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: params.orderInfo,
      vnp_Amount: params.amount * 100, // VNPay uses amount in cents
      vnp_ReturnUrl: this.config.vnp_ReturnUrl,
      vnp_IpAddr: params.ipAddress,
      vnp_CreateDate: createDate
    }

    // Sort parameters
    const sortedParams = this.sortObject(vnpParams as unknown as Record<string, string>)
    
    // Create query string
    const querystring = new URLSearchParams(sortedParams).toString()
    
    // Create secure hash
    const secureHash = await this.createSecureHash(querystring)
    
    // Add secure hash to parameters
    sortedParams.vnp_SecureHash = secureHash
    
    // Create final URL
    const finalQuerystring = new URLSearchParams(sortedParams).toString()
    
    return `${this.config.vnp_Url}?${finalQuerystring}`
  }

  public async verifyReturnUrl(query: Record<string, string>): Promise<{
    isValid: boolean
    data: Record<string, any>
  }> {
    const secureHash = query.vnp_SecureHash
    const rspCode = query.vnp_ResponseCode
    
    // Remove secure hash from query
    const queryWithoutHash = { ...query }
    delete queryWithoutHash.vnp_SecureHash
    delete queryWithoutHash.vnp_SecureHashType
    
    // Sort remaining parameters
    const sortedParams = this.sortObject(queryWithoutHash)
    
    // Create query string
    const querystring = new URLSearchParams(sortedParams).toString()
    
    // Verify secure hash
    const signed = await this.createSecureHash(querystring)
    
    return {
      isValid: secureHash === signed && rspCode === '00',
      data: query
    }
  }
}

// Initialize VNPay service with environment variables
const vnpayConfig: VNPayConfig = {
  vnp_TmnCode: import.meta.env.VITE_VNPAY_TMNCODE || '',
  vnp_HashSecret: import.meta.env.VITE_VNPAY_HASHSECRET || '',
  vnp_Url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_ReturnUrl: `${window.location.origin}/payment-return`
}

export const vnpayService = new VNPayService(vnpayConfig)
export default VNPayService