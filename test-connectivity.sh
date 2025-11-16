#!/bin/bash

# Test script to verify frontend-backend connectivity
echo "🧪 Testing ICU Monitor Connectivity"
echo "===================================="

# Test local backend
echo "Testing local backend (port 8000)..."
if curl -s http://localhost:8000/ > /dev/null; then
    echo "✅ Local backend is responding"
    curl -s http://localhost:8000/ | jq .status 2>/dev/null || echo "   Root endpoint: $(curl -s http://localhost:8000/)"
else
    echo "❌ Local backend not responding on port 8000"
    echo "   Make sure backend is running: cd backend && python main.py"
fi

echo ""

# Test production backend (replace YOUR_BACKEND_URL with actual URL)
echo "Testing production backend..."
echo "ℹ️  Note: Replace YOUR_BACKEND_URL below with your actual Render URL"
echo "   Example: curl -s https://your-app-name.onrender.com/"
echo "   Command: curl -s YOUR_BACKEND_URL/"
echo ""

# Show current env variables
echo "Current environment variables:"
echo "Frontend VITE_API_URL: $(grep VITE_API_URL frontend/.env 2>/dev/null || echo 'Not found')"
echo "Frontend production VITE_API_URL: $(grep VITE_API_URL frontend/.env.production 2>/dev/null || echo 'Not found')"
echo ""

# Test websocket connection locally
echo "Testing WebSocket connection locally..."
echo "ℹ️  Local WebSocket should be: ws://localhost:8000/ws"
echo "ℹ️  Check browser console for WebSocket connection logs"
echo ""

echo "📋 Deployment Checklist:"
echo "1. ✅ Backend deployed to Render (with PORT environment variable)"
echo "2. ❓ Frontend environment variable VITE_API_URL set in Vercel"
echo "   - Go to Vercel Dashboard > Project > Settings > Environment Variables"
echo "   - Add: VITE_API_URL = https://your-render-backend-url"
echo "3. ❓ CORS origins match your frontend URLs in backend"
echo "4. ❓ Frontend redeployed after setting environment variables"
echo ""

echo "🔍 Debug Commands:"
echo "# Check if backend is running locally:"
echo "cd backend && python main.py"
echo ""
echo "# Check frontend env vars:"
echo "cd frontend && cat .env"
echo ""
echo "# Test API endpoints:"
echo "curl http://localhost:8000/health"
echo "curl http://localhost:8000/auth/login -X POST -d 'username=test&password=test'"
echo ""
echo "# Check Vercel deployment logs for environment variables:"
echo "# Go to Vercel Dashboard > Project > Functions > View Logs"
