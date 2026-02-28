import sqlite3

def fix_schema():
    missing_columns = {
        "pipeline_stage": "TEXT DEFAULT 'radar'",
        "valor_estimado_total": "REAL DEFAULT 0.0",
        "valor_final_lance": "REAL DEFAULT 0.0",
        "categoria": "TEXT",
        "priority": "TEXT DEFAULT 'media'",
        "score": "INTEGER DEFAULT 0",
        "resumo_ia": "TEXT",
        "risco": "TEXT"
    }

    for db_name in ['licitacao.db', 'licitacao_local.db']:
        print(f"\nChecking {db_name}...")
        try:
            conn = sqlite3.connect(db_name)
            cursor = conn.cursor()
            
            cursor.execute("PRAGMA table_info(licitacao)")
            rows = cursor.fetchall()
            if not rows:
                print(f"Table 'licitacao' not found in {db_name}. Skipping.")
                conn.close()
                continue
                
            columns = [row[1] for row in rows]
            
            for col, definition in missing_columns.items():
                if col not in columns:
                    print(f"Adding column {col} to {db_name}...")
                    try:
                        cursor.execute(f"ALTER TABLE licitacao ADD COLUMN {col} {definition}")
                    except Exception as e:
                        print(f"Error adding {col} to {db_name}: {e}")
            
            conn.commit()
            conn.close()
            print(f"{db_name} check/fix complete.")
        except Exception as e:
            print(f"Error checking {db_name}: {e}")

if __name__ == "__main__":
    fix_schema()
