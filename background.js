// Configuration
const API_BASE_URL = "https://your-vercel-app.vercel.app/api"
const FACTS_PER_DAY_FREE = 5

// Storage keys
const STORAGE_KEYS = {
  PREMIUM_STATUS: "premiumStatus",
  DAILY_COUNT: "dailyFactCount",
  LAST_RESET_DATE: "lastResetDate",
  SELECTED_CATEGORIES: "selectedCategories",
  NOTIFICATION_TIME: "notificationTime",
  SAVED_FACTS: "savedFacts",
}

// Declare chrome variable
const chrome = window.chrome

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Daily Facts Extension installed")

  // Set default values
  chrome.storage.local.set({
    [STORAGE_KEYS.PREMIUM_STATUS]: false,
    [STORAGE_KEYS.DAILY_COUNT]: 0,
    [STORAGE_KEYS.LAST_RESET_DATE]: new Date().toDateString(),
    [STORAGE_KEYS.SELECTED_CATEGORIES]: ["all"],
    [STORAGE_KEYS.NOTIFICATION_TIME]: "09:00",
    [STORAGE_KEYS.SAVED_FACTS]: [],
  })

  // Create context menu
  chrome.contextMenus.create({
    id: "getDailyFact",
    title: "Get Daily Fact",
    contexts: ["all"],
  })
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "getDailyFact") {
    fetchAndShowFact()
  }
})

// Handle alarm for scheduled notifications
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyFact") {
    fetchAndShowFact()
  }
})

// Fetch and display a random fact
async function fetchAndShowFact() {
  try {
    // Check daily limit for free users
    const canGetFact = await checkDailyLimit()
    if (!canGetFact) {
      showNotification("Daily Limit Reached", "Upgrade to Premium for unlimited facts!")
      return
    }

    // Get user preferences
    const result = await chrome.storage.local.get([STORAGE_KEYS.SELECTED_CATEGORIES])
    const categories = result[STORAGE_KEYS.SELECTED_CATEGORIES] || ["all"]
    const category = categories[Math.floor(Math.random() * categories.length)]

    // Fetch fact from API
    const response = await fetch(`${API_BASE_URL}/facts?category=${category}&limit=1`)
    const data = await response.json()

    if (data.success && data.facts.length > 0) {
      const fact = data.facts[0]
      showNotification("Daily Fact", fact.text)

      // Update daily count for free users
      await updateDailyCount()
    } else {
      showNotification("No Facts Available", "Please try again later.")
    }
  } catch (error) {
    console.error("Error fetching fact:", error)
    showNotification("Error", "Failed to fetch fact. Please check your connection.")
  }
}

// Check if user can get more facts today
async function checkDailyLimit() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.PREMIUM_STATUS,
    STORAGE_KEYS.DAILY_COUNT,
    STORAGE_KEYS.LAST_RESET_DATE,
  ])

  // Premium users have unlimited access
  if (result[STORAGE_KEYS.PREMIUM_STATUS]) {
    return true
  }

  // Reset count if it's a new day
  const today = new Date().toDateString()
  if (result[STORAGE_KEYS.LAST_RESET_DATE] !== today) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.DAILY_COUNT]: 0,
      [STORAGE_KEYS.LAST_RESET_DATE]: today,
    })
    return true
  }

  // Check if under daily limit
  return (result[STORAGE_KEYS.DAILY_COUNT] || 0) < FACTS_PER_DAY_FREE
}

// Update daily fact count
async function updateDailyCount() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.PREMIUM_STATUS, STORAGE_KEYS.DAILY_COUNT])

  // Don't count for premium users
  if (result[STORAGE_KEYS.PREMIUM_STATUS]) {
    return
  }

  const newCount = (result[STORAGE_KEYS.DAILY_COUNT] || 0) + 1
  await chrome.storage.local.set({
    [STORAGE_KEYS.DAILY_COUNT]: newCount,
  })
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon48.png",
    title: title,
    message: message,
  })
}

// Set up daily notification alarm
async function setupDailyAlarm() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.NOTIFICATION_TIME])
  const notificationTime = result[STORAGE_KEYS.NOTIFICATION_TIME] || "09:00"

  const [hours, minutes] = notificationTime.split(":")
  const now = new Date()
  const scheduledTime = new Date()
  scheduledTime.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)

  // If the time has passed today, schedule for tomorrow
  if (scheduledTime <= now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1)
  }

  chrome.alarms.create("dailyFact", {
    when: scheduledTime.getTime(),
    periodInMinutes: 24 * 60, // Repeat daily
  })
}

// Initialize daily alarm on startup
setupDailyAlarm()

// Listen for messages from popup/options
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getFact") {
    fetchAndShowFact()
    sendResponse({ success: true })
  } else if (request.action === "updateAlarm") {
    setupDailyAlarm()
    sendResponse({ success: true })
  }
})
