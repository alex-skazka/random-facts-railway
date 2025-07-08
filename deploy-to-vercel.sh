#!/bin/bash
# Quick deployment script for Vercel

echo "🚀 Deploying Daily Facts Extension to Vercel..."

# Install Vercel CLI if not installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# Login to Vercel (opens browser)
echo "Please login to Vercel..."
vercel login

# Deploy the project
echo "Deploying to Vercel..."
vercel --prod

# Set environment variables
echo "Setting up environment variables..."
vercel env add STRIPE_SECRET_KEY

echo "✅ Deployment complete!"
echo "Your API will be available at: https://your-project.vercel.app"
