import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Analyze: who receives money vs who we pay
# Customer = paid TO them (cash_amount goes to them)
# Supplier = WE pay (cash_amount goes OUT)

cur.execute("""
    SELECT 
        n.full_name,
        SUM(CASE WHEN t.txn_type IN (3, 83) THEN t.txn_cash_amount ELSE 0 END) as we_paid_them,
        SUM(CASE WHEN t.txn_type IN (1, 2) THEN t.txn_cash_amount ELSE 0 END) as they_paid_us,
        SUM(CASE WHEN t.txn_type IN (1, 2) THEN t.txn_balance_amount ELSE 0 END) as they_owe_us
    FROM kb_names n
    JOIN kb_transactions t ON n.name_id = t.txn_name_id
    GROUP BY n.name_id
""")

print("Party Analysis:")
print("-" * 80)
for row in cur.fetchall():
    name = row[0]
    we_paid = row[1] or 0
    they_paid = row[2] or 0
    they_owe = row[3] or 0
    
    # Logic: If they paid us or owe us = CUSTOMER
    # If we paid them = SUPPLIER
    if they_owe > 0:
        ptype = "CUSTOMER(owes)"
        reason = f"owe Rs.{they_owe}"
    elif they_paid > 0:
        ptype = "CUSTOMER(paid)"
        reason = f"paid Rs.{they_paid}"
    elif we_paid > 0:
        ptype = "SUPPLIER"
        reason = f"we paid Rs.{we_paid}"
    else:
        ptype = "UNKNOWN"
        reason = ""
    
    print(f"{name[:35]:35} | {ptype:20} | {reason}")