const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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

  try {
    const { paymentIntentId } = req.body

    if (!paymentIntentId) {
      return res.status(400).json({ error: "Payment intent ID is required" })
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status === "succeeded") {
      res.status(200).json({
        success: true,
        verified: true,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      })
    } else {
      res.status(400).json({
        success: false,
        verified: false,
        status: paymentIntent.status,
      })
    }
  } catch (error) {
    console.error("Payment verification error:", error)
    res.status(500).json({ error: "Payment verification failed" })
  }
}
