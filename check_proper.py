import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check transaction behavior for name_type=1 parties (the business customers/suppliers)
print("=== Type 1 parties with their transaction patterns ===")
cur.execute("""
    SELECT 
        n.full_name,
        SUM(CASE WHEN t.txn_balance_amount > 0 THEN t.txn_balance_amount ELSE 0 END) as they_owe_us,
        SUM(CASE WHEN t.txn_cash_amount > 0 THEN t.txn_cash_amount ELSE 0 END) as paid_us
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    WHERE n.name_type = 1
    GROUP BY n.name_id
""")

for row in cur.fetchall():
    name = row[0]
    owe = row[1] or 0
    paid = row[2] or 0
    
    # Customer = they owe us or pay us (money comes TO us)
    # Supplier = we pay them (money goes FROM us)
    if owe > 0 or paid > 0:
        ptype = "CUSTOMER"
    else:
        ptype = "SUPPLIER"
    
    print(f"{name[:40]:40} owe={owe:>10} paid={paid:>10} => {ptype}")