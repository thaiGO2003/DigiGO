-- Cập nhật RPC get_products_with_variants để lấy thêm trường guide_url và discount_percent
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
            'stock', (
              SELECT count(*)
              FROM product_keys pk
              WHERE pk.variant_id = pv.id AND pk.is_used = false
            )
          ) ORDER BY pv.price
        )
        FROM product_variants pv
        WHERE pv.product_id = p.id
      )
    ) ORDER BY p.created_at DESC
  )
  FROM products p;
$$;
