import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check name_customer_type field!
print("=== name_customer_type values ===")
cur.execute("SELECT DISTINCT name_customer_type FROM kb_names")
for row in cur.fetchall():
    print(f"  {row[0]}")

# Cross-check ALL fields related to customer/supplier
print("\n=== Parties with name_type AND name_customer_type AND name_expense_type ===")
cur.execute("""
    SELECT full_name, name_type, name_customer_type, name_expense_type
    FROM kb_names
    ORDER BY name_type, name_customer_type
""")
for row in cur.fetchall():
    print(f"  {row[0]}: type={row[1]}, cust_type={row[2]}, exp_type={row[3]}")

# Check if there's a party_groups table that defines types
print("\n=== kb_party_groups ===")
cur.execute("SELECT * FROM kb_party_groups")
for row in cur.fetchall():
    print(row)

# Check chart_of_accounts_mapping
print("\n=== chart_of_accounts_mapping sample ===")
cur.execute("SELECT * FROM chart_of_accounts_mapping LIMIT 10")
for row in cur.fetchall():
    print(row)