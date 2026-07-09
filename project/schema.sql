CREATE TABLE IF NOT EXISTS signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT NOT NULL,
  commitment TEXT,
  date_val TEXT,
  created_at TEXT NOT NULL
);
