# Pre-Deployment Checklist

## Before deploying to Railway, verify:

### Code & Config
- [ ] `.env` file exists (copy from `.env.example`)
- [ ] `DATABASE_URL` is set locally (for testing)
- [ ] `JWT_SECRET_KEY` is set (minimum 32 characters for production)
- [ ] All tests pass: `pytest -q`
- [ ] App runs locally: `uvicorn app.main:app --reload`
- [ ] No import or syntax errors

### Docker
- [ ] Docker image builds: `docker build -t preorder-api .`
- [ ] Container runs: `docker run -p 8000:8000 preorder-api`
- [ ] Health check passes: `curl http://localhost:8000/health`

### Git
- [ ] All changes committed: `git status` (clean)
- [ ] Pushed to main/production branch: `git push`

### Railway Setup
- [ ] Project created on Railway
- [ ] Git repo connected (Railway auto-deploys on push)
- [ ] PostgreSQL database add-on created
- [ ] Verify `DATABASE_URL` in Railway Variables
- [ ] Optional integrations configured (Sentry, AWS S3, Twilio, Razorpay)

### Environment Variables (Railway)
Required:
- [ ] `DATABASE_URL` (auto-set by PostgreSQL add-on)

Recommended:
- [ ] `JWT_SECRET_KEY` (generate new 32+ char random string)
- [ ] `ENV=production`
- [ ] `SENTRY_DSN` (for error tracking)

Optional:
- [ ] `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` (S3 uploads)
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (SMS)
- [ ] `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (payments)
- [ ] `REDIS_URL` (if Redis add-on enabled)

### Deployment
- [ ] Railway build succeeds (check logs)
- [ ] App health check passes: `curl https://your-domain/health`
- [ ] API responds: `curl https://your-domain/api/v1/auth/register` (should get 422 validation error)
- [ ] Swagger docs load: `https://your-domain/docs`

### Post-Deployment
- [ ] Monitor Railway logs for errors
- [ ] Test key endpoints (auth, shops, menu, orders)
- [ ] Verify database connection (check /health status)
- [ ] Set up monitoring/alerts if needed
- [ ] Document domain and any custom configurations

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| App won't start | Missing `DATABASE_URL` | Add PostgreSQL add-on or set manually in Variables |
| 500 errors | Database migration failed | Check Rails logs, ensure migrations ran |
| 503 timeout | App starting slow | Increase Railway "timeout" setting |
| Import errors | Wrong Python version | Set Python 3.12 in `runtime.txt` |
| Module not found | Missing dependency | Ensure using `requirements-production.txt` |

## Rollback

If deployment fails:
1. Check Railway logs for error details
2. Fix code locally, test with `pytest`
3. Commit and push
4. Railway auto-redeploys (or click "Redeploy" in dashboard)

For instant rollback: Deploy an earlier Git commit from Railway dashboard.
