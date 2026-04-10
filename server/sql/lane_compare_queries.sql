-- 1) Count by source type
SELECT source_type, COUNT(*) AS n
FROM raw_items
GROUP BY source_type
ORDER BY n DESC;

-- 2) Most recent rows by source
SELECT source_type, external_id, published_at, observed_at, region, country, title
FROM raw_items
WHERE source_type IN ('gdelt', 'acled')
ORDER BY observed_at DESC
LIMIT 40;

-- 3) Distinct IDs by source
SELECT source_type, COUNT(DISTINCT external_id) AS distinct_ids
FROM raw_items
WHERE source_type IN ('gdelt', 'acled')
GROUP BY source_type;

-- 4) Null / cleanliness check
SELECT
  source_type,
  SUM(CASE WHEN region IS NULL OR region = '' THEN 1 ELSE 0 END) AS missing_region,
  SUM(CASE WHEN country IS NULL OR country = '' THEN 1 ELSE 0 END) AS missing_country,
  SUM(CASE WHEN lat IS NULL THEN 1 ELSE 0 END) AS missing_lat,
  SUM(CASE WHEN lon IS NULL THEN 1 ELSE 0 END) AS missing_lon
FROM raw_items
WHERE source_type IN ('gdelt', 'acled')
GROUP BY source_type;

-- 5) Timestamp spread by source
SELECT
  source_type,
  MIN(published_at) AS min_published_at,
  MAX(published_at) AS max_published_at,
  MIN(observed_at) AS min_observed_at,
  MAX(observed_at) AS max_observed_at
FROM raw_items
WHERE source_type IN ('gdelt', 'acled')
GROUP BY source_type;
