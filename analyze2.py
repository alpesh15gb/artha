import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Lineitems structure
print("=== kb_lineitems ===")
cur.execute("PRAGMA table_info(kb_lineitems)")
for row in cur.fetchall()[:15]:
    print(row)

print("\n=== Sample lineitem ===")
cur.execute("SELECT * FROM kb_lineitems LIMIT 1")
if cur.description:
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    for c, v in zip(cols, row):
        print(f"  {c}: {v}")

# Check all tax codes
print("\n=== Tax codes ===")
cur.execute("PRAGMA table_info(kb_tax_code)")
for row in cur.fetchall()[:5]:
    print(row)

cur.execute("SELECT * FROM kb_tax_code LIMIT 3")
if cur.description:
    cols = [d[0] for d in cur.description]
    print("Columns:", cols[:5])
    for row in cur.fetchall():
        print(f"  {row}")