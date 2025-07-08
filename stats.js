const sqlite3 = require("sqlite3").verbose()
const path = require("path")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function initDatabase() {
  const dbPath = path.join("/tmp", "facts.db")
  const db = new sqlite3.Database(dbPath)

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`)
  })

  return db
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    return res.status(200).json({})
  }

  Object.keys(corsHeaders).forEach((key) => {
    res.setHeader(key, corsHeaders[key])
  })

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const db = initDatabase()

  try {
    // Get total count
    db.get("SELECT COUNT(*) as total FROM facts", (err, totalRow) => {
      if (err) {
        console.error("Database error:", err)
        return res.status(500).json({ error: "Database error" })
      }

      // Get category breakdown
      db.all(
        "SELECT category, COUNT(*) as count FROM facts GROUP BY category ORDER BY count DESC",
        (err, categoryRows) => {
          if (err) {
            console.error("Database error:", err)
            return res.status(500).json({ error: "Database error" })
          }

          res.status(200).json({
            success: true,
            stats: {
              total: totalRow.total,
              categories: categoryRows,
            },
          })

          db.close()
        },
      )
    })
  } catch (error) {
    console.error("Stats error:", error)
    res.status(500).json({ error: "Failed to get stats" })
    db.close()
  }
}
