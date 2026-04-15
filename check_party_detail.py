import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check column structure
print("=== Party structure ===")
cur.execute("PRAGMA table_info(kb_names)")
for row in cur.fetchall():
    print(f"  {row}")

# Check name_group
print("\n=== Party groups ===")
cur.execute("SELECT * FROM kb_party_groups")
for row in cur.fetchall():
    print(row)

# Check sample with more fields
print("\n=== Full party data sample ===")
cur.execute("SELECT full_name, name_type, name_group_id FROM kb_names LIMIT 10")
for row in cur.fetchall():
    print(row)