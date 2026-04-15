import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check what transactions each party has
print("=== Transactions by party ===")
cur.execute("""
    SELECT n.full_name, n.name_type, n.name_expense_type, COUNT(t.txn_id) as txn_count,
           SUM(t.txn_cash_amount + t.txn_balance_amount) as total
    FROM kb_names n
    LEFT JOIN kb_transactions t ON n.name_id = t.txn_name_id
    GROUP BY n.name_id
    ORDER BY txn_count DESC
""")
for row in cur.fetchall():
    if row[3] > 0:  # Only parties with transactions
        print(f"{row[0]}: type={row[1]}, exp_type={row[2]}, txns={row[3]}, total={row[4]}")