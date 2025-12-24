/**
 * SePay Service
 * Preparation for SePay payment integration
 */
export const sepayService = {
  /**
   * Generate SePay payment URL or QR data
   * @param amount Amount in VND
   * @param content Transfer content
   * @param bankConfig Bank configuration (optional, if not provided, uses defaults)
   * @returns SePay payment information
   */
  async createPayment(amount: number, content: string, bankConfig?: { bank_id: string, bank_name: string, account_number: string, account_name: string, napas_code?: string }) {
    // SePay QR API configuration
    const bankAccount = bankConfig?.account_number || '60394352614'
    const bankId = bankConfig?.bank_id || 'TPBank'
    const napasCode = bankConfig?.napas_code || bankConfig?.bank_id || 'TPB'
    const bankName = bankConfig?.bank_name || 'TPBank'
    const accountHolder = bankConfig?.account_name || 'LUONG QUOC THAI'

    // Use VietQR QuickLink (Pro) format for better compatibility with banking apps
    // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NUMBER>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
    // Templates: compact, qr_only, pro
    const qrUrl = `https://img.vietqr.io/image/${napasCode.toUpperCase()}-${bankAccount}-pro.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountHolder)}`

    return {
      success: true,
      qr_url: qrUrl,
      payment_id: `SE_${Date.now()}`,
      bank_account: bankAccount,
      bank_id: bankId,
      bank_name: bankName,
      account_holder: accountHolder
    }
  },

  /**
   * Verify SePay webhook (to be called from an edge function or backend)
   */
  async verifyWebhook(_payload: any) {
    // TODO: Implement SePay webhook signature verification
    if (_payload) return true
    return true
  }
}
