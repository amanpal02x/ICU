# ICU-Monitor Deployment Guide (UPDATED - CORS FIX)

## Issues Fixed ✅

1. **CORS Configuration**: Updated backend with environment-specific CORS (production allows only Vercel URL, development allows localhost)
2. **API URL**: Frontend configured to use production backend URL (`https://icu-1-r21u.onrender.com`)
3. **Port Configuration**: Backend defaults to port 10000 (matching .env file)
4. **Environment Variable**: Added ENVIRONMENT=production for proper CORS configuration

## Required Environment Variables

### Backend (Render) - UPDATED

You need to set these environment variables in your Render dashboard:

```
ENVIRONMENT=production
MONGODB_URL=mongodb+srv://aman9118x4_db_user:aman2244@icu.7i4jmmj.mongodb.net/?appName=ICU
DATABASE_NAME=icu_monitor
USE_REAL_MONITOR_DATA=false
SECRET_KEY=eee6b45a7df5f42e4e3904575217b04a
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
PRELOAD_DISEASE_MODEL=false
PRELOAD_VITALS_MODEL=false
DISABLE_DEV_RELOAD=true
PORT=10000
```

**IMPORTANT**: The `ENVIRONMENT=production` variable is crucial for CORS to work properly!

**COPY FROM YOUR LOCAL .env FILE**: Use the exact same values you have in your local `backend/.env` file for the variables above.

### Frontend (Vercel)

You need to set this environment variable in your Vercel dashboard:

```
VITE_API_URL=https://icu-1-r21u.onrender.com
```

## Deployment Steps

### 1. Update Backend Environment Variables on Render

Go to your Render dashboard → ICU backend service → Environment Variables

Add the `ENVIRONMENT=production` variable FIRST, then redeploy. This ensures CORS works correctly.

### 2. Update Frontend Environment Variables on Vercel (if needed)

Ensure `VITE_API_URL=https://icu-1-r21u.onrender.com` is set in Vercel.

### 3. Redeploy Both Services

**Sequence matters:**

1. Deploy backend FIRST (with ENVIRONMENT=production)
2. Deploy frontend SECOND
3. Test login functionality

## Quick Fix for Current Issue

If you're still getting CORS errors:

1. **Check backend environment variables on Render** - Ensure `ENVIRONMENT=production` is set
2. **Redeploy backend** on Render (the CORS configuration is now environment-aware)
3. **Test the /auth/login endpoint** by visiting: `https://icu-1-r21u.onrender.com/docs`
4. **Then test frontend login** at: `https://icu-ruby.vercel.app`

## Common Issues & Solutions

### CORS Issues (The Current Problem)

- ✅ **FIXED**: Updated CORS to be environment-specific
- If still failing: Check that `ENVIRONMENT=production` is set in Render environment variables

### API Connection Issues

- ✅ Fixed: Frontend points to production Render URL
- If failing: Verify Render URL is accessible

### Backend Not Responding (404 Errors)

- Check if backend crashed during startup
- Check Render deployment logs for MongoDB connection errors
- Ensure all environment variables are properly set

### Login Issues

- Ensure backend `/auth/login` endpoint is accessible
- Check that user credentials exist in production database
- Verify environment variables match production settings

## Testing Checklist

- [ ] Backend accessible at `https://icu-1-r21u.onrender.com/docs`
- [ ] Frontend loads at `https://icu-ruby.vercel.app`
- [ ] Login form loads without console errors
- [ ] CORS headers present in network requests
- [ ] Authentication works with test credentials
- [ ] WebSocket connections work for real-time data

## Emergency Troubleshooting

If CORS still fails after redeployment:

1. **Check Render logs** for "CORS" or "Environment" messages
2. **Verify Vercel URL** matches exactly: `https://icu-ruby.vercel.app`
3. **Test directly**: Visit backend docs and try login endpoint manually
4. **Check MongoDB**: Ensure connection string works in production

**Note**: The CORS fix requires redeployment with `ENVIRONMENT=production` set!
