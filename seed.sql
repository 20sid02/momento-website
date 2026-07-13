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

-- ── Story: Istanbul 2005 ── two linked frames that tell one comeback ──
-- Frame 1 — the despair. NOTE: placeholder art (reuses the Istanbul image) until the real Crespo 3–0 poster is ready.
('p_crespo','momento','Crespo Makes It 3–0','crespo-makes-it-3-0',
 'Half an hour gone in Istanbul and it was already meant to be over. Crespo''s deft finish made it 3–0 to Milan — the moment before the miracle. Framed, matted, ready to hang.',
 '/assets/momento-istanbul.jpg',
 '{"fixture":"AC Milan vs Liverpool FC","venue":"Atatürk Olympic Stadium","date_text":"May 25, 2005","tagline":"Before the comeback.","story":"istanbul-2005","story_title":"Istanbul 2005","frame":1}',
 1,3,CAST(strftime('%s','now') AS INTEGER)),
-- Frame 2 — the miracle.
('p_ist','momento','The Miracle of Istanbul','the-miracle-of-istanbul',
 'Down 3–0 at halftime, Liverpool authored the greatest comeback the Champions League has ever seen. Framed, matted, ready to hang.',
 '/assets/momento-istanbul.jpg',
 '{"fixture":"AC Milan vs Liverpool FC","venue":"Atatürk Olympic Stadium","date_text":"May 25, 2005","tagline":"Against all odds.","story":"istanbul-2005","story_title":"Istanbul 2005","frame":2}',
 1,4,CAST(strftime('%s','now') AS INTEGER)),
-- The Complete Set — both frames, discounted.
('p_ist_set','momento','Istanbul 2005 — The Complete Comeback','istanbul-2005-complete-set',
 'The whole story on your wall — both frames of Istanbul 2005, from the despair of 3–0 to the greatest comeback in Champions League history. Buy the linked frames together and save.',
 '/assets/momento-istanbul.jpg',
 '{"story":"istanbul-2005","story_title":"Istanbul 2005","tagline":"The whole comeback, framed.","frames":"crespo-makes-it-3-0,the-miracle-of-istanbul"}',
 1,5,CAST(strftime('%s','now') AS INTEGER)),

('p_zid','momento','Pure Perfection','pure-perfection',
 'Zidane''s left-footed volley in Glasgow — a strike of pure technical grace that secured La Novena. Gallery-grade framed print.',
 '/assets/momento-zidane.jpg',
 '{"fixture":"Real Madrid vs Bayer Leverkusen","venue":"Hampden Park","date_text":"May 15, 2002","tagline":"Absolute royalty.","story":"la-novena","story_title":"La Novena","frame":1}',
 1,6,CAST(strftime('%s','now') AS INTEGER));

INSERT INTO variants (id,product_id,label,price_paise,stock,sort) VALUES
('v1','p_base','Single Pack — 5 cards',14900,NULL,0),
('v2','p_base','Box of 10 Packs',129900,50,1),
('v3','p_gold','Gold Pack — 5 cards',29900,100,0),
-- Istanbul frames (A4 ₹899 / A3 ₹1499 each)
('v_cr4','p_crespo','A4 Framed',89900,25,0),
('v_cr3','p_crespo','A3 Framed',149900,15,1),
('v4','p_ist','A4 Framed',89900,25,0),
('v5','p_ist','A3 Framed',149900,15,1),
-- Istanbul Complete Set — priced below 2× the single frames (A4 1798→1499 save ₹299 / A3 2998→2499 save ₹499)
('v_set4','p_ist_set','A4 Complete Set — 2 frames',149900,15,0),
('v_set3','p_ist_set','A3 Complete Set — 2 frames',249900,10,1),
-- Zidane
('v6','p_zid','A4 Framed',89900,25,0),
('v7','p_zid','A3 Framed',149900,15,1);

-- feature a few on the homepage
UPDATE products SET featured = 1 WHERE id IN ('p_base','p_gold','p_ist_set');
