import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check expense_type
print("=== Parties with expense types ===")
cur.execute("SELECT full_name, name_type, name_expense_type FROM kb_names WHERE name_expense_type IS NOT NULL")
for row in cur.fetchall():
    print(row)

# Check the other_accounts table
print("\n=== other_accounts ===")
cur.execute("SELECT name, account_type FROM other_accounts LIMIT 10")
for row in cur.fetchall():
    print(row)