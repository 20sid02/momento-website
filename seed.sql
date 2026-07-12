-- Demo catalogue for local development / first run.
DELETE FROM variants;
DELETE FROM orders;
DELETE FROM products;

INSERT INTO products (id,type,name,slug,description,image_key,meta,active,sort,created_at) VALUES
('p_base','pack','Base Pack','base-pack',
 'Five collectible player cards, sealed and shuffled. Every rip is a surprise — commons, rares and the occasional gold.',
 '/assets/cards-spread.jpg','{"pack_size":5,"tier":"base"}',1,1,CAST(strftime('%s','now') AS INTEGER)),
('p_gold','pack','Gold Pack','gold-pack',
 'A premium pack weighted toward golds and special editions. Five cards, better odds, bigger pulls.',
 '/assets/cards-spread.jpg','{"pack_size":5,"tier":"gold"}',1,2,CAST(strftime('%s','now') AS INTEGER)),
('p_ist','momento','The Miracle of Istanbul','the-miracle-of-istanbul',
 'Down 3–0 at halftime, Liverpool authored the greatest comeback the Champions League has ever seen. Framed, matted, ready to hang.',
 '/assets/momento-istanbul.jpg',
 '{"fixture":"AC Milan vs Liverpool FC","venue":"Atatürk Olympic Stadium","date_text":"May 25, 2005","tagline":"Against all odds."}',
 1,3,CAST(strftime('%s','now') AS INTEGER)),
('p_zid','momento','Pure Perfection','pure-perfection',
 'Zidane''s left-footed volley in Glasgow — a strike of pure technical grace that secured La Novena. Gallery-grade framed print.',
 '/assets/momento-zidane.jpg',
 '{"fixture":"Real Madrid vs Bayer Leverkusen","venue":"Hampden Park","date_text":"May 15, 2002","tagline":"Absolute royalty."}',
 1,4,CAST(strftime('%s','now') AS INTEGER));

INSERT INTO variants (id,product_id,label,price_paise,stock,sort) VALUES
('v1','p_base','Single Pack — 5 cards',14900,NULL,0),
('v2','p_base','Box of 10 Packs',129900,50,1),
('v3','p_gold','Gold Pack — 5 cards',29900,100,0),
('v4','p_ist','A4 Framed',89900,25,0),
('v5','p_ist','A3 Framed',149900,15,1),
('v6','p_zid','A4 Framed',89900,25,0),
('v7','p_zid','A3 Framed',149900,15,1);

-- feature a few on the homepage
UPDATE products SET featured = 1 WHERE id IN ('p_base','p_gold','p_ist');
