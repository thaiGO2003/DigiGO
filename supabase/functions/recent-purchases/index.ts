import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`[${new Date().toISOString()}] Querying recent purchases...`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calculate date 7 days ago
    const date7DaysAgo = new Date()
    date7DaysAgo.setDate(date7DaysAgo.getDate() - 7)

    // Query random completed transactions from last 7 days
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        created_at,
        users (full_name, email, username),
        product_variants (
          name,
          products (name)
        )
      `)
      .eq('status', 'completed')
      .eq('type', 'purchase')
      .gte('created_at', date7DaysAgo.toISOString())
      // Note: "order by random()" is not directly exposed in JS client without rpc or raw sql usually, 
      // but for small dataset we can fetch latest 50 and pick random in code, 
      // OR use a limit and simple order. 
      // Supabase JS client doesn't support .random() directly.
      // Let's fetch latest 20 and pick random 5 to be efficient.
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    // Randomly select up to 5 items
    const shuffled = (data || []).sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 5)

    const result = selected.map((tx: any) => {
      // Mask name: "Nguyen Van A" -> "Nguy*****"
      // or "email@gmail.com" -> "ema*****"
      const rawName = tx.users?.full_name || tx.users?.username || tx.users?.email || 'Khách'
      const maskedName = rawName.length > 3 
        ? rawName.substring(0, 3) + '***' 
        : rawName + '***'

      const productName = tx.product_variants?.products?.name 
        ? `${tx.product_variants.products.name} - ${tx.product_variants.name}`
        : tx.product_variants?.name || 'Sản phẩm'

      return {
        customer_name: maskedName,
        product_name: productName,
        purchase_time: tx.created_at, // ISO string
        price: tx.amount
      }
    })

    console.log(`[${new Date().toISOString()}] Returned ${result.length} transactions`)

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800', // 30 minutes cache
      },
    })
  } catch (e) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}) 
