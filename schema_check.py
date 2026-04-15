import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check ALL tables to find party/customer/supplier mapping
print("=== ALL TABLES ===")
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
for row in cur.fetchall():
    print(f"  {row[0]}")

# Check kb_names schema with ALL columns
print("\n=== kb_names FULL SCHEMA ===")
cur.execute("PRAGMA table_info(kb_names)")
for row in cur.fetchall():
    print(f"  {row[1]}: {row[2]}")

# Check if there's a type/category field we missed
print("\n=== Sample with ALL fields ===")
cur.execute("SELECT * FROM kb_names LIMIT 2")
if cur.description:
    cols = [d[0] for d in cur.description]
    print("Columns:", cols)
    rows = cur.fetchall()
    for row in rows:
        for c, v in zip(cols, row):
            print(f"  {c}: {v}")