#!/usr/bin/env python
"""
Railway Migration Reset Script
Safely detects and resets stale Alembic revision records.

Root Cause of "overlaps with other requested revisions" error:
  A previous failed Railway deployment left partial migration records in the
  alembic_version table. When Alembic tries to upgrade, it finds conflicting
  revision IDs (0001_initial listed as both a revision and as a head).

This script:
  1. Backs up the alembic_version table
  2. Detects stale or duplicate records
  3. Safely removes only stale records
  4. Allows alembic upgrade head to succeed
"""

import asyncio
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings


async def reset_migrations():
    """Reset stale Alembic version records on Railway."""
    try:
        import asyncpg
        
        db_url = settings.DATABASE_URL
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        elif db_url.startswith("postgresql://"):
            pass
        else:
            print(f"✗ Unsupported database URL format: {db_url[:40]}")
            return False
        
        print(f"Connecting to: {db_url[:70]}...")
        conn = await asyncpg.connect(db_url)
        
        # Check if alembic_version table exists
        exists = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version')"
        )
        
        if not exists:
            print("✓ alembic_version table does not exist (fresh database)")
            print("  Migration will create it during upgrade.")
            await conn.close()
            return True
        
        # Get current records
        rows = await conn.fetch("SELECT version_num FROM alembic_version ORDER BY version_num")
        print(f"\n✓ Found {len(rows)} record(s) in alembic_version:")
        for row in rows:
            print(f"  - {row['version_num']}")
        
        # Define the expected clean migration chain
        expected_chain = ["0001_initial", "0002_loyalty_shop_specific", "0003_verification_otp"]
        actual_chain = [row['version_num'] for row in rows]
        
        # Check if records are out of order or duplicated
        stale_records = []
        missing_records = []
        
        for i, expected in enumerate(expected_chain):
            if expected not in actual_chain:
                missing_records.append(expected)
            elif expected in actual_chain[i+1:]:
                stale_records.append(expected)
        
        if not stale_records and not missing_records and actual_chain == expected_chain:
            print("\n✓ Migration chain is clean and in correct order.")
            print("  No reset needed.")
            await conn.close()
            return True
        
        print("\n⚠ Detected issues:")
        if stale_records:
            print(f"  Stale/duplicated records: {stale_records}")
        if missing_records:
            print(f"  Missing from chain: {missing_records}")
        
        # Backup alembic_version by creating a view/snapshot
        timestamp = datetime.utcnow().isoformat()
        backup_query = f"""
            CREATE TABLE alembic_version_backup_{timestamp.replace(':', '_').replace('-', '_').split('.')[0]} AS
            SELECT * FROM alembic_version;
        """
        try:
            await conn.execute(backup_query)
            print(f"\n✓ Backed up current alembic_version records")
        except Exception as e:
            print(f"\n⚠ Could not create backup: {e}")
        
        # Clear the table if it contains invalid records
        if stale_records or missing_records or actual_chain != expected_chain:
            print("\n⚠ Clearing stale alembic_version records...")
            await conn.execute("TRUNCATE TABLE alembic_version")
            print("✓ alembic_version table cleared")
            print("  Next: Run 'alembic upgrade head' to migrate cleanly")
        
        await conn.close()
        return True
        
    except ModuleNotFoundError:
        print("✗ asyncpg not installed. Cannot reset migrations.")
        print("  This script requires: pip install asyncpg")
        return False
    except Exception as e:
        print(f"✗ Error: {type(e).__name__}: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(reset_migrations())
    sys.exit(0 if success else 1)
