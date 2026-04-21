import sqlite3
import zipfile
import os

def analyze_vyp(vyp_path):
    print(f"Analyzing {vyp_path}...")
    conn = sqlite3.connect(vyp_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    
    pay_tables = [t for t in tables if 'pay' in t.lower() or 'bank' in t.lower()]
    print("\nPayment/Bank Related Tables:")
    for pt in pay_tables:
        cursor.execute(f"SELECT COUNT(*) FROM {pt}")
        count = cursor.fetchone()[0]
        print(f" - {pt}: {count} records")
        if count > 0:
            cursor.execute(f"PRAGMA table_info({pt})")
            print(f"   Cols: {[c[1] for c in cursor.fetchall()]}")
            cursor.execute(f"SELECT * FROM {pt} LIMIT 3")
            rows = cursor.fetchall()
            for r in rows:
                print(f"     {r}")

    print("\nTransaction Metadata (kb_transactions):")
    cursor.execute("SELECT txn_payment_type_id, COUNT(*) FROM kb_transactions GROUP BY txn_payment_type_id")
    types = cursor.fetchall()
    for t in types:
        print(f" - Payment Type ID {t[0]}: {t[1]} records")

    conn.close()

if __name__ == "__main__":
    vyp = 'ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp'
    analyze_vyp(vyp)
