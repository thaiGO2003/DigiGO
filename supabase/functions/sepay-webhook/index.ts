// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sepay-api-key',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Verify SePay API Key (Security)
    // You should set SEPAY_API_KEY in your Supabase project secrets
    const authHeader = req.headers.get('Authorization')
    const sepayHeader = req.headers.get('x-sepay-api-key')
    const expectedApiKey = Deno.env.get('SEPAY_API_KEY')

    if (expectedApiKey) {
      const isAuthorized =
        (authHeader === `Apikey ${expectedApiKey}`) ||
        (sepayHeader === expectedApiKey)

      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 2. Parse SePay Payload
    const payload = await req.json()
    console.log('SePay Webhook received:', payload)

    // SePay can use different field names depending on the bank gateway
    // Standard: amount_in, transaction_content, reference_number
    // Some gateways: transferAmount, content, referenceCode, description
    const amount_in = payload.amount_in || payload.transferAmount
    const transaction_content = payload.transaction_content || payload.content || payload.description
    const reference_number = payload.reference_number || payload.referenceCode
    const code = payload.code

    if (!amount_in || (!transaction_content && !code)) {
      console.error('Missing required fields in payload:', { amount_in, transaction_content, code })
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Extract Order Info from transaction_content or use extracted code
    // New Format: DH[8-10 random digits]
    // Example: DH1111111111
    const fullContent = (transaction_content || '').toUpperCase()
    const extractedCode = (code || '').toUpperCase()

    // Find transaction by transfer_content in metadata
    // We try to match either the extracted code or the full content
    let query = supabaseClient
      .from('transactions')
      .select('*')
      .eq('type', 'top_up')
      .eq('status', 'pending')

    if (extractedCode) {
      query = query.filter('metadata->>transfer_content', 'eq', extractedCode)
    } else {
      // Fallback to searching for the code within the full content if SePay didn't extract it
      // This is a bit tricky with JSONB metadata filtering in Supabase client
      // But we can fetch all pending transactions and filter in memory if needed, 
      // or assume SePay config is correct and 'code' is provided.
      // For now, let's try to match the full content as before or use a more flexible search.
      query = query.filter('metadata->>transfer_content', 'eq', fullContent)
    }

    const { data: transaction, error: fetchError } = await query.single()

    if (fetchError || !transaction) {
      // If still not found and we have fullContent, try to find a transaction whose 
      // transfer_content is contained within fullContent
      if (fullContent) {
        const { data: allPending } = await supabaseClient
          .from('transactions')
          .select('*')
          .eq('type', 'top_up')
          .eq('status', 'pending')

        const matchingTx = allPending?.find(tx =>
          tx.metadata?.transfer_content &&
          fullContent.includes(tx.metadata.transfer_content.toUpperCase())
        )

        if (matchingTx) {
          // Found it!
          return processTransaction(matchingTx, amount_in, payload, reference_number, supabaseClient)
        }
      }

      console.error('Transaction not found or already processed:', { fullContent, extractedCode })
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return processTransaction(transaction, amount_in, payload, reference_number, supabaseClient)
  } catch (error) {
    console.error('Webhook Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function processTransaction(transaction: any, amount_in: number, payload: any, reference_number: string, supabaseClient: any) {
  // 4. Verify amount (optional but recommended)
  if (transaction.amount !== amount_in) {
    console.warn(`Amount mismatch: Expected ${transaction.amount}, got ${amount_in}`)
  }

  // 5. Update Transaction and User Balance
  const { error: updateTxError } = await supabaseClient
    .from('transactions')
    .update({
      status: 'completed',
      metadata: {
        ...transaction.metadata,
        sepay_payload: payload,
        completed_at: new Date().toISOString(),
        reference_number
      }
    })
    .eq('id', transaction.id)

  if (updateTxError) throw updateTxError

  const { data: user, error: userFetchError } = await supabaseClient
    .from('users')
    .select('balance, total_deposited, full_name, username')
    .eq('id', transaction.user_id)
    .single()

  if (userFetchError) throw userFetchError

  const { error: updateBalanceError } = await supabaseClient
    .from('users')
    .update({ balance: user.balance + amount_in, total_deposited: (user.total_deposited ?? 0) + amount_in })
    .eq('id', transaction.user_id)

  if (updateBalanceError) throw updateBalanceError

  console.log(`Successfully processed payment for user ${transaction.user_id}: +${amount_in}`)

  // Send Telegram Notification
  await sendTelegramNotification(user, amount_in, reference_number)

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendTelegramNotification(user: any, amount: number, reference_number: string) {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

  if (!token || !chatId) {
    console.warn('Telegram config missing')
    return
  }

  const message = `<b>💰 Khách hàng nạp tiền!</b>

- Họ tên: ${user.full_name || 'N/A'}
- Username: ${user.username || 'N/A'}
- Mã giao dịch: ${reference_number}
- Số tiền: ${amount.toLocaleString('vi-VN')}đ`

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
  }
}
