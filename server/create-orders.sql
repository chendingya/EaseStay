INSERT INTO orders (
  order_no, hotel_id, merchant_id, user_id, room_type_id, room_type_name,
  quantity, price_per_night, nights, total_price, status,
  check_in, check_out, paid_at, created_at, updated_at
)
SELECT
  'YS' || substr(md5(random()::text || clock_timestamp()::text || gs::text), 1, 20),
  22, 1, 9, 121, '行政双床房',
  1, 399.00, 1, 399.00, 'confirmed',
  date '2026-02-12' + gs, date '2026-02-13' + gs,
  now(), now(), now()
FROM generate_series(0, 4) gs;

INSERT INTO orders (
  order_no, hotel_id, merchant_id, user_id, room_type_id, room_type_name,
  quantity, price_per_night, nights, total_price, status,
  check_in, check_out, paid_at, created_at, updated_at
)
SELECT
  'YS' || substr(md5(random()::text || clock_timestamp()::text || gs::text), 1, 20),
  2, 1, 9, 118, '标准双床房',
  1, 299.00, 1, 269.10, 'confirmed',
  date '2026-02-12' - gs, date '2026-02-13' - gs,
  now(), now(), now()
FROM generate_series(0, 4) gs;