class DatabaseManager {
  constructor() {
    this.facts = []
    this.filteredFacts = []
    this.editingFactId = null
    this.chrome = window.chrome // Declare the chrome variable
    this.init()
  }

  async init() {
    await this.loadFacts()
    this.setupEventListeners()
    this.renderFacts()
    this.updateStats()
  }

  async loadFacts() {
    try {
      const response = await this.chrome.runtime.sendMessage({ action: "getFactsDatabase" })
      this.facts = response.facts || []
      this.filteredFacts = [...this.facts]
    } catch (error) {
      console.error("Failed to load facts:", error)
      this.facts = []
      this.filteredFacts = []
    }
  }

  setupEventListeners() {
    // Search functionality
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.filterFacts()
    })

    // Category filter
    document.getElementById("categoryFilter").addEventListener("change", () => {
      this.filterFacts()
    })

    // Status filter
    document.getElementById("statusFilter").addEventListener("change", () => {
      this.filterFacts()
    })

    // Add fact button
    document.getElementById("addFactBtn").addEventListener("click", () => {
      this.openFactModal()
    })

    // Export button
    document.getElementById("exportBtn").addEventListener("click", () => {
      this.exportDatabase()
    })

    // Modal controls
    document.getElementById("cancelBtn").addEventListener("click", () => {
      this.closeFactModal()
    })

    document.getElementById("factForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.saveFact()
    })

    // Close modal on outside click
    document.getElementById("factModal").addEventListener("click", (e) => {
      if (e.target.id === "factModal") {
        this.closeFactModal()
      }
    })

    // Bulk upload button
    document.getElementById("bulkUploadBtn").addEventListener("click", () => {
      document.getElementById("bulkUpload").click()
    })

    // File upload handler
    document.getElementById("bulkUpload").addEventListener("change", (e) => {
      this.handleBulkUpload(e.target.files[0])
    })

    // Drag and drop
    document.getElementById("uploadArea").addEventListener("dragover", (event) => {
      event.preventDefault()
      document.getElementById("uploadArea").classList.add("dragover")
    })

    document.getElementById("uploadArea").addEventListener("dragleave", (event) => {
      event.preventDefault()
      document.getElementById("uploadArea").classList.remove("dragover")
    })

    document.getElementById("uploadArea").addEventListener("drop", (event) => {
      event.preventDefault()
      document.getElementById("uploadArea").classList.remove("dragover")

      const files = event.dataTransfer.files
      if (files.length > 0) {
        uploadFile(files[0])
      }
    })
  }

  async handleBulkUpload(file) {
    if (!file) return

    const fileExtension = file.name.split(".").pop().toLowerCase()

    try {
      let data
      if (fileExtension === "csv") {
        data = await this.parseCSV(file)
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        data = await this.parseExcel(file)
      } else {
        alert("Please upload a CSV or Excel file.")
        return
      }

      await this.processBulkData(data)
      this.showSuccessMessage(`Successfully imported ${data.length} facts!`)
      this.filterFacts()
      this.updateStats()
    } catch (error) {
      console.error("Bulk upload failed:", error)
      alert("Failed to process file. Please check the format and try again.")
    }
  }

  async parseCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const csv = e.target.result
          const lines = csv.split("\n")
          const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

          const data = []
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(",")
              const fact = {}
              headers.forEach((header, index) => {
                fact[header] = values[index]?.trim().replace(/"/g, "") || ""
              })
              data.push(fact)
            }
          }
          resolve(data)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  async parseExcel(file) {
    // For Excel files, we'll use a simple approach
    // In a real implementation, you'd use a library like SheetJS
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          // This is a simplified parser - in production use SheetJS
          alert("Excel parsing requires additional libraries. Please use CSV format for now.")
          resolve([])
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  async processBulkData(data) {
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

    data.forEach((row) => {
      if (row.text || row.fact) {
        const newFact = {
          id: this.generateId(),
          text: row.text || row.fact || "",
          category: validCategories.includes(row.category?.toLowerCase()) ? row.category.toLowerCase() : "science",
          source: row.source || null,
          tags: row.tags ? row.tags.split(";").map((tag) => tag.trim()) : [],
          dateAdded: Date.now(),
          hidden: false,
        }

        if (newFact.text) {
          this.facts.push(newFact)
        }
      }
    })

    await this.saveToStorage()
  }

  showSuccessMessage(message) {
    const messageDiv = document.createElement("div")
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 1000;
      font-family: 'Manrope', sans-serif;
      background: var(--teal);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `
    messageDiv.textContent = message

    document.body.appendChild(messageDiv)

    setTimeout(() => {
      messageDiv.remove()
    }, 3000)
  }

  filterFacts() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase()
    const categoryFilter = document.getElementById("categoryFilter").value
    const statusFilter = document.getElementById("statusFilter").value

    this.filteredFacts = this.facts.filter((fact) => {
      const matchesSearch =
        fact.text.toLowerCase().includes(searchTerm) ||
        fact.category.toLowerCase().includes(searchTerm) ||
        (fact.source && fact.source.toLowerCase().includes(searchTerm)) ||
        (fact.tags && fact.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))

      const matchesCategory = !categoryFilter || fact.category === categoryFilter

      const matchesStatus =
        !statusFilter || (statusFilter === "visible" && !fact.hidden) || (statusFilter === "hidden" && fact.hidden)

      return matchesSearch && matchesCategory && matchesStatus
    })

    this.renderFacts()
  }

  renderFacts() {
    const container = document.getElementById("factsContainer")

    if (this.filteredFacts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No facts found</h3>
          <p>Try adjusting your search or filters, or add a new fact.</p>
        </div>
      `
      return
    }

    container.innerHTML = this.filteredFacts.map((fact) => this.renderFactCard(fact)).join("")

    // Add event listeners to action buttons
    this.attachFactCardListeners()
  }

  renderFactCard(fact) {
    const date = new Date(fact.dateAdded).toLocaleDateString()
    const tags = fact.tags ? fact.tags.join(", ") : ""

    return `
      <div class="fact-card ${fact.hidden ? "hidden" : ""}" data-id="${fact.id}">
        <div class="fact-header">
          <div class="fact-content">
            <div class="fact-text">${fact.text}</div>
            <div class="fact-meta">
              <span class="category-badge category-${fact.category}">${fact.category}</span>
              ${fact.source ? `<span class="fact-source">Source: ${fact.source}</span>` : ""}
            </div>
          </div>
          <div class="fact-actions">
            <button class="btn btn-small btn-secondary edit-btn" data-id="${fact.id}">Edit</button>
            <button class="btn btn-small ${fact.hidden ? "btn-primary" : "btn-secondary"} toggle-btn" data-id="${fact.id}">
              ${fact.hidden ? "Show" : "Hide"}
            </button>
            <button class="btn btn-small btn-danger delete-btn" data-id="${fact.id}">Delete</button>
          </div>
        </div>
        <div class="fact-footer">
          <span>Added: ${date}</span>
          ${tags ? `<span>Tags: ${tags}</span>` : ""}
        </div>
      </div>
    `
  }

  attachFactCardListeners() {
    // Edit buttons
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const factId = e.target.dataset.id
        this.editFact(factId)
      })
    })

    // Toggle visibility buttons
    document.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const factId = e.target.dataset.id
        this.toggleFactVisibility(factId)
      })
    })

    // Delete buttons
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const factId = e.target.dataset.id
        this.deleteFact(factId)
      })
    })
  }

  openFactModal(fact = null) {
    const modal = document.getElementById("factModal")
    const title = document.getElementById("modalTitle")
    const form = document.getElementById("factForm")

    if (fact) {
      title.textContent = "Edit Fact"
      document.getElementById("factText").value = fact.text
      document.getElementById("factCategory").value = fact.category
      document.getElementById("factSource").value = fact.source || ""
      document.getElementById("factTags").value = fact.tags ? fact.tags.join(", ") : ""
      this.editingFactId = fact.id
    } else {
      title.textContent = "Add New Fact"
      form.reset()
      this.editingFactId = null
    }

    modal.classList.add("active")
  }

  closeFactModal() {
    const modal = document.getElementById("factModal")
    modal.classList.remove("active")
    this.editingFactId = null
  }

  async saveFact() {
    const text = document.getElementById("factText").value.trim()
    const category = document.getElementById("factCategory").value
    const source = document.getElementById("factSource").value.trim()
    const tagsInput = document.getElementById("factTags").value.trim()
    const tags = tagsInput ? tagsInput.split(",").map((tag) => tag.trim()) : []

    if (!text || !category) {
      alert("Please fill in all required fields.")
      return
    }

    const factData = {
      text,
      category,
      source: source || null,
      tags,
      dateAdded: this.editingFactId ? this.findFactById(this.editingFactId).dateAdded : Date.now(),
      hidden: this.editingFactId ? this.findFactById(this.editingFactId).hidden : false,
    }

    if (this.editingFactId) {
      // Update existing fact
      const factIndex = this.facts.findIndex((f) => f.id === this.editingFactId)
      this.facts[factIndex] = { ...this.facts[factIndex], ...factData }
    } else {
      // Add new fact
      const newFact = {
        id: this.generateId(),
        ...factData,
      }
      this.facts.push(newFact)
    }

    await this.saveToStorage()
    this.closeFactModal()
    this.filterFacts()
    this.updateStats()
  }

  editFact(factId) {
    const fact = this.findFactById(factId)
    if (fact) {
      this.openFactModal(fact)
    }
  }

  async toggleFactVisibility(factId) {
    const fact = this.findFactById(factId)
    if (fact) {
      fact.hidden = !fact.hidden
      await this.saveToStorage()
      this.filterFacts()
      this.updateStats()
    }
  }

  async deleteFact(factId) {
    if (confirm("Are you sure you want to delete this fact? This action cannot be undone.")) {
      this.facts = this.facts.filter((f) => f.id !== factId)
      await this.saveToStorage()
      this.filterFacts()
      this.updateStats()
    }
  }

  async saveToStorage() {
    const database = {
      facts: this.facts,
      lastUpdated: Date.now(),
    }

    try {
      await this.chrome.runtime.sendMessage({
        action: "updateFactsDatabase",
        database,
      })
    } catch (error) {
      console.error("Failed to save facts:", error)
      alert("Failed to save changes. Please try again.")
    }
  }

  updateStats() {
    const total = this.facts.length
    const visible = this.facts.filter((f) => !f.hidden).length
    const hidden = total - visible
    const categories = new Set(this.facts.map((f) => f.category)).size

    document.getElementById("totalFacts").textContent = total.toLocaleString()
    document.getElementById("visibleFacts").textContent = visible.toLocaleString()
    document.getElementById("hiddenFacts").textContent = hidden.toLocaleString()
    document.getElementById("categoriesCount").textContent = categories
  }

  exportDatabase() {
    const dataStr = JSON.stringify(this.facts, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `facts-database-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  findFactById(id) {
    return this.facts.find((f) => f.id === id)
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }
}

// Configuration
const API_BASE_URL = window.location.origin + "/api"

// DOM elements
const uploadArea = document.getElementById("uploadArea")
const fileInput = document.getElementById("fileInput")
const uploadProgress = document.getElementById("uploadProgress")
const progressBar = document.getElementById("progressBar")
const uploadLog = document.getElementById("uploadLog")
const totalFacts = document.getElementById("totalFacts")
const totalCategories = document.getElementById("totalCategories")
const categoryList = document.getElementById("categoryList")
const sampleFacts = document.getElementById("sampleFacts")

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  new DatabaseManager()
  loadStats()
  loadSampleFacts()
})

// Upload file
async function uploadFile(file) {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    logMessage("Error: Please select a CSV file", "error")
    return
  }

  try {
    showProgress(true)
    logMessage("Reading CSV file...", "info")

    const csvData = await readFileAsText(file)
    logMessage(`File read successfully. Size: ${(file.size / 1024).toFixed(2)} KB`, "success")

    // Validate CSV format
    const lines = csvData.split("\n")
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header and one data row")
    }

    logMessage(`Found ${lines.length - 1} facts to upload...`, "info")
    updateProgress(25)

    // Upload to API
    const response = await fetch(`${API_BASE_URL}/bulk-upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ csvData }),
    })

    updateProgress(75)

    const result = await response.json()

    if (result.success) {
      logMessage(`✅ Successfully uploaded ${result.count} facts!`, "success")
      updateProgress(100)

      // Refresh stats
      setTimeout(() => {
        loadStats()
        showProgress(false)
      }, 1000)
    } else {
      throw new Error(result.error || "Upload failed")
    }
  } catch (error) {
    logMessage(`❌ Upload failed: ${error.message}`, "error")
    showProgress(false)
  }
}

// Read file as text
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

// Load statistics
async function loadStats() {
  try {
    logMessage("Loading database statistics...", "info")

    const response = await fetch(`${API_BASE_URL}/stats`)
    const result = await response.json()

    if (result.success) {
      const stats = result.stats

      // Update total stats
      totalFacts.textContent = stats.total.toLocaleString()
      totalCategories.textContent = stats.categories.length

      // Update category breakdown
      categoryList.innerHTML = ""
      stats.categories.forEach((category) => {
        const categoryItem = document.createElement("div")
        categoryItem.className = "category-item"
        categoryItem.innerHTML = `
                    <div style="font-weight: bold; text-transform: capitalize;">${category.category}</div>
                    <div class="category-count">${category.count}</div>
                `
        categoryList.appendChild(categoryItem)
      })

      logMessage(`✅ Loaded stats: ${stats.total} total facts across ${stats.categories.length} categories`, "success")
    } else {
      throw new Error(result.error || "Failed to load stats")
    }
  } catch (error) {
    logMessage(`❌ Failed to load stats: ${error.message}`, "error")

    // Show default values
    totalFacts.textContent = "0"
    totalCategories.textContent = "0"
    categoryList.innerHTML = '<p style="text-align: center; color: #666;">No data available</p>'
  }
}

// Load sample facts
async function loadSampleFacts() {
  try {
    logMessage("Loading sample facts...", "info")

    const response = await fetch(`${API_BASE_URL}/facts?limit=5`)
    const result = await response.json()

    if (result.success && result.facts.length > 0) {
      sampleFacts.innerHTML = ""

      result.facts.forEach((fact, index) => {
        const factDiv = document.createElement("div")
        factDiv.style.cssText = `
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 10px;
                    border-left: 4px solid #667eea;
                `

        factDiv.innerHTML = `
                    <div style="font-weight: bold;margin-bottom: 8px;">${fact.text}</div>
                    <div style="font-size: 12px; color: #666;">
                        Category: ${fact.category} | 
                        Source: ${fact.source || "Unknown"} |
                        ID: ${fact.id}
                    </div>
                `

        sampleFacts.appendChild(factDiv)
      })

      logMessage(`✅ Loaded ${result.facts.length} sample facts`, "success")
    } else {
      sampleFacts.innerHTML = '<p style="text-align: center; color: #666;">No facts available</p>'
      logMessage("No facts found in database", "warning")
    }
  } catch (error) {
    logMessage(`❌ Failed to load sample facts: ${error.message}`, "error")
    sampleFacts.innerHTML = '<p style="text-align: center; color: #dc3545;">Error loading facts</p>'
  }
}

// Show/hide progress
function showProgress(show) {
  uploadProgress.style.display = show ? "block" : "none"
  uploadLog.style.display = show ? "block" : "none"

  if (!show) {
    updateProgress(0)
  }
}

// Update progress bar
function updateProgress(percent) {
  progressBar.style.width = `${percent}%`
}

// Log message
function logMessage(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString()
  const logEntry = `[${timestamp}] ${message}\n`

  uploadLog.textContent += logEntry
  uploadLog.scrollTop = uploadLog.scrollHeight

  // Add color based on type
  const lines = uploadLog.textContent.split("\n")
  const lastLine = lines[lines.length - 2] // -2 because last element is empty

  if (type === "error") {
    uploadLog.innerHTML = uploadLog.innerHTML.replace(lastLine, `<span class="error">${lastLine}</span>`)
  } else if (type === "success") {
    uploadLog.innerHTML = uploadLog.innerHTML.replace(lastLine, `<span class="success">${lastLine}</span>`)
  } else if (type === "warning") {
    uploadLog.innerHTML = uploadLog.innerHTML.replace(lastLine, `<span class="warning">${lastLine}</span>`)
  }
}
