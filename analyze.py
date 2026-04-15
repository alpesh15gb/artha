import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Transactions structure
print("=== kb_transactions ===")
cur.execute("PRAGMA table_info(kb_transactions)")
for row in cur.fetchall():
    print(row)

print("\n=== Transaction types ===")
cur.execute("SELECT DISTINCT txn_type FROM kb_transactions")
for row in cur.fetchall():
    print(f"  Type: {row[0]}")

print("\n=== Sample transaction with all fields ===")
cur.execute("SELECT * FROM kb_transactions LIMIT 1")
if cur.description:
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    for c, v in zip(cols, row):
        print(f"  {c}: {v}")