const sqlite3 = require("sqlite3").verbose()
const csv = require("csv-parser")
const path = require("path")

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const db = initDatabase()

  try {
    const { csvData } = req.body

    if (!csvData) {
      return res.status(400).json({ error: "CSV data is required" })
    }

    const facts = []
    const lines = csvData.split("\n")

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line) {
        const [text, category, source] = line.split(",").map((item) => item.replace(/"/g, "").trim())
        if (text && category) {
          facts.push({ text, category, source: source || "Bulk upload" })
        }
      }
    }

    if (facts.length === 0) {
      return res.status(400).json({ error: "No valid facts found in CSV data" })
    }

    let inserted = 0
    const insertPromises = facts.map((fact) => {
      return new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO facts (text, category, source) VALUES (?, ?, ?)",
          [fact.text, fact.category, fact.source],
          (err) => {
            if (err) {
              console.error("Insert error:", err)
              reject(err)
            } else {
              inserted++
              resolve()
            }
          },
        )
      })
    })

    await Promise.all(insertPromises)

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${inserted} facts`,
      count: inserted,
    })

    db.close()
  } catch (error) {
    console.error("Bulk upload error:", error)
    res.status(500).json({ error: "Failed to upload facts" })
    db.close()
  }
}
