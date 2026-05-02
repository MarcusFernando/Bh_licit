import sqlite3
import os

db_path = "licitacao_v2.db"
if not os.path.exists(db_path):
    print(f"File {db_path} not found.")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check columns
        cursor.execute("PRAGMA table_info(licitacao)")
        cols = [r[1] for r in cursor.fetchall()]
        print(f"Current columns: {cols}")
        
        if "is_me_epp_exclusive" not in cols:
            print("Adding column is_me_epp_exclusive...")
            cursor.execute("ALTER TABLE licitacao ADD COLUMN is_me_epp_exclusive BOOLEAN DEFAULT 0")
            conn.commit()
            print("Column added successfully!")
        else:
            print("Column already exists.")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
