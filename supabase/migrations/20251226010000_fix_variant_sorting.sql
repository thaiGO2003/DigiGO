-- 1. Add sort_order to product_variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Add variant_sort_strategy to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_sort_strategy TEXT DEFAULT 'default';

-- 3. Drop old RPC
DROP FUNCTION IF EXISTS get_products_with_variants();

-- 4. Recreate RPC with new columns and sorting
CREATE OR REPLACE FUNCTION get_products_with_variants()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'mechanism', p.mechanism,
      'recommended_model', p.recommended_model,
      'strengths', p.strengths,
      'weaknesses', p.weaknesses,
      'image_url', p.image_url,
      'category', p.category,
      'guide_url', p.guide_url,
      'is_hot', p.is_hot,
      'sort_order', p.sort_order,
      'variant_sort_strategy', p.variant_sort_strategy,
      'created_at', p.created_at,
      'variants', (
        SELECT json_agg(
          json_build_object(
            'id', pv.id,
            'name', pv.name,
            'price', pv.price,
            'discount_percent', pv.discount_percent,
            'duration_days', pv.duration_days,
            'description', pv.description,
            'guide_url', pv.guide_url,
            'is_manual_delivery', pv.is_manual_delivery,
            'manual_stock', pv.manual_stock,
            'sort_order', pv.sort_order,
            'stock', (
              CASE 
                WHEN pv.is_manual_delivery THEN COALESCE(pv.manual_stock, 0)
                ELSE (SELECT count(*)::int FROM product_keys pk WHERE pk.variant_id = pv.id AND pk.is_used = false)
              END
            )
          ) ORDER BY pv.sort_order ASC, pv.price ASC
        )
        FROM product_variants pv
        WHERE pv.product_id = p.id
      )
    ) ORDER BY p.sort_order ASC, p.created_at DESC
  )
  FROM products p;
$$;
