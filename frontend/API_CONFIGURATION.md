# API Configuration Guide

## Environment Setup

### 1. Create Environment File
Create a `.env.local` file in the frontend root directory:

```bash
# Local Development
NEXT_PUBLIC_API_URL=http://localhost:5000

# Production (replace with your hosted API URL)
# NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### 2. Update Components
All API calls should now use the centralized configuration from `src/config/api.ts`

## Deployment Steps

### For Production:
1. **Host your backend** (e.g., on Vercel, Railway, Heroku, AWS, etc.)
2. **Get your API URL** (e.g., `https://your-app.vercel.app` or `https://api.yourdomain.com`)
3. **Update environment variable**:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-api-domain.com
   ```
4. **Redeploy your frontend**

### Example URLs:
- **Vercel**: `https://your-app.vercel.app`
- **Railway**: `https://your-app.railway.app`
- **Heroku**: `https://your-app.herokuapp.com`
- **AWS**: `https://your-api.amazonaws.com`

## Benefits:
- ✅ Easy environment switching
- ✅ No hardcoded URLs in components
- ✅ Centralized API management
- ✅ Environment-specific configurations
