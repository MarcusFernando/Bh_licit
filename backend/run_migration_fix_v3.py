import sqlite3
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    db_path = './licitacao_v2.db'
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Add modo_disputa column
        try:
            cursor.execute("ALTER TABLE licitacao ADD COLUMN modo_disputa VARCHAR")
            logger.info("Column 'modo_disputa' added successfully.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                logger.info("Column 'modo_disputa' already exists.")
            else:
                raise e

        conn.commit()
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    logger.info("Starting Phase 9 Migration (Adding modo_disputa)...")
    run_migration()
    logger.info("Migration complete.")
