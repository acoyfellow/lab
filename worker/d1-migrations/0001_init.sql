-- Engine D1 for guest read demos (isolated from app auth DB)
CREATE TABLE IF NOT EXISTS lab_demo (id INTEGER PRIMARY KEY, note TEXT NOT NULL);
INSERT OR IGNORE INTO lab_demo (id, note) VALUES (1, 'engine-d1-demo');
