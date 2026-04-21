import sqlite3
import zipfile
import os

def analyze_vyapar_db(vyb_path):
    print(f"Analyzing {vyb_path}...")
    
    # 1. Extract .vyp file from VYB (ZIP)
    vyp_file = None
    with zipfile.ZipFile(vyb_path, 'r') as zip_ref:
        for file in zip_ref.namelist():
            if file.endswith('.vyp'):
                vyp_file = file
                zip_ref.extract(file, '.')
                break
    
    if not vyp_file:
        print("No .vyp file found in VYB")
        return

    # 2. Connect to SQLite
    conn = sqlite3.connect(vyp_file)
    cursor = conn.cursor()
    
    # 3. List all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    # 4. Search for any table with records and interesting keywords
    keywords = ['bank', 'account', 'pay', 'txn', 'trans']
    print("\nDetailed Table Audit:")
    for t in tables:
        table_name = t[0]
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            if count > 0:
                is_interesting = any(k in table_name.lower() for k in keywords)
                if is_interesting:
                    print(f" - {table_name}: {count} records")
                    # Peak at columns
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    print(f"   Cols: {[c[1] for c in cursor.fetchall()]}")
                    # Sample record
                    # cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
                    # print(f"   Sample: {cursor.fetchone()}")
        except:
            pass

    # 5. Peak specifically at other_accounts
    print("\nDeep dive into 'other_accounts':")
    try:
        cursor.execute("SELECT * FROM other_accounts")
        rows = cursor.fetchall()
        for r in rows:
            print(f" - {r}")
    except:
        pass

    # 6. Check txn_payment_mapping
    print("\nDeep dive into 'txn_payment_mapping':")
    try:
        cursor.execute("SELECT * FROM txn_payment_mapping LIMIT 10")
        rows = cursor.fetchall()
        for r in rows:
            print(f" - {r}")
    except:
        pass

    conn.close()

if __name__ == "__main__":
    analyze_vyapar_db('NEW.vyb')
