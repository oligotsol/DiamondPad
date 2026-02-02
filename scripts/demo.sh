#!/bin/bash
# DiamondPad Demo Script
# Run this to see DiamondPad in action

echo "💎 DiamondPad Demo"
echo "=================="
echo ""

# Check if dependencies are installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the CLI demo
echo ""
echo "🚀 Running demo..."
echo ""
npx tsx src/cli.ts demo

echo ""
echo "🔧 Try these commands:"
echo "   npx tsx src/cli.ts rank 45      # Check rank for 45 days"
echo "   npx tsx src/cli.ts project 365  # Project rewards for a year"
echo "   npx tsx src/cli.ts stats        # Show platform stats"
echo ""
echo "📡 To start the API server:"
echo "   npm run dev"
echo ""
echo "💎 Diamond hands win!"
