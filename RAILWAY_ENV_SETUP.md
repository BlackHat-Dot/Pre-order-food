# Railway Environment Variables Setup

## In Railway Dashboard

When deploying to Railway, set these environment variables:

### Required Variables

```
DATABASE_URL
  Value: Auto-set by Railway if using PostgreSQL add-on
  Or: postgresql://user:password@host:5432/dbname

JWT_SECRET_KEY
  Value: Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
  ⚠️  Keep this secret and change it in production
```

### Recommended Variables

```
ENV
  Value: production
  Purpose: Disables debug mode, enables optimizations

ENABLE_ADMIN_SEED
  Value: false
  Purpose: Prevents accidental admin account creation

APP_NAME
  Value: PreOrder Food API
  Purpose: Shown in API docs and responses

LOG_LEVEL
  Value: INFO
  Purpose: INFO (production) or DEBUG (troubleshooting)
```

### Optional Variables

```
BACKEND_PORT
  Value: 8000
  Default: 8000
  Purpose: Internal port for FastAPI backend

OTP_STORAGE
  Value: database
  Default: memory
  Purpose: Where to store OTP codes

API_PREFIX
  Value: /api/v1
  Default: /api/v1
  Purpose: API route prefix
```

### Email/SMS Variables (if configured)

```
# MSG91 SMS Gateway
VITE_MSG91_WIDGET_ID=your_widget_id
VITE_MSG91_TOKEN_AUTH=your_token

# Email configuration
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your_email@provider.com
SMTP_PASSWORD=your_app_password
```

## Setup Steps

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create PostgreSQL Add-on**
   - In Railway dashboard, click "Add Service"
   - Select "PostgreSQL"
   - Railway auto-creates `DATABASE_URL` environment variable

3. **Generate JWT Secret**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   - Copy the output
   - Set as `JWT_SECRET_KEY` in Railway

4. **Connect GitHub Repository**
   - In Railway, create new project
   - Connect GitHub repo
   - Select your branch

5. **Set Environment Variables**
   - In Railway project settings
   - Add all variables from above
   - Save

6. **Deploy**
   - Push to GitHub
   - Railway auto-deploys
   - Check logs in Railway dashboard

## Variable Notes

### Database URL Format

For local development (PostgreSQL):
```
postgresql://postgres:password@localhost:5432/preorder_db
```

For Railway PostgreSQL add-on (auto-set):
```
postgresql://user:password@host:port/database
```

For Docker local (docker-compose):
```
postgresql://postgres:password@postgres:5432/preorder_db
```

### JWT Secret Generation

**Option 1: Python (recommended)**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Option 2: OpenSSL**
```bash
openssl rand -base64 32
```

**Option 3: Online generator**
Visit: https://www.uuidgenerator.net/

⚠️ **Security**: 
- Never commit secrets to Git
- Use `.env` locally (not in repo)
- In Railway, use dashboard to set variables
- Rotate secrets periodically

## Testing Variables Locally

Create `.env` file (not committed):
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/preorder_db
ENV=local
JWT_SECRET_KEY=test-key-at-least-32-characters-long
ENABLE_ADMIN_SEED=false
```

Then run:
```bash
python main.py
```

## Troubleshooting

**Issue: "Invalid DATABASE_URL"**
- Check format: `postgresql://user:pass@host:port/db`
- Verify credentials in Railway dashboard
- PostgreSQL add-on should auto-create this

**Issue: "JWT_SECRET_KEY not set"**
- Generate new key: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Set in Railway dashboard under project variables
- Must be at least 32 characters

**Issue: "Environment variable not found"**
- Restart service after setting variables
- Railway settings take effect on redeploy
- Check exact variable names (case-sensitive)

## Check Environment at Runtime

In Python (FastAPI startup):
```python
from app.core.config import settings
print(settings.ENV)
print(settings.DATABASE_URL[:50] + "...")
```

In browser console (frontend):
```javascript
console.log(import.meta.env.MODE);  // 'production'
```

## Common Environment Configurations

### Local Development
```env
ENV=local
DATABASE_URL=postgresql://postgres:password@localhost:5432/preorder_db
JWT_SECRET_KEY=dev-key-32-chars-minimum
ENABLE_ADMIN_SEED=false
LOG_LEVEL=DEBUG
```

### Production (Railway)
```env
ENV=production
DATABASE_URL=(auto-set by Railway)
JWT_SECRET_KEY=(generate with secrets.token_urlsafe(32))
ENABLE_ADMIN_SEED=false
LOG_LEVEL=INFO
```

### Testing
```env
ENV=test
DATABASE_URL=postgresql://postgres:password@localhost:5432/test_db
JWT_SECRET_KEY=test-key-32-chars-minimum
OTP_STORAGE=memory
ENABLE_ADMIN_SEED=true
```

## Need Help?

- Check Railway logs: `railway logs`
- Verify variables: Railway dashboard → Project → Variables
- Test local: Run with `python main.py`
- Check docs: See RAILWAY_SETUP.md
