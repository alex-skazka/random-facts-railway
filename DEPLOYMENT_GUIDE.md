# Daily Facts Extension - Complete Deployment Guide

## 🎯 Overview
This guide will walk you through deploying your Daily Facts browser extension step-by-step. We'll use Vercel (free) for the backend and Chrome Web Store for the extension.

## 📋 What You'll Need
- GitHub account (free)
- Vercel account (free) 
- Stripe account (free)
- Chrome Web Store Developer account ($5 one-time fee)
- Basic familiarity with terminal/command line

---

## 🚀 Step 1: Set Up Your Backend on Vercel

### 1.1 Create GitHub Repository

1. **Go to GitHub.com** and sign in
2. **Click "New Repository"**
3. **Name it:** `daily-facts-extension`
4. **Make it Public** (required for free Vercel)
5. **Click "Create Repository"**

### 1.2 Upload Your Code to GitHub

**Option A: Using GitHub Web Interface (Easiest)**
1. Download all files from the code project above
2. In your new GitHub repo, click "uploading an existing file"
3. Drag and drop all the files
4. Write commit message: "Initial extension code"
5. Click "Commit changes"

**Option B: Using Command Line**
\`\`\`bash
# Download files to a folder, then:
git init
git add .
git commit -m "Initial extension code"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/daily-facts-extension.git
git push -u origin main
\`\`\`

### 1.3 Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign up with GitHub
2. **Click "New Project"**
3. **Import your `daily-facts-extension` repository**
4. **Configure Project:**
   - Framework Preset: **Other**
   - Root Directory: **/** (leave default)
   - Build Command: **Leave empty**
   - Output Directory: **Leave empty**
5. **Click "Deploy"**

### 1.4 Add Environment Variables

1. **In your Vercel project dashboard**, go to **Settings → Environment Variables**
2. **Add these variables:**
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_test_your_stripe_secret_key_here` (we'll get this in Step 2)
   - Environment: **All** (Production, Preview, Development)

### 1.5 Get Your API URL

After deployment, Vercel will give you a URL like:
`https://daily-facts-extension-abc123.vercel.app`

**Save this URL** - you'll need it for the extension!

---

## 💳 Step 2: Set Up Stripe for Payments

### 2.1 Create Stripe Account
1. **Go to [stripe.com](https://stripe.com)** and sign up
2. **Complete account verification** (may take a few minutes)
3. **Go to Dashboard**

### 2.2 Get Your API Keys
1. **In Stripe Dashboard**, click **Developers → API Keys**
2. **Copy your keys:**
   - **Publishable key:** `pk_test_...` (starts with pk_test)
   - **Secret key:** `sk_test_...` (starts with sk_test)

### 2.3 Update Vercel Environment Variables
1. **Go back to Vercel** → Your Project → Settings → Environment Variables
2. **Update `STRIPE_SECRET_KEY`** with your real secret key
3. **Click "Save"**
4. **Redeploy:** Go to Deployments tab → Click "..." on latest deployment → "Redeploy"

### 2.4 Create Stripe Product
1. **In Stripe Dashboard**, go to **Products**
2. **Click "Add Product"**
3. **Fill out:**
   - Name: `Daily Facts Premium`
   - Description: `Unlimited facts, custom schedule, save favorites`
4. **Add Price:**
   - Price: `$3.99`
   - Billing: `One time`
   - Currency: `USD`
5. **Save the Price ID** (starts with `price_...`)

---

## 🔧 Step 3: Update Extension Files

### 3.1 Update API Endpoints
Replace `https://your-domain.com` in these files with your Vercel URL:

**In `background.js`:**
\`\`\`javascript
// Find this line:
const response = await fetch("https://your-api-endpoint.com/facts")
// Replace with:
const response = await fetch("https://your-vercel-url.vercel.app/api/facts")

// Find this line:
const response = await fetch("https://your-backend.com/verify-payment", {
// Replace with:
const response = await fetch("https://your-vercel-url.vercel.app/api/verify-payment", {
\`\`\`

**In `manifest.json`:**
\`\`\`json
"host_permissions": ["https://your-vercel-url.vercel.app/*", "https://api.stripe.com/*"]
\`\`\`

### 3.2 Update Stripe Keys
**In `options.js`:**
\`\`\`javascript
// Find this line:
this.stripe = Stripe("pk_test_your_publishable_key_here")
// Replace with your real publishable key:
this.stripe = Stripe("pk_test_your_real_key_here")
\`\`\`

---

## 📊 Step 4: Upload Your Facts Database

### 4.1 Access Database Manager
1. **Go to:** `https://your-vercel-url.vercel.app/database-manager.html`
2. **You should see the database management interface**

### 4.2 Upload Facts
1. **Download the `final-complete-facts-database.csv`** from the code project above
2. **In Database Manager**, click **"Bulk Upload"**
3. **Select the CSV file**
4. **Click "Upload"**
5. **Wait for confirmation** (should show "168 facts imported")

### 4.3 Test Your API
Visit: `https://your-vercel-url.vercel.app/api/facts`
You should see JSON data with all your facts!

---

## 🌐 Step 5: Package Extension for Chrome Web Store

### 5.1 Create Extension Package
1. **Create a new folder** called `extension-package`
2. **Copy these files into it:**
   - `manifest.json` (updated with your URLs)
   - `background.js` (updated with your URLs)
   - `popup.html`
   - `popup.js`
   - `options.html`
   - `options.js` (updated with your Stripe key)
   - `database-manager.html`
   - `database-manager.js`
   - Create `icons` folder with placeholder icons

### 5.2 Create Icons
Create these files in the `icons` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

**Quick icon creation:**
- Use [favicon.io](https://favicon.io/favicon-generator/) 
- Or create simple colored squares in any image editor
- Make them the same design in different sizes

### 5.3 Create ZIP File
1. **Select all files** in your `extension-package` folder
2. **Right-click → "Compress" or "Send to → Compressed folder"**
3. **Name it:** `daily-facts-extension.zip`

---

## 🏪 Step 6: Submit to Chrome Web Store

### 6.1 Set Up Developer Account
1. **Go to [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)**
2. **Pay the $5 registration fee** (one-time)
3. **Complete developer verification**

### 6.2 Upload Extension
1. **Click "New Item"**
2. **Upload your `daily-facts-extension.zip`**
3. **Fill out the store listing:**

**Required Information:**
- **Name:** Daily Facts
- **Summary:** Get interesting facts delivered throughout your day
- **Description:** 
\`\`\`
Discover fascinating facts from science, history, animals, and more! 

🎯 FREE TIER:
• 5 random facts per day
• 14 different categories
• Clean, simple interface

💎 PREMIUM ($3.99 one-time):
• Unlimited facts
• Choose your delivery schedule
• Select favorite categories
• Save facts you love
• No ads, forever

Perfect for curious minds who love learning something new every day!
\`\`\`

- **Category:** Education
- **Language:** English
- **Screenshots:** Take screenshots of your extension popup and options page
- **Privacy Policy:** Create a simple privacy policy (required)

### 6.3 Submit for Review
1. **Click "Submit for Review"**
2. **Review typically takes 1-3 business days**
3. **You'll get an email when approved**

---

## 🧪 Step 7: Test Everything

### 7.1 Test Backend
- Visit: `https://your-vercel-url.vercel.app/health`
- Should return: `{"status":"OK","timestamp":"..."}`

### 7.2 Test Database
- Visit: `https://your-vercel-url.vercel.app/api/facts`
- Should return JSON array of facts

### 7.3 Test Extension Locally
1. **Open Chrome**
2. **Go to:** `chrome://extensions/`
3. **Enable "Developer mode"**
4. **Click "Load unpacked"**
5. **Select your `extension-package` folder**
6. **Test all features**

---

## 🎉 You're Done!

### What You've Built:
✅ **Backend API** hosted on Vercel (free)  
✅ **Facts Database** with 168+ facts  
✅ **Payment System** via Stripe  
✅ **Browser Extension** ready for Chrome Web Store  
✅ **Database Manager** for adding more facts  

### Next Steps:
- **Monitor Stripe Dashboard** for payments
- **Add more facts** via database manager
- **Update extension** by uploading new versions to Chrome Web Store
- **Track users** via Chrome Web Store analytics

### Support:
- **Vercel Issues:** Check Vercel dashboard logs
- **Stripe Issues:** Check Stripe dashboard
- **Chrome Web Store:** developer-support@google.com

**Congratulations! Your Daily Facts extension is live! 🚀**
\`\`\`

\`\`\`typescriptreact file="background.js"
[v0-no-op-code-block-prefix]// Background service worker for Chrome/Safari extension
const chrome = window.chrome // Declare the chrome variable

class FactExtension {
  constructor() {
    this.initializeExtension()
  }

  async initializeExtension() {
    // Set up alarm for fact delivery
    chrome.runtime.onInstalled.addListener(() => {
      this.setupFactAlarms()
      this.initializeDefaultSettings()
    })

    // Handle alarm events
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "deliverFact") {
        this.deliverRandomFact()
      } else if (alarm.name === "updateDatabase") {
        this.updateFactDatabase()
      }
    })

    // Handle messages from popup/options
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse)
      return true // Keep message channel open for async response
    })
  }

  async initializeDefaultSettings() {
    const settings = await chrome.storage.sync.get("userSettings")
    if (!settings.userSettings) {
      const defaultSettings = {
        categories: [
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
        ], // Free tier gets all categories but limited facts
        frequency: "daily", // Free tier: 5 facts/day at random times
        notifications: true,
        tier: "free", // free, premium (removed pro)
        isPremium: false,
        lastFactTime: 0,
        factHistory: [],
        savedFacts: [], // New: saved facts collection
        dailyFactCount: 0,
        lastResetDate: new Date().toDateString(),
      }
      await chrome.storage.sync.set({ userSettings: defaultSettings })
    }
  }

  async setupFactAlarms() {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    const frequency = userSettings?.frequency || "daily"

    chrome.alarms.clear("deliverFact")

    // Time-based intervals in minutes
    const intervals = {
      "30min": 30, // Every 30 minutes
      "1hour": 60, // Every hour
      "2hours": 120, // Every 2 hours
      daily: 1440, // Once a day
      manual: 0, // Only when clicked (no automatic delivery)
    }

    if (intervals[frequency] > 0) {
      chrome.alarms.create("deliverFact", {
        delayInMinutes: 1,
        periodInMinutes: intervals[frequency],
      })
    }

    chrome.alarms.create("updateDatabase", {
      delayInMinutes: 60,
      periodInMinutes: 1440,
    })
  }

  async deliverRandomFact() {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    if (!userSettings.notifications) return

    // Check if notifications are paused
    const pauseStatus = await chrome.storage.local.get("notificationsPaused")
    if (pauseStatus.notificationsPaused && pauseStatus.notificationsPaused.until > Date.now()) {
      return // Skip delivery if paused
    }

    // Remove daily limits - now it's time-based
    const fact = await this.getRandomFact(userSettings)
    if (fact) {
      await this.showFactNotification(fact)
    }
  }

  async getRandomFact(settings) {
    const facts = await this.loadFacts()
    let availableFacts = facts

    // For free tier, don't filter by categories (they get random facts from all categories)
    if (settings.tier !== "free") {
      availableFacts = facts.filter((fact) => settings.categories.includes(fact.category))
    }

    // Check if fact was shown in last 6 months
    const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000
    availableFacts = availableFacts.filter((fact) => {
      const wasRecentlyShown = settings.factHistory.some(
        (historyItem) => historyItem.factId === fact.id && historyItem.timestamp > sixMonthsAgo,
      )
      return !wasRecentlyShown
    })

    if (availableFacts.length === 0) {
      // Show special notification about no new facts
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Daily Facts - No New Facts",
        message: "You've seen all our current facts! We're adding new ones daily. Check back soon! 🤓",
        priority: 1,
      })
      return null
    }

    return availableFacts[Math.floor(Math.random() * availableFacts.length)]
  }

  async loadFacts() {
    // Load facts from local storage or fetch from server
    const { factsDatabase } = await chrome.storage.local.get("factsDatabase")

    if (!factsDatabase || this.isDatabaseStale(factsDatabase.lastUpdated)) {
      return await this.updateFactDatabase()
    }

    return factsDatabase.facts.filter((fact) => !fact.hidden) // Filter out hidden facts
  }

  async updateFactDatabase() {
    try {
      // In a real implementation, this would fetch from your API
      const response = await fetch("https://your-api-endpoint.com/facts")
      const newFacts = await response.json()

      const factsDatabase = {
        facts: newFacts,
        lastUpdated: Date.now(),
      }

      await chrome.storage.local.set({ factsDatabase })
      return newFacts
    } catch (error) {
      console.error("Failed to update facts database:", error)
      // Return default facts if update fails
      return this.getDefaultFacts()
    }
  }

  getDefaultFacts() {
    return [
      {
        id: "1",
        text: "Octopuses have three hearts and blue blood.",
        category: "animals",
        source: "Marine Biology Research",
        dateAdded: Date.now(),
        tags: ["marine", "biology"],
        hidden: false,
      },
      {
        id: "2",
        text: "The Great Wall of China is not visible from space with the naked eye.",
        category: "history",
        source: "NASA",
        dateAdded: Date.now(),
        tags: ["space", "architecture"],
        hidden: false,
      },
      {
        id: "3",
        text: "Honey never spoils. Archaeologists have found edible honey in ancient Egyptian tombs.",
        category: "science",
        source: "Archaeological Studies",
        dateAdded: Date.now(),
        tags: ["food", "preservation"],
        hidden: false,
      },
      {
        id: "4",
        text: 'A group of flamingos is called a "flamboyance".',
        category: "animals",
        source: "Ornithology Dictionary",
        dateAdded: Date.now(),
        tags: ["birds", "terminology"],
        hidden: false,
      },
      {
        id: "5",
        text: "The shortest war in history lasted only 38-45 minutes between Britain and Zanzibar in 1896.",
        category: "history",
        source: "Historical Records",
        dateAdded: Date.now(),
        tags: ["war", "records"],
        hidden: false,
      },
    ]
  }

  isDatabaseStale(lastUpdated) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    return !lastUpdated || lastUpdated < oneDayAgo
  }

  async showFactNotification(fact) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Daily Fact",
      message: fact.text,
      contextMessage: `Category: ${fact.category}`,
      priority: 1,
      buttons: [{ title: "Save" }, { title: "Dismiss" }],
    })

    // Store current fact for button handling
    await chrome.storage.local.set({ currentFact: fact })
  }

  async addToHistory(fact) {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    userSettings.factHistory.push({
      factId: fact.id,
      timestamp: Date.now(),
      fact: fact,
    })

    // Keep only last 1000 facts in history
    if (userSettings.factHistory.length > 1000) {
      userSettings.factHistory = userSettings.factHistory.slice(-1000)
    }

    await chrome.storage.sync.set({ userSettings })
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case "getSettings":
        const { userSettings } = await chrome.storage.sync.get("userSettings")
        sendResponse({ settings: userSettings })
        break

      case "updateSettings":
        await chrome.storage.sync.set({ userSettings: request.settings })
        await this.setupFactAlarms()
        sendResponse({ success: true })
        break

      case "getFactHistory":
        const { userSettings: settings } = await chrome.storage.sync.get("userSettings")
        sendResponse({ history: settings.factHistory || [] })
        break

      case "getSavedFacts":
        const { userSettings: userSet } = await chrome.storage.sync.get("userSettings")
        sendResponse({ savedFacts: userSet.savedFacts || [] })
        break

      case "saveFact":
        await this.saveFactToCollection(request.fact)
        sendResponse({ success: true })
        break

      case "removeSavedFact":
        await this.removeSavedFact(request.factId)
        sendResponse({ success: true })
        break

      case "getFactsDatabase":
        const { factsDatabase } = await chrome.storage.local.get("factsDatabase")
        sendResponse({ facts: factsDatabase?.facts || [] })
        break

      case "updateFactsDatabase":
        await chrome.storage.local.set({ factsDatabase: request.database })
        sendResponse({ success: true })
        break

      case "verifyPayment":
        const isValid = await this.verifyStripePayment(request.paymentIntentId, request.tier)
        if (isValid) {
          const { userSettings: currentSettings } = await chrome.storage.sync.get("userSettings")
          currentSettings.tier = request.tier
          currentSettings.isPremium = request.tier !== "free"
          await chrome.storage.sync.set({ userSettings: currentSettings })
          await this.setupFactAlarms()
        }
        sendResponse({ success: isValid })
        break

      case "addToHistory":
        await this.addToHistory(request.fact)
        sendResponse({ success: true })
        break
    }
  }

  async saveFactToCollection(fact) {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    if (userSettings.tier !== "premium") return // Only premium users can save facts

    if (!userSettings.savedFacts.some((saved) => saved.id === fact.id)) {
      userSettings.savedFacts.push({
        ...fact,
        savedAt: Date.now(),
      })
      await chrome.storage.sync.set({ userSettings })
    }
  }

  async removeSavedFact(factId) {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    userSettings.savedFacts = userSettings.savedFacts.filter((fact) => fact.id !== factId)
    await chrome.storage.sync.set({ userSettings })
  }

  async verifyStripePayment(paymentIntentId, tier) {
    try {
      // In production, verify one-time payment with your backend
      const response = await fetch("https://your-backend.com/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId, tier, paymentType: "one-time" }),
      })
      const result = await response.json()
      return result.verified
    } catch (error) {
      console.error("Payment verification failed:", error)
      return false
    }
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  const { currentFact } = await chrome.storage.local.get("currentFact")
  const { userSettings } = await chrome.storage.sync.get("userSettings")

  if (buttonIndex === 0) {
    // Save button clicked
    if (userSettings.tier === "pro" && currentFact) {
      await chrome.runtime.sendMessage({ action: "saveFact", fact: currentFact })
    }
  }

  // Add to history regardless of button clicked
  if (currentFact) {
    const extension = new FactExtension()
    await extension.addToHistory(currentFact)
  }

  chrome.notifications.clear(notificationId)
})

// Initialize the extension
new FactExtension()
