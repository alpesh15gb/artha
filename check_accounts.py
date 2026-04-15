import sqlite3

conn = sqlite3.connect("C:/Artha/test_vyb_extracted/ApexIntegrations__t_2026_01_03_12_09_32_kph8.vyp")
cur = conn.cursor()

# Check account types in other_accounts (ledger chart)
print("=== Account types in chart ===")
cur.execute("SELECT DISTINCT account_type FROM other_accounts")
for row in cur.fetchall():
    print(f"  Type: {row[0]}")

# Group by type
print("\n=== Accounts grouped ===")
cur.execute("""
    SELECT account_type, name, opening_balance
    FROM other_accounts
    ORDER BY account_type
""")
for row in cur.fetchall()[:20]:
    print(f"  Type {row[0]}: {row[1]} (OB: {row[2]})")