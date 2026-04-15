import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check transaction types - what do the numbers mean?
print("=== Transaction types ===")
cur.execute("SELECT txn_type, COUNT(*), SUM(txn_cash_amount + txn_balance_amount) FROM kb_transactions GROUP BY txn_type")
for row in cur.fetchall():
    print(f"  txn_type {row[0]}: {row[1]} transactions, {row[2]} total")

# Check the ones with positive balance (they owe us)
print("\n=== Parties who owe us money ===")
cur.execute("""
    SELECT n.full_name, SUM(t.txn_balance_amount) as due
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    WHERE t.txn_balance_amount > 0
    GROUP BY n.name_id
    ORDER BY due DESC
""")
for row in cur.fetchall()[:10]:
    print(f"  {row[0]}: Rs.{row[1]}")

# Are there any sales receipts (money coming IN)?
print("\n=== All money received ===")
cur.execute("SELECT SUM(txn_cash_amount) FROM kb_transactions")
print(f"  Total cash: {cur.fetchone()[0]}")