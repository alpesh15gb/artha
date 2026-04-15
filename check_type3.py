import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check who is on type 3 transactions (looks like payments we made - EXPENSES/PURCHASES)
print("=== Type 3 txns (payments we made) ===")
cur.execute("""
    SELECT n.full_name, t.txn_cash_amount, t.txn_date
    FROM kb_transactions t
    JOIN kb_names n ON t.txn_name_id = n.name_id
    WHERE t.txn_type = 3
    ORDER BY t.txn_cash_amount DESC
""")
for row in cur.fetchall():
    print(f"  {row[0]}: Rs.{row[1]}")

print("\n=== Type 83 txns ===")
cur.execute("""
    SELECT n.full_name, t.txn_cash_amount
    FROM kb_transactions t
    JOIN kb_names n ON t.txn_name_id = n.name_id
    WHERE t.txn_type = 83
""")
for row in cur.fetchall():
    print(f"  {row[0]}: Rs.{row[1]}")

# Check ALL distinct parties in any transaction
print("\n=== All parties with any transaction ===")
cur.execute("""
    SELECT DISTINCT n.name_id, n.full_name, n.name_type
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    ORDER BY n.name_type
""")
for row in cur.fetchall():
    print(f"  ID={row[0]}: {row[1]} (type={row[2]})")