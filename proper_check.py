import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# In Vyapar:
# - txn_type 1,2,27 = Invoices issued (customer owes us or paid us) = CUSTOMER
# - txn_type 3,83 = Payments made by us (we paid them) = SUPPLIER

print("=== Who are CUSTOMERS (we issued invoices to them) ===")
cur.execute("""
    SELECT n.full_name, SUM(t.txn_cash_amount + t.txn_balance_amount) as total
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    WHERE t.txn_type IN (1, 2, 27)
    GROUP BY n.name_id
    HAVING total > 0
    ORDER BY total DESC
""")
for row in cur.fetchall():
    print(f"  {row[0]}: Rs.{row[1]}")

print("\n=== Who are SUPPLIERS (we paid them) ===")
cur.execute("""
    SELECT n.full_name, SUM(t.txn_cash_amount) as paid
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    WHERE t.txn_type IN (3, 83)
    GROUP BY n.name_id
    HAVING paid > 0
    ORDER BY paid DESC
""")
for row in cur.fetchall():
    print(f"  {row[0]}: Rs.{row[1]}")

# Now let's see who is ONLY in customer transactions vs ONLY in supplier transactions
print("\n=== CUSTOMER only (no payments to them) ===")
cur.execute("""
    SELECT n.full_name
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    WHERE t.txn_type IN (1, 2, 27)
    EXCEPT
    SELECT n.full_name
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    WHERE t.txn_type IN (3, 83)
""")
for row in cur.fetchall():
    print(f"  {row[0]}")

print("\n=== SUPPLIER only (only got payments, no invoices to them) ===")
cur.execute("""
    SELECT n.full_name
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    WHERE t.txn_type IN (3, 83)
    EXCEPT
    SELECT n.full_name
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    WHERE t.txn_type IN (1, 2, 27)
""")
for row in cur.fetchall():
    print(f"  {row[0]}")