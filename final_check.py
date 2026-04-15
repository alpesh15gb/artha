import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Look at ALL transactions to see who we PAY vs who pays US
# Invoice = they pay us (customer)
# Purchase = we pay them (supplier)

print("=== Transaction breakdown ===")
cur.execute("""
    SELECT 
        txn_type,
        COUNT(*) as cnt,
        SUM(txn_cash_amount) as cash,
        SUM(txn_balance_amount) as balance
    FROM kb_transactions
    GROUP BY txn_type
    ORDER BY txn_type
""")
for row in cur.fetchall():
    print(f"Type {row[0]}: {row[1]} txns, cash={row[2]}, balance={row[3]}")

# Now let's map which parties are customers (received money from) vs suppliers (we paid)
print("\n=== Party Transaction Analysis ===")
cur.execute("""
    SELECT 
        n.name_id,
        n.full_name,
        SUM(CASE WHEN t.txn_type IN (1,2,27) THEN t.txn_cash_amount ELSE 0 END) as received,
        SUM(CASE WHEN t.txn_type IN (1,2,27) THEN t.txn_balance_amount ELSE 0 END) as owed,
        SUM(CASE WHEN t.txn_type IN (3,83) THEN t.txn_cash_amount ELSE 0 END) as paid_out
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    GROUP BY n.name_id
""")

for row in cur.fetchall():
    name = row[1]
    received = row[2] or 0
    owed = row[3] or 0
    paid_out = row[4] or 0
    
    # If they received money from us = SUPPLIER
    # If they paid us or owe us = CUSTOMER
    if paid_out > 0 and received == 0 and owed == 0:
        ptype = "SUPPLIER"
    elif owed > 0 or received > 0:
        ptype = "CUSTOMER"
    else:
        ptype = "?"
    
    print(f"{name[:35]:35} recv={received:>8} owe={owed:>8} paid={paid_out:>8} => {ptype}")