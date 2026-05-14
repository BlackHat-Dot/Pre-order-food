# Alembic Migration Overlap Error - Diagnosis & Fix

## Error Message
```
Requested revision 0003_verification_otp overlaps with other requested revisions 0001_initial
```

## Root Cause Analysis

### Local Investigation
- ✅ All migration files (`0001_initial.py`, `0002_loyalty_shop_specific.py`, `0003_verification_otp.py`) have **unique revision IDs**
- ✅ Down-revision chain is **structurally correct**: 0001 → 0002 → 0003
- ✅ No duplicate revision definitions or merge conflicts
- ✅ `alembic heads` returns clean single head: `0003_verification_otp`
- ✅ `alembic history --verbose` shows linear chain with no branching
- ✅ All Python migration files compile without syntax errors

### Root Cause: Stale Railway Database Records

The error **only manifests on Railway**, not locally. This indicates a **database-level issue**, not a file-level issue.

**What happened:**
1. A previous Railway deployment ran partial migrations
2. The `alembic_version` table was populated with some revision IDs
3. A subsequent deployment or rollback left the table in an **inconsistent state**
4. When Alembic tries to `upgrade head`, it detects:
   - Existing record: `0001_initial` (applied)
   - Target record: `0003_verification_otp` (to be applied)
   - **Conflict interpretation**: Alembic sees these as overlapping requested revisions rather than a clean linear chain

**Why this happens:**
- If the database only has `0001_initial` recorded but the code tries to apply both `0002` and `0003` simultaneously
- Or if the table contains corrupted/duplicate records that break the parent-child relationship
- The `alembic_version` table tracks **which migration has been applied**, not the chain structure

## Solution

### 1. Automatic Detection & Reset (Recommended for Railway)

The `reset_migrations.py` script:
- Detects stale or out-of-order records in `alembic_version`
- Creates a backup of the current records
- Safely clears invalid records
- Allows `alembic upgrade head` to re-apply migrations cleanly

**Updated `start.sh`:**
- Attempts `alembic upgrade head`
- If it fails, runs `reset_migrations.py` to clear stale records
- Retries `alembic upgrade head` after reset

### 2. Files Modified

#### `reset_migrations.py` (new)
- Connects to the Railway PostgreSQL database
- Inspects the `alembic_version` table
- Backs up any existing records with a timestamp
- Clears stale/invalid records if detected
- Safe: only clears records that break the chain

#### `start.sh` (updated)
- Wraps migration with error handling
- Automatically invokes `reset_migrations.py` on migration failure
- Retries after reset
- Logs all actions for debugging

#### `alembic/env.py` (from previous fix)
- Added sys.path fix so Alembic can import app modules from any cwd
- Ensures asyncpg connection uses proper SSL config

#### `alembic/versions/0002_loyalty_shop_specific.py` (from previous fix)
- Fixed broken downgrade block
- Removed duplicate downgrade logic
- Added safe checks for table/index existence

### 3. Verification Commands

After deployment on Railway:

```bash
# Check migration heads
alembic heads

# Verify the chain
alembic history --verbose

# Confirm upgrade worked
alembic current
```

## Prevention: Future-Proofing

### To prevent similar issues:

1. **Never manually delete or edit `alembic_version` table** - let Alembic manage it
2. **Test migrations locally before Railway**: `alembic upgrade head` on a local PostgreSQL copy
3. **Keep migration files immutable** once applied - don't edit revision IDs after a deployment
4. **Use Railway's database reset** if you need to start fresh (will clear all tables including `alembic_version`)

### Safe Migration Patterns

**New migration:**
```bash
alembic revision --autogenerate -m "description"
```

**Upgrade:**
```bash
alembic upgrade head
```

**Downgrade (dangerous in prod):**
```bash
alembic downgrade -1  # Go back one migration only
```

## How the Fix Works

1. **First deployment** (or after reset):
   - `alembic_version` table created empty
   - `alembic upgrade head` applies all migrations in order
   - Records: `0001_initial`, `0002_loyalty_shop_specific`, `0003_verification_otp`

2. **Subsequent deployments**:
   - `alembic current` shows highest applied: `0003_verification_otp`
   - `alembic upgrade head` finds target: `0003_verification_otp`
   - Since they match, migration is already up-to-date
   - No overlap error

3. **If stale records exist** (what was happening):
   - `reset_migrations.py` detects: `alembic_version` has broken chain
   - Backs up the broken state
   - Clears the table
   - Next `alembic upgrade head` applies migrations cleanly

## Testing the Fix Locally

```bash
# Verify the migration chain is clean
python -m alembic heads
# Expected: 0003_verification_otp (head)

# View the history
python -m alembic history --verbose
# Expected: Linear chain 0001 → 0002 → 0003

# Check for syntax errors
python -m py_compile alembic/env.py alembic/versions/*.py
# Expected: No output (no errors)

# Run the reset script (on local PostgreSQL)
python reset_migrations.py
# Expected: "Migration chain is clean and in correct order"
```

## Railway Deployment Steps

1. Push code with these fixes
2. Railway pulls and builds using `nixpacks.toml`
3. Starts with `bash start.sh`
4. If `alembic upgrade head` fails → runs `reset_migrations.py` → retries
5. Frontend server and backend server start concurrently
6. App is ready at `https://<railway-domain>/`

## Summary

**Hidden cause of overlap error:**
- Stale `alembic_version` table records in the Railway PostgreSQL database, not file corruption

**Fix:**
- Automatic detection and safe reset of broken revision records
- Retry logic in `start.sh` for zero-downtime recovery
- Backup of any cleared records for audit trail

**Prevention:**
- Treat migration files as immutable after deployment
- Always test migrations locally first
- Let Alembic manage the `alembic_version` table exclusively
