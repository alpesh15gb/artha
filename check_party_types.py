import requests

login = requests.post("http://localhost/api/auth/login", json={"email":"admin@artha.com","password":"admin123"})
token = login.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

biz_id = "98813316-06e2-4294-a24b-464a686e7000"

parties = requests.get(f"http://localhost/api/parties/business/{biz_id}", headers=headers).json()["data"]
print(f"Total parties: {len(parties)}")

# Count by type
customers = [p for p in parties if p["partyType"] == "CUSTOMER"]
suppliers = [p for p in parties if p["partyType"] == "SUPPLIER"]
print(f"\nCustomers: {len(customers)}")
print(f"Suppliers: {len(suppliers)}")

print("\n--- CUSTOMERS (first 5) ---")
for p in customers[:5]:
    print(f"  {p['name']}")

print("\n--- SUPPLIERS (first 5) ---")
for p in suppliers[:5]:
    print(f"  {p['name']}")