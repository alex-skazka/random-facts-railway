// Node.js backend API for facts management
const express = require("express")
const cors = require("cors")
const sqlite3 = require("sqlite3").verbose()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const multer = require("multer")
const csv = require("csv-parser")
const fs = require("fs")

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// File upload configuration
const upload = multer({ dest: "uploads/" })

// Database setup
const db = new sqlite3.Database("facts.db")

// Initialize database
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT,
      tags TEXT,
      dateAdded INTEGER,
      hidden INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 1
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tier TEXT DEFAULT 'free',
      purchaseDate INTEGER,
      stripePaymentId TEXT
    )
  `)
})

class FactsAPI {
  // Get all facts
  async getFacts(req, res) {
    const { category, hidden } = req.query

    let query = "SELECT * FROM facts WHERE 1=1"
    const params = []

    if (category) {
      query += " AND category = ?"
      params.push(category)
    }

    if (hidden !== undefined) {
      query += " AND hidden = ?"
      params.push(hidden === "true" ? 1 : 0)
    }

    query += " ORDER BY dateAdded DESC"

    db.all(query, params, (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message })
        return
      }

      const facts = rows.map((row) => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
        hidden: Boolean(row.hidden),
        verified: Boolean(row.verified),
      }))

      res.json(facts)
    })
  }

  // Add new fact
  async addFact(req, res) {
    const { text, category, source, tags } = req.body

    if (!text || !category) {
      res.status(400).json({ error: "Text and category are required" })
      return
    }

    const fact = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      category,
      source: source || null,
      tags: JSON.stringify(tags || []),
      dateAdded: Date.now(),
      hidden: 0,
      verified: 1,
    }

    db.run(
      "INSERT INTO facts (id, text, category, source, tags, dateAdded, hidden, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [fact.id, fact.text, fact.category, fact.source, fact.tags, fact.dateAdded, fact.hidden, fact.verified],
      (err) => {
        if (err) {
          res.status(500).json({ error: err.message })
          return
        }
        res.json({ success: true, fact })
      },
    )
  }

  // Update fact
  async updateFact(req, res) {
    const { id } = req.params
    const { text, category, source, tags, hidden } = req.body

    db.run(
      "UPDATE facts SET text = ?, category = ?, source = ?, tags = ?, hidden = ? WHERE id = ?",
      [text, category, source, JSON.stringify(tags || []), hidden ? 1 : 0, id],
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message })
          return
        }
        res.json({ success: true, changes: this.changes })
      },
    )
  }

  // Delete fact
  async deleteFact(req, res) {
    const { id } = req.params

    db.run("DELETE FROM facts WHERE id = ?", [id], function (err) {
      if (err) {
        res.status(500).json({ error: err.message })
        return
      }
      res.json({ success: true, changes: this.changes })
    })
  }

  // Bulk upload facts
  async bulkUpload(req, res) {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" })
      return
    }

    const facts = []
    const validCategories = [
      "animals",
      "history",
      "space",
      "biology",
      "languages",
      "food",
      "geography",
      "science",
      "culture",
      "records",
      "inventions",
      "sports",
      "tech",
      "century",
    ]

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        if (row.text && row.category) {
          const fact = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            text: row.text.trim(),
            category: validCategories.includes(row.category.toLowerCase()) ? row.category.toLowerCase() : "science",
            source: row.source || null,
            tags: JSON.stringify(row.tags ? row.tags.split(";").map((t) => t.trim()) : []),
            dateAdded: Date.now(),
            hidden: 0,
            verified: 1,
          }
          facts.push(fact)
        }
      })
      .on("end", () => {
        // Insert all facts
        const stmt = db.prepare(
          "INSERT INTO facts (id, text, category, source, tags, dateAdded, hidden, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )

        facts.forEach((fact) => {
          stmt.run([
            fact.id,
            fact.text,
            fact.category,
            fact.source,
            fact.tags,
            fact.dateAdded,
            fact.hidden,
            fact.verified,
          ])
        })

        stmt.finalize()

        // Clean up uploaded file
        fs.unlinkSync(req.file.path)

        res.json({ success: true, imported: facts.length })
      })
  }

  // Verify Stripe payment
  async verifyPayment(req, res) {
    const { paymentIntentId, tier } = req.body

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      if (paymentIntent.status === "succeeded") {
        // Store user tier in database
        const userId = paymentIntent.metadata.userId || "anonymous"

        db.run(
          "INSERT OR REPLACE INTO users (id, tier, purchaseDate, stripePaymentId) VALUES (?, ?, ?, ?)",
          [userId, tier, Date.now(), paymentIntentId],
          (err) => {
            if (err) {
              res.status(500).json({ error: err.message })
              return
            }
            res.json({ verified: true, tier })
          },
        )
      } else {
        res.json({ verified: false })
      }
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  // Get database stats
  async getStats(req, res) {
    const queries = [
      "SELECT COUNT(*) as total FROM facts",
      "SELECT COUNT(*) as visible FROM facts WHERE hidden = 0",
      "SELECT COUNT(*) as hidden FROM facts WHERE hidden = 1",
      "SELECT COUNT(DISTINCT category) as categories FROM facts",
    ]

    const stats = {}
    let completed = 0

    queries.forEach((query, index) => {
      db.get(query, (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message })
          return
        }

        const key = Object.keys(row)[0]
        stats[key] = row[key]
        completed++

        if (completed === queries.length) {
          res.json(stats)
        }
      })
    })
  }
}

const factsAPI = new FactsAPI()

// Routes
app.get("/api/facts", factsAPI.getFacts.bind(factsAPI))
app.post("/api/facts", factsAPI.addFact.bind(factsAPI))
app.put("/api/facts/:id", factsAPI.updateFact.bind(factsAPI))
app.delete("/api/facts/:id", factsAPI.deleteFact.bind(factsAPI))
app.post("/api/facts/bulk-upload", upload.single("file"), factsAPI.bulkUpload.bind(factsAPI))
app.post("/api/verify-payment", factsAPI.verifyPayment.bind(factsAPI))
app.get("/api/stats", factsAPI.getStats.bind(factsAPI))

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

app.listen(port, () => {
  console.log(`🚀 Facts API server running on port ${port}`)
})

module.exports = app
