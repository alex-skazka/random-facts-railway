const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    return res.status(200).json({})
  }

  Object.keys(corsHeaders).forEach((key) => {
    res.setHeader(key, corsHeaders[key])
  })

  res.status(200).json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
}
