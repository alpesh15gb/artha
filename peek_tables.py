import sqlite3
import sys

conn = sqlite3.connect(sys.argv[1])
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Check kb_names - likely contains parties/customers
print("=== kb_names ===")
cur.execute("SELECT * FROM kb_names")
rows = cur.fetchall()
print(f"Total: {len(rows)}")
if rows:
    print("Columns:", list(rows[0].keys())[:15])
    for row in rows[:3]:
        print(dict(row))

# Check kb_address
print("\n=== kb_address ===")
cur.execute("SELECT * FROM kb_address LIMIT 3")
for row in cur.fetchall():
    print(dict(row))

# Check transactions structure
print("\n=== kb_transactions columns ===")
cur.execute("PRAGMA table_info(kb_transactions)")
for row in cur.fetchall():
    print(row)