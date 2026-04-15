import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Determine party type by transaction behavior
# Customer = someone who owes us money or we billed them (sales)
# Supplier = someone we paid (purchases)

cur.execute("""
    SELECT 
        n.name_id,
        n.full_name,
        n.name_type,
        n.name_expense_type,
        SUM(t.txn_cash_amount) as paid_to_us,
        SUM(t.txn_balance_amount) as owed_to_us,
        SUM(t.txn_cash_amount + t.txn_balance_amount) as total
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    GROUP BY n.name_id
""")

for row in cur.fetchall():
    name = row[1]
    paid = row[4] or 0
    owed = row[5] or 0
    total = row[6] or 0
    
    # Logic: If they paid us or owe us money = CUSTOMER
    # If we paid them (negative) = SUPPLIER
    if owed > 0 or paid > 0:
        ptype = "CUSTOMER"
    else:
        ptype = "SUPPLIER"
    
    print(f"{name}: paid={paid}, owe={owed}, type={ptype}")