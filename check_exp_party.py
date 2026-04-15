import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check type 2 parties (expense_type 1 vs 2)
print("=== Type 2 parties with their transactions ===")
cur.execute("""
    SELECT 
        n.full_name,
        n.name_expense_type,
        SUM(CASE WHEN t.txn_cash_amount > 0 THEN t.txn_cash_amount ELSE 0 END) as we_paid
    FROM kb_names n
    LEFT JOIN kb_transactions t ON n.name_id = t.txn_name_id
    WHERE n.name_type = 2
    GROUP BY n.name_id
""")

for row in cur.fetchall():
    name = row[0]
    exp_type = row[1]
    we_paid = row[2] or 0
    
    # exp_type=2 means expense (we pay them) = SUPPLIER
    # exp_type=1 means customer = CUSTOMER
    if exp_type == '2':
        ptype = "SUPPLIER (expense)"
    else:
        ptype = "CUSTOMER"
    
    print(f"{name}: exp_type={exp_type}, we paid={we_paid} => {ptype}")