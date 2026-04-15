import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# ALL parties - let's see ALL 15 entries
print("=== ALL kb_names entries ===")
cur.execute("""
    SELECT name_id, full_name, name_type, name_expense_type, phone_number, email
    FROM kb_names
""")
for row in cur.fetchall():
    print(f"ID={row[0]}: {row[1]} | type={row[2]} | exp_type={row[3]}")

# Now check what name_type 1 vs 2 means
print("\n=== name_type breakdown ===")
cur.execute("SELECT name_type, COUNT(*) FROM kb_names GROUP BY name_type")
for row in cur.fetchall():
    print(f"  type {row[0]}: {row[1]} parties")

print("\n=== Transactions by txn_type ===")
cur.execute("SELECT txn_type, COUNT(*), SUM(txn_cash_amount + txn_balance_amount) FROM kb_transactions GROUP BY txn_type")
for row in cur.fetchall():
    print(f"  txn_type {row[0]}: {row[1]} txns, TOTAL Rs.{row[2]}")