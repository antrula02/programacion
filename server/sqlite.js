import sqlite3 from "sqlite3";

export async function openDb(filePath){
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filePath, (err) => err ? reject(err) : resolve(db));
  });
}

export async function initDb(db){
  const sql = `
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    players INTEGER NOT NULL,
    mode TEXT,
    notes TEXT,
    status TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(date, time);
  `;
  await exec(db, sql);
}

function exec(db, sql){
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => err ? reject(err) : resolve());
  });
}
