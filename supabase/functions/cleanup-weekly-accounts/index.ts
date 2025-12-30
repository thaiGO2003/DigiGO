// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const token = req.headers.get('Authorization')
  const secret = Deno.env.get('CRON_SECRET') ?? ''
  if (secret && token !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const startedAt = new Date().toISOString()
  let totalDeleted = 0
  let batchCount = 0

  try {
    await supabaseClient.rpc('backfill_total_deposited')
    while (true) {
      const { data, error } = await supabaseClient.rpc('cleanup_inactive_unfunded_users', { p_batch_size: 1000 })
      if (error) throw error
      const deleted = Number(data || 0)
      if (!deleted) break
      totalDeleted += deleted
      batchCount++
      if (batchCount >= 1000) break
    }
    await supabaseClient
      .from('job_runs')
      .insert({
        job_name: 'cleanup-weekly-accounts',
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        total_deleted: totalDeleted,
        batch_count: batchCount,
        error: null,
      })
    return new Response(JSON.stringify({ success: true, totalDeleted, batchCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    await supabaseClient
      .from('job_runs')
      .insert({
        job_name: 'cleanup-weekly-accounts',
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        total_deleted: totalDeleted,
        batch_count: batchCount,
        error: String(e?.message ?? e),
      })
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

