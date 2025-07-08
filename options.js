// Configuration
const API_BASE_URL = "https://your-vercel-app.vercel.app/api" // Update this with your Vercel URL
const STRIPE_PUBLISHABLE_KEY = "pk_test_your_stripe_key" // Update with your Stripe key

// Storage keys
const STORAGE_KEYS = {
  PREMIUM_STATUS: "premiumStatus",
  SELECTED_CATEGORIES: "selectedCategories",
  NOTIFICATION_TIME: "notificationTime",
  SAVED_FACTS: "savedFacts",
}

// Available categories
const CATEGORIES = [
  "all",
  "animals",
  "history",
  "space",
  "biology",
  "language",
  "food",
  "geography",
  "science",
  "culture",
  "records",
  "inventions",
  "sports",
  "technology",
  "21st-century",
]

// DOM elements
const statusDiv = document.getElementById("status")
const premiumStatus = document.getElementById("premiumStatus")
const upgradeBtn = document.getElementById("upgradeBtn")
const notificationTime = document.getElementById("notificationTime")
const categoryCheckboxes = document.getElementById("categoryCheckboxes")
const savedFactsList = document.getElementById("savedFactsList")
const clearSavedBtn = document.getElementById("clearSavedBtn")
const saveBtn = document.getElementById("saveBtn")

// Initialize options page
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings()
  setupEventListeners()
  await loadSavedFacts()
})

// Setup event listeners
function setupEventListeners() {
  saveBtn.addEventListener("click", saveSettings)
  upgradeBtn.addEventListener("click", upgradeToPremium)
  clearSavedBtn.addEventListener("click", clearSavedFacts)
}

// Load current settings
async function loadSettings() {
  try {
    const result = await window.chrome.storage.local.get([
      STORAGE_KEYS.PREMIUM_STATUS,
      STORAGE_KEYS.SELECTED_CATEGORIES,
      STORAGE_KEYS.NOTIFICATION_TIME,
    ])

    // Update premium status
    const isPremium = result[STORAGE_KEYS.PREMIUM_STATUS] || false
    updatePremiumStatus(isPremium)

    // Load notification time
    notificationTime.value = result[STORAGE_KEYS.NOTIFICATION_TIME] || "09:00"

    // Load selected categories
    const selectedCategories = result[STORAGE_KEYS.SELECTED_CATEGORIES] || ["all"]
    createCategoryCheckboxes(selectedCategories)
  } catch (error) {
    console.error("Error loading settings:", error)
    showStatus("Error loading settings", "error")
  }
}

// Update premium status display
function updatePremiumStatus(isPremium) {
  if (isPremium) {
    premiumStatus.innerHTML = `
      <div style="background: #d4edda; color: #155724; padding: 20px; border-radius: 10px; text-align: center;">
        <h2 style="color: #155724; margin-top: 0;">✨ Premium User</h2>
        <p>You have access to all premium features!</p>
      </div>
    `
  } else {
    premiumStatus.innerHTML = `
      <div class="premium-section">
        <h2>Upgrade to Premium</h2>
        <p>Get unlimited facts, custom categories, and more!</p>
        <button id="upgradeBtn">Upgrade for $3.99</button>
      </div>
    `
    // Re-attach event listener
    document.getElementById("upgradeBtn").addEventListener("click", upgradeToPremium)
  }
}

// Create category checkboxes
function createCategoryCheckboxes(selectedCategories) {
  categoryCheckboxes.innerHTML = ""

  CATEGORIES.forEach((category) => {
    const checkboxItem = document.createElement("div")
    checkboxItem.className = "checkbox-item"

    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.id = `category-${category}`
    checkbox.value = category
    checkbox.checked = selectedCategories.includes(category)

    const label = document.createElement("label")
    label.htmlFor = `category-${category}`
    label.textContent = category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")
    label.style.marginBottom = "0"

    checkboxItem.appendChild(checkbox)
    checkboxItem.appendChild(label)
    categoryCheckboxes.appendChild(checkboxItem)
  })
}

// Load saved facts
async function loadSavedFacts() {
  try {
    const result = await window.chrome.storage.local.get([STORAGE_KEYS.SAVED_FACTS])
    const savedFacts = result[STORAGE_KEYS.SAVED_FACTS] || []

    if (savedFacts.length === 0) {
      savedFactsList.innerHTML = '<p style="text-align: center; color: #666;">No saved facts yet.</p>'
      return
    }

    savedFactsList.innerHTML = ""
    savedFacts.forEach((fact, index) => {
      const factDiv = document.createElement("div")
      factDiv.className = "saved-fact"

      const savedDate = new Date(fact.savedAt).toLocaleDateString()

      factDiv.innerHTML = `
        <div class="fact-text">${fact.text}</div>
        <div class="fact-meta">
          Category: ${fact.category} • Saved: ${savedDate}
          <button onclick="removeSavedFact(${index})" style="float: right; background: #dc3545; padding: 5px 10px; font-size: 12px;">Remove</button>
        </div>
      `

      savedFactsList.appendChild(factDiv)
    })
  } catch (error) {
    console.error("Error loading saved facts:", error)
  }
}

// Remove a saved fact
window.removeSavedFact = async (index) => {
  try {
    const result = await window.chrome.storage.local.get([STORAGE_KEYS.SAVED_FACTS])
    const savedFacts = result[STORAGE_KEYS.SAVED_FACTS] || []

    savedFacts.splice(index, 1)

    await window.chrome.storage.local.set({
      [STORAGE_KEYS.SAVED_FACTS]: savedFacts,
    })

    await loadSavedFacts()
    showStatus("Fact removed successfully", "success")
  } catch (error) {
    console.error("Error removing saved fact:", error)
    showStatus("Error removing fact", "error")
  }
}

// Clear all saved facts
async function clearSavedFacts() {
  if (!confirm("Are you sure you want to clear all saved facts? This cannot be undone.")) {
    return
  }

  try {
    await window.chrome.storage.local.set({
      [STORAGE_KEYS.SAVED_FACTS]: [],
    })

    await loadSavedFacts()
    showStatus("All saved facts cleared", "success")
  } catch (error) {
    console.error("Error clearing saved facts:", error)
    showStatus("Error clearing saved facts", "error")
  }
}

// Save settings
async function saveSettings() {
  try {
    // Get selected categories
    const selectedCategories = []
    const checkboxes = categoryCheckboxes.querySelectorAll('input[type="checkbox"]:checked')
    checkboxes.forEach((checkbox) => {
      selectedCategories.push(checkbox.value)
    })

    if (selectedCategories.length === 0) {
      showStatus("Please select at least one category", "error")
      return
    }

    // Save settings
    await window.chrome.storage.local.set({
      [STORAGE_KEYS.SELECTED_CATEGORIES]: selectedCategories,
      [STORAGE_KEYS.NOTIFICATION_TIME]: notificationTime.value,
    })

    // Update alarm
    window.chrome.runtime.sendMessage({ action: "updateAlarm" })

    showStatus("Settings saved successfully", "success")
  } catch (error) {
    console.error("Error saving settings:", error)
    showStatus("Error saving settings", "error")
  }
}

// Upgrade to premium
async function upgradeToPremium() {
  try {
    // In a real implementation, you would integrate with Stripe
    const confirmed = confirm(
      "Upgrade to Premium for $3.99?\n\n✨ Unlimited daily facts\n🎯 Choose specific categories\n💾 Save unlimited facts\n⏰ Custom notification times",
    )

    if (confirmed) {
      // Simulate successful payment
      await window.chrome.storage.local.set({
        [STORAGE_KEYS.PREMIUM_STATUS]: true,
      })

      updatePremiumStatus(true)
      showStatus("Welcome to Premium! 🎉", "success")
    }
  } catch (error) {
    console.error("Error upgrading:", error)
    showStatus("Upgrade failed. Please try again.", "error")
  }
}

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message
  statusDiv.className = `status ${type}`
  statusDiv.style.display = "block"

  setTimeout(() => {
    statusDiv.style.display = "none"
  }, 3000)
}
