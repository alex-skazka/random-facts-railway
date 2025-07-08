class FactPopup {
  constructor() {
    this.settings = null
    this.currentFact = null
    this.chrome = window.chrome // Declare the chrome variable
    this.API_BASE_URL = "https://your-vercel-app.vercel.app/api" // Declare the API_BASE_URL variable
    this.STRIPE_PUBLISHABLE_KEY = "pk_test_your_stripe_key" // Declare the STRIPE_PUBLISHABLE_KEY variable
    this.STORAGE_KEYS = {
      PREMIUM_STATUS: "premiumStatus",
      DAILY_COUNT: "dailyFactCount",
      LAST_RESET_DATE: "lastResetDate",
      SELECTED_CATEGORIES: "selectedCategories",
      SAVED_FACTS: "savedFacts",
    }
    this.init()
  }

  async init() {
    await this.loadSettings()
    await this.loadCurrentFact()
    this.setupEventListeners()
    this.setupPauseControls() // Add this line
    this.updateUI()
  }

  async loadSettings() {
    const response = await this.chrome.runtime.sendMessage({ action: "getSettings" })
    this.settings = response.settings
  }

  async loadCurrentFact() {
    // Always load a new random fact when popup opens
    const facts = await this.getAvailableFacts()
    if (facts.length > 0) {
      // Check if we've run out of new facts
      const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000
      const unseenFacts = facts.filter((fact) => {
        const wasRecentlyShown = this.settings.factHistory.some(
          (historyItem) => historyItem.factId === fact.id && historyItem.timestamp > sixMonthsAgo,
        )
        return !wasRecentlyShown
      })

      if (unseenFacts.length === 0) {
        this.showNoNewFactsWarning()
        return
      }

      this.currentFact = unseenFacts[Math.floor(Math.random() * unseenFacts.length)]
      this.displayFact(this.currentFact)

      // Add to history when shown proactively
      await this.addToHistory(this.currentFact)
    }
  }

  async getAvailableFacts() {
    // Get facts from background script
    const response = await this.chrome.runtime.sendMessage({ action: "getFactsDatabase" })
    const allFacts = response.facts || []

    // Filter based on user tier and preferences
    let availableFacts = allFacts.filter((fact) => !fact.hidden)

    if (this.settings.tier !== "free") {
      availableFacts = availableFacts.filter((fact) => this.settings.categories.includes(fact.category))
    }

    return availableFacts
  }

  displayFact(fact) {
    if (!fact) return

    document.getElementById("factText").textContent = fact.text
    document.getElementById("factCategory").textContent = fact.category.toUpperCase()
    document.getElementById("saveFactBtn").style.display = "inline-block"
  }

  setupEventListeners() {
    document.getElementById("newFactBtn").addEventListener("click", () => {
      this.loadCurrentFact()
    })

    document.getElementById("saveFactBtn").addEventListener("click", () => {
      this.saveFact()
    })

    document.getElementById("settingsBtn").addEventListener("click", () => {
      this.chrome.runtime.openOptionsPage()
    })

    document.getElementById("upgradeBtn").addEventListener("click", () => {
      this.openUpgradeModal()
    })

    document.getElementById("historyBtn").addEventListener("click", () => {
      this.chrome.tabs.create({ url: this.chrome.runtime.getURL("options.html#history") })
    })

    document.getElementById("savedBtn").addEventListener("click", () => {
      this.chrome.tabs.create({ url: this.chrome.runtime.getURL("options.html#saved") })
    })

    document.getElementById("manageBtn").addEventListener("click", () => {
      this.chrome.tabs.create({ url: this.chrome.runtime.getURL("database-manager.html") })
    })

    // DOM elements
    const getFactBtn = document.getElementById("getFactBtn")
    const saveFactBtn = document.getElementById("saveFactBtn")
    const upgradeBtn = document.getElementById("upgradeBtn")
    const factText = document.getElementById("factText")
    const factCategory = document.getElementById("factCategory")
    const status = document.getElementById("status")
    const loading = document.getElementById("loading")
    const content = document.getElementById("content")
    const premiumBanner = document.getElementById("premiumBanner")
    const optionsLink = document.getElementById("optionsLink")

    // Setup event listeners
    getFactBtn.addEventListener("click", this.getFact.bind(this))
    saveFactBtn.addEventListener("click", this.saveFact.bind(this))
    upgradeBtn.addEventListener("click", this.upgradeToPremium.bind(this))
    optionsLink.addEventListener("click", () => {
      this.chrome.runtime.openOptionsPage()
    })
  }

  async saveFact() {
    if (!this.currentFact) return

    try {
      const result = await this.chrome.storage.local.get([this.STORAGE_KEYS.SAVED_FACTS])
      const savedFacts = result[this.STORAGE_KEYS.SAVED_FACTS] || []

      // Check if fact is already saved
      const isAlreadySaved = savedFacts.some((saved) => saved.id === this.currentFact.id)
      if (isAlreadySaved) {
        this.showMessage("Fact already saved!")
        return
      }

      // Add to saved facts
      savedFacts.push({
        ...this.currentFact,
        savedAt: new Date().toISOString(),
      })

      await this.chrome.storage.local.set({
        [this.STORAGE_KEYS.SAVED_FACTS]: savedFacts,
      })

      this.showMessage("Fact saved!")
      document.getElementById("saveFactBtn").textContent = "Saved ✓"
      document.getElementById("saveFactBtn").disabled = true
    } catch (error) {
      console.error("Error saving fact:", error)
      this.showError("Failed to save fact.")
    }
  }

  // Add upgrade prompt method
  showUpgradePrompt() {
    const modal = document.createElement("div")
    modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  `

    modal.innerHTML = `
    <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; text-align: center; font-family: 'Manrope', sans-serif;">
      <div style="font-size: 48px; margin-bottom: 15px;">🔒</div>
      <h3 style="color: var(--teal); margin-bottom: 15px; font-weight: 700;">Premium Feature</h3>
      <p style="color: var(--text-secondary); margin-bottom: 25px; line-height: 1.5;">
        Saving facts is a Premium feature. Upgrade to Premium for just <strong>$3.99</strong> to save unlimited facts, set your own schedule, and unlock all premium features!
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 10px 20px; background: #e9ecef; color: #6c757d; border: none; border-radius: 6px; cursor: pointer; font-family: 'Manrope', sans-serif; font-weight: 600;">Maybe Later</button>
        <button onclick="window.chrome.tabs.create({url: window.chrome.runtime.getURL('options.html#payment')}); this.parentElement.parentElement.parentElement.remove();" style="padding: 10px 20px; background: var(--pink); color: white; border: none; border-radius: 6px; cursor: pointer; font-family: 'Manrope', sans-serif; font-weight: 600;">Upgrade to Premium</button>
      </div>
    </div>
  `

    document.body.appendChild(modal)

    // Close on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  }

  updateUI() {
    // Update tier badge
    const tierBadge = document.getElementById("tierBadge")
    const tierNames = {
      free: "Free Tier",
      premium: "Premium",
    }

    tierBadge.textContent = tierNames[this.settings.tier]
    tierBadge.className = `tier-badge tier-${this.settings.tier}`

    // Show/hide premium banner
    const premiumBanner = document.getElementById("premiumBanner")
    if (this.settings.tier === "free") {
      premiumBanner.classList.remove("hidden")
    } else {
      premiumBanner.classList.add("hidden")
    }

    this.updateStats()
  }

  async updateStats() {
    const historyResponse = await this.chrome.runtime.sendMessage({ action: "getFactHistory" })
    const savedResponse = await this.chrome.runtime.sendMessage({ action: "getSavedFacts" })

    const history = historyResponse.history || []
    const savedFacts = savedResponse.savedFacts || []

    const today = new Date().toDateString()
    const todayFacts = history.filter((item) => new Date(item.timestamp).toDateString() === today)

    document.getElementById("todayCount").textContent = todayFacts.length
    document.getElementById("savedCount").textContent = savedFacts.length
    document.getElementById("totalCount").textContent = history.length
  }

  openUpgradeModal() {
    this.chrome.tabs.create({ url: this.chrome.runtime.getURL("options.html#payment") })
  }

  async setupPauseControls() {
    // Check if notifications are currently paused
    const pauseStatus = await this.chrome.storage.local.get("notificationsPaused")
    if (pauseStatus.notificationsPaused && pauseStatus.notificationsPaused.until > Date.now()) {
      this.showPauseStatus(pauseStatus.notificationsPaused)
    }

    // Add event listeners for pause buttons
    document.querySelectorAll(".pause-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.pauseNotifications(e.target.dataset.duration)
      })
    })

    document.getElementById("resumeBtn").addEventListener("click", () => {
      this.resumeNotifications()
    })
  }

  async pauseNotifications(duration) {
    let until

    if (duration === "tomorrow") {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0) // Resume at 9 AM tomorrow
      until = tomorrow.getTime()
    } else if (duration === "manual") {
      until = Number.MAX_SAFE_INTEGER // Pause indefinitely
    } else {
      until = Date.now() + Number.parseInt(duration)
    }

    const pauseData = {
      until,
      pausedAt: Date.now(),
      duration: duration,
    }

    await this.chrome.storage.local.set({ notificationsPaused: pauseData })
    this.showPauseStatus(pauseData)
  }

  async resumeNotifications() {
    await this.chrome.storage.local.remove("notificationsPaused")
    document.getElementById("pauseStatus").style.display = "none"
    document.querySelector(".pause-buttons").style.display = "grid"
  }

  showPauseStatus(pauseData) {
    const pauseStatus = document.getElementById("pauseStatus")
    const pauseText = document.getElementById("pauseText")

    let statusText = "Notifications paused"

    if (pauseData.until === Number.MAX_SAFE_INTEGER) {
      statusText += " until you turn them back on"
    } else if (pauseData.duration === "tomorrow") {
      statusText += " until tomorrow at 9 AM"
    } else {
      const remainingTime = pauseData.until - Date.now()
      const hours = Math.floor(remainingTime / (1000 * 60 * 60))
      const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) {
        statusText += ` for ${hours}h ${minutes}m`
      } else {
        statusText += ` for ${minutes}m`
      }
    }

    pauseText.textContent = statusText
    pauseStatus.style.display = "block"
    document.querySelector(".pause-buttons").style.display = "none"
  }

  showNoNewFactsWarning() {
    const factDisplay = document.getElementById("factDisplay")
    factDisplay.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="font-size: 32px; margin-bottom: 15px;">🤓</div>
      <h4 style="color: var(--teal); margin-bottom: 10px;">You're a Knowledge Champion!</h4>
      <p style="font-size: 13px; line-height: 1.4; margin-bottom: 20px; color: var(--text-secondary);">
        We're constantly adding new interesting facts for you, but your thirst for knowledge runs ahead of us! 
        We don't have any new facts to show you yet but you can choose to get shown the facts you've already seen.
      </p>
      <div style="display: flex; gap: 8px;">
        <button onclick="this.parentElement.parentElement.parentElement.innerHTML='<div class=\\'fact-text\\'>We\\'ll notify you when new facts arrive! 📚</div>'" 
                style="flex: 1; padding: 10px; font-size: 11px; background: var(--gold); color: white; border: none; border-radius: 6px; cursor: pointer;">
          No, tell me when you have new facts
        </button>
        <button onclick="window.recycleOldFacts()" 
                style="flex: 1; padding: 10px; font-size: 11px; background: var(--teal); color: white; border: none; border-radius: 6px; cursor: pointer;">
          Sure, recycle old facts
        </button>
      </div>
    </div>
  `
  }

  async addToHistory(fact) {
    const response = await this.chrome.runtime.sendMessage({
      action: "addToHistory",
      fact: fact,
    })
  }

  async getFact() {
    try {
      this.showLoading(true)

      // Check if user can get more facts
      const canGetFact = await this.checkDailyLimit()
      if (!canGetFact) {
        this.showError("Daily limit reached. Upgrade to Premium for unlimited facts!")
        return
      }

      // Get user preferences
      const result = await this.chrome.storage.local.get([this.STORAGE_KEYS.SELECTED_CATEGORIES])
      const categories = result[this.STORAGE_KEYS.SELECTED_CATEGORIES] || ["all"]
      const category = categories[Math.floor(Math.random() * categories.length)]

      // Fetch fact from API
      const response = await fetch(`${this.API_BASE_URL}/facts?category=${category}&limit=1`)
      const data = await response.json()

      if (data.success && data.facts.length > 0) {
        this.currentFact = data.facts[0]
        this.displayFact(this.currentFact)

        // Update daily count
        await this.updateDailyCount()
        await this.updateUI()
      } else {
        this.showError("No facts available. Please try again later.")
      }
    } catch (error) {
      console.error("Error fetching fact:", error)
      this.showError("Failed to fetch fact. Please check your connection.")
    } finally {
      this.showLoading(false)
    }
  }

  async checkDailyLimit() {
    const result = await this.chrome.storage.local.get([
      this.STORAGE_KEYS.PREMIUM_STATUS,
      this.STORAGE_KEYS.DAILY_COUNT,
      this.STORAGE_KEYS.LAST_RESET_DATE,
    ])

    // Premium users have unlimited access
    if (result[this.STORAGE_KEYS.PREMIUM_STATUS]) {
      return true
    }

    // Reset count if it's a new day
    const today = new Date().toDateString()
    if (result[this.STORAGE_KEYS.LAST_RESET_DATE] !== today) {
      await this.chrome.storage.local.set({
        [this.STORAGE_KEYS.DAILY_COUNT]: 0,
        [this.STORAGE_KEYS.LAST_RESET_DATE]: today,
      })
      return true
    }

    // Check if under daily limit
    return (result[this.STORAGE_KEYS.DAILY_COUNT] || 0) < 5
  }

  async updateDailyCount() {
    const result = await this.chrome.storage.local.get([
      this.STORAGE_KEYS.PREMIUM_STATUS,
      this.STORAGE_KEYS.DAILY_COUNT,
    ])

    // Don't count for premium users
    if (result[this.STORAGE_KEYS.PREMIUM_STATUS]) {
      return
    }

    const newCount = (result[this.STORAGE_KEYS.DAILY_COUNT] || 0) + 1
    await this.chrome.storage.local.set({
      [this.STORAGE_KEYS.DAILY_COUNT]: newCount,
    })
  }

  showLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none"
    document.getElementById("content").style.display = show ? "none" : "block"
  }

  showError(message) {
    document.getElementById("factText").textContent = message
    document.getElementById("factCategory").textContent = ""
    document.getElementById("saveFactBtn").style.display = "none"
  }

  showMessage(message) {
    const originalText = document.getElementById("factText").textContent
    document.getElementById("factText").textContent = message
    setTimeout(() => {
      document.getElementById("factText").textContent = originalText
    }, 2000)
  }

  async upgradeToPremium() {
    try {
      // In a real implementation, you would integrate with Stripe
      // For now, we'll simulate the upgrade
      const confirmed = confirm(
        "Upgrade to Premium for $3.99?\n\n✨ Unlimited daily facts\n🎯 Choose specific categories\n💾 Save unlimited facts\n⏰ Custom notification times",
      )

      if (confirmed) {
        // Simulate successful payment
        await this.chrome.storage.local.set({
          [this.STORAGE_KEYS.PREMIUM_STATUS]: true,
        })

        this.showMessage("Welcome to Premium! 🎉")
        await this.updateUI()
      }
    } catch (error) {
      console.error("Error upgrading:", error)
      this.showError("Upgrade failed. Please try again.")
    }
  }
}

// Add global function for recycling facts
window.recycleOldFacts = async () => {
  const popup = new FactPopup()
  await popup.loadSettings()
  const facts = await popup.getAvailableFacts()
  if (facts.length > 0) {
    const randomFact = facts[Math.floor(Math.random() * facts.length)]
    popup.displayFact(randomFact)
    popup.currentFact = randomFact
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const popup = new FactPopup()
  await popup.updateUI()
})
