const sqlite3 = require("sqlite3").verbose()
const path = require("path")

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Initialize database
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({})
  }

  // Set CORS headers
  Object.keys(corsHeaders).forEach((key) => {
    res.setHeader(key, corsHeaders[key])
  })

  const db = initDatabase()

  try {
    if (req.method === "GET") {
      const { category, limit = 1 } = req.query

      let query = "SELECT * FROM facts"
      const params = []

      if (category && category !== "all") {
        query += " WHERE category = ?"
        params.push(category)
      }

      query += " ORDER BY RANDOM() LIMIT ?"
      params.push(Number.parseInt(limit))

      db.all(query, params, (err, rows) => {
        if (err) {
          console.error("Database error:", err)
          return res.status(500).json({ error: "Database error" })
        }

        res.status(200).json({
          success: true,
          facts: rows,
          count: rows.length,
        })

        db.close()
      })
    } else if (req.method === "POST") {
      const { text, category, source } = req.body

      if (!text || !category) {
        return res.status(400).json({ error: "Text and category are required" })
      }

      db.run(
        "INSERT INTO facts (text, category, source) VALUES (?, ?, ?)",
        [text, category, source || "User submitted"],
        function (err) {
          if (err) {
            console.error("Insert error:", err)
            return res.status(500).json({ error: "Failed to add fact" })
          }

          res.status(201).json({
            success: true,
            id: this.lastID,
            message: "Fact added successfully",
          })

          db.close()
        },
      )
    } else {
      res.status(405).json({ error: "Method not allowed" })
      db.close()
    }
  } catch (error) {
    console.error("API error:", error)
    res.status(500).json({ error: "Internal server error" })
    db.close()
  }
}
