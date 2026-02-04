import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { openDb, initDb } from "./sqlite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const configPath = path.join(__dirname, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const db = await openDb(path.join(__dirname, "reservas.sqlite"));
await initDb(db);

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// helpers
const pad2 = (n) => String(n).padStart(2, "0");
const isoDate = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`; // m 1-12
const isClosed = (dateObj) => config.closedWeekdays.includes(dateObj.getDay());

function monthDays(year, month1to12){ return new Date(year, month1to12, 0).getDate(); }

function dbAll(sql, params=[]){
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}
function dbRun(sql, params=[]){
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err){
      if(err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

app.get("/api/availability", async (req, res) => {
  try{
    const month = String(req.query.month || "");
    if(!/^\d{4}-\d{2}$/.test(month)){
      return res.status(400).json({ error: "month inválido (YYYY-MM)" });
    }
    const [yStr, mStr] = month.split("-");
    const year = Number(yStr);
    const m = Number(mStr); // 1-12
    const days = monthDays(year, m);

    const out = {};
    for(let d=1; d<=days; d++){
      const dateObj = new Date(year, m-1, d);
      const iso = isoDate(year, m, d);

      if(isClosed(dateObj)){
        out[iso] = { closed: true, times: [] };
        continue;
      }

      const bookedRows = await dbAll(
        "SELECT time FROM bookings WHERE date = ? AND status = 'confirmed'",
        [iso]
      );
      const booked = new Set(bookedRows.map(r => r.time));

      out[iso] = {
        closed: false,
        times: config.times.map(t => ({ t, available: !booked.has(t) }))
      };
    }
    res.json(out);
  } catch(e){
    res.status(500).json({ error: "Error de servidor" });
  }
});

app.post("/api/book", async (req, res) => {
  try{
    const { date, time, name, phone, email, players, mode, notes } = req.body || {};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||""))){
      return res.status(400).json({ error: "date inválido (YYYY-MM-DD)" });
    }
    if(!config.times.includes(time)){
      return res.status(400).json({ error: "hora inválida" });
    }
    if(!name || !phone || !email){
      return res.status(400).json({ error: "faltan datos (nombre/teléfono/email)" });
    }
    const p = Number(players);
    if(!(p >= 2 && p <= 6)){
      return res.status(400).json({ error: "players debe ser 2-6" });
    }

    const [yy, mm, dd] = date.split("-").map(Number);
    const dateObj = new Date(yy, mm-1, dd);
    if(isClosed(dateObj)){
      return res.status(409).json({ error: "Día cerrado" });
    }

    const exists = await dbAll(
      "SELECT id FROM bookings WHERE date = ? AND time = ? AND status = 'confirmed' LIMIT 1",
      [date, time]
    );
    if(exists.length){
      return res.status(409).json({ error: "Ese horario ya está ocupado" });
    }

    const code = "P86-" + Math.random().toString(36).slice(2,7).toUpperCase() + "-" + Date.now().toString().slice(-4);
    await dbRun(
      `INSERT INTO bookings (date, time, name, phone, email, players, mode, notes, status, code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, datetime('now'))`,
      [date, time, String(name), String(phone), String(email), p, String(mode||""), String(notes||""), code]
    );

    res.json({ ok: true, code });
  } catch(e){
    res.status(500).json({ error: "Error de servidor" });
  }
});

const PORT = process.env.PORT || config.port || 3000;
app.listen(PORT, () => console.log(`Servidor listo: http://localhost:${PORT}`));
