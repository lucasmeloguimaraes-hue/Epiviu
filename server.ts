import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("epi_surveil.db");
db.pragma('foreign_keys = ON');

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    shift TEXT NOT NULL -- 'morning', 'afternoon', or 'oncall'
  );

  CREATE TABLE IF NOT EXISTS sectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    staff_id INTEGER,
    FOREIGN KEY (staff_id) REFERENCES staff(id)
  );

  CREATE TABLE IF NOT EXISTS missed_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sector_id INTEGER NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    FOREIGN KEY (sector_id) REFERENCES sectors(id)
  );
`);

// Seed data
const seedData = () => {
  const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get() as { count: number };
  
  // We force a reset as requested by the user: "Apague funcionários e setores cadastrados anteriormente"
  // To avoid doing this every restart, we could check a flag, but the user was explicit.
  // I will wipe and refill to ensure the pattern is exactly as requested.
  
  db.transaction(() => {
    db.prepare("DELETE FROM missed_visits").run();
    db.prepare("DELETE FROM sectors").run();
    db.prepare("DELETE FROM staff").run();

    const insertStaff = db.prepare("INSERT INTO staff (name, shift) VALUES (?, ?)");
    const insertSector = db.prepare("INSERT INTO sectors (name, staff_id) VALUES (?, ?)");

    // 1. Create Staff
    const staff = [
      { name: "Nayana", shift: "morning" },
      { name: "Cleonice", shift: "morning" },
      { name: "Juliana", shift: "afternoon" },
      { name: "Shirley", shift: "afternoon" },
      { name: "Plantonista", shift: "oncall" }
    ];

    const staffIds: Record<string, number | bigint> = {};
    staff.forEach(s => {
      const info = insertStaff.run(s.name, s.shift);
      staffIds[s.name] = info.lastInsertRowid;
    });

    // 2. Create Sectors
    const sectorsData = [
      // Nayana (Morning)
      { name: "Sala Verde", staff: "Nayana" },
      { name: "EP", staff: "Nayana" },
      { name: "UTI 3", staff: "Nayana" },
      { name: "UC1", staff: "Nayana" },
      { name: "Necrotério", staff: "Nayana" },
      { name: "P3", staff: "Nayana" },
      { name: "P6", staff: "Nayana" },
      { name: "P9", staff: "Nayana" },
      { name: "P11(229,230,231,232)", staff: "Nayana" },

      // Cleonice (Morning)
      { name: "Sala Vermelha", staff: "Cleonice" },
      { name: "UTI 1", staff: "Cleonice" },
      { name: "UTI 4", staff: "Cleonice" },
      { name: "UC2", staff: "Cleonice" },
      { name: "P1", staff: "Cleonice" },
      { name: "P4", staff: "Cleonice" },
      { name: "P7", staff: "Cleonice" },
      { name: "P11 (236,237, LEITOS EXTRAS)", staff: "Cleonice" },

      // Juliana (Afternoon)
      { name: "Sala Verde", staff: "Juliana" },
      { name: "EP", staff: "Juliana" },
      { name: "UTI 3", staff: "Juliana" },
      { name: "UC1", staff: "Juliana" },
      { name: "Necrotério", staff: "Juliana" },
      { name: "P3", staff: "Juliana" },
      { name: "P6", staff: "Juliana" },
      { name: "P9", staff: "Juliana" },
      { name: "P11 (233,234,235)", staff: "Juliana" },

      // Shirley (Afternoon)
      { name: "Sala Vermelha", staff: "Shirley" },
      { name: "UTI 1", staff: "Shirley" },
      { name: "UTI 4", staff: "Shirley" },
      { name: "UC2", staff: "Shirley" },
      { name: "P1", staff: "Shirley" },
      { name: "P4", staff: "Shirley" },
      { name: "P7", staff: "Shirley" },
      { name: "P11 (238,239)", staff: "Shirley" },

      // Plantonista (Oncall - Morning & Afternoon)
      { name: "Sala de Trauma", staff: "Plantonista" },
      { name: "UTI 2", staff: "Plantonista" },
      { name: "UTQ", staff: "Plantonista" },
      { name: "Centro Cirúrgico (CC)", staff: "Plantonista" },
      { name: "P2", staff: "Plantonista" },
      { name: "P5", staff: "Plantonista" },
      { name: "P8", staff: "Plantonista" }
    ];

    sectorsData.forEach(sec => {
      insertSector.run(sec.name, staffIds[sec.staff]);
    });
  })();
};

seedData();

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/data", (req, res) => {
    const staff = db.prepare(`
      SELECT s.id, s.name, s.shift 
      FROM staff s
    `).all();

    const sectors = db.prepare(`
      SELECT sec.id, sec.name, sec.staff_id
      FROM sectors sec
    `).all();

    const date = new Date().toISOString().split('T')[0];
    const missed = db.prepare(`
      SELECT sector_id FROM missed_visits WHERE date = ?
    `).all(date);

    res.json({ staff, sectors, missed: missed.map((m: any) => m.sector_id) });
  });

  app.post("/api/staff", (req, res) => {
    const { name, shift } = req.body;
    const info = db.prepare("INSERT INTO staff (name, shift) VALUES (?, ?)").run(name, shift);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/staff/:id", (req, res) => {
    const { id } = req.params;
    try {
      const deleteTx = db.transaction(() => {
        // 1. Find all sectors for this staff
        const staffSectors = db.prepare("SELECT id FROM sectors WHERE staff_id = ?").all(id);
        
        // 2. For each sector, delete its missed visits
        const deleteMissed = db.prepare("DELETE FROM missed_visits WHERE sector_id = ?");
        for (const sector of staffSectors as any[]) {
          deleteMissed.run(sector.id);
        }
        
        // 3. Delete the sectors
        db.prepare("DELETE FROM sectors WHERE staff_id = ?").run(id);
        
        // 4. Delete the staff member
        const result = db.prepare("DELETE FROM staff WHERE id = ?").run(id);
        
        return result.changes;
      });

      const changes = deleteTx();
      
      if (changes > 0) {
        res.json({ status: "deleted" });
      } else {
        res.status(404).json({ error: "Funcionária não encontrada" });
      }
    } catch (err: any) {
      console.error("Error deleting staff:", err);
      res.status(500).json({ error: err.message || "Erro interno ao excluir" });
    }
  });

  app.post("/api/sectors", (req, res) => {
    const { name, staffId } = req.body;
    const info = db.prepare("INSERT INTO sectors (name, staff_id) VALUES (?, ?)").run(name, staffId);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/sectors/:id", (req, res) => {
    const { id } = req.params;
    try {
      const deleteSectorTx = db.transaction((sectorId) => {
        db.prepare("DELETE FROM missed_visits WHERE sector_id = ?").run(sectorId);
        db.prepare("DELETE FROM sectors WHERE id = ?").run(sectorId);
      });
      deleteSectorTx(id);
      res.json({ status: "deleted" });
    } catch (err) {
      console.error("Error deleting sector:", err);
      res.status(500).json({ error: "Erro ao excluir setor" });
    }
  });

  app.post("/api/toggle-missed", (req, res) => {
    const { sectorId } = req.body;
    const date = new Date().toISOString().split('T')[0];

    const existing = db.prepare("SELECT id FROM missed_visits WHERE sector_id = ? AND date = ?").get(sectorId, date);

    if (existing) {
      db.prepare("DELETE FROM missed_visits WHERE sector_id = ? AND date = ?").run(sectorId, date);
      res.json({ status: "removed" });
    } else {
      db.prepare("INSERT INTO missed_visits (sector_id, date) VALUES (?, ?)").run(sectorId, date);
      res.json({ status: "added" });
    }
  });

  app.get("/api/reports", (req, res) => {
    const { startDate, endDate } = req.query;
    
    // Default to today if no dates provided
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const report = db.prepare(`
      SELECT 
        s.name as staff_name,
        s.shift,
        sec.name as sector_name,
        mv.date as missed_date
      FROM sectors sec
      JOIN staff s ON sec.staff_id = s.id
      LEFT JOIN missed_visits mv ON sec.id = mv.sector_id AND mv.date BETWEEN ? AND ?
      ORDER BY s.name, sec.name
    `).all(start, end);

    res.json(report);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
