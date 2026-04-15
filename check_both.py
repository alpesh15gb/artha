import requests

login = requests.post("http://localhost/api/auth/login", json={"email":"admin@artha.com","password":"admin123"})
token = login.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

biz_id = "98813316-06e2-4294-a24b-464a686e7000"

parties = requests.get(f"http://localhost/api/parties/business/{biz_id}", headers=headers).json()["data"]
print(f"Total: {len(parties)}")

customers = [p for p in parties if p["partyType"] == "CUSTOMER"]
suppliers = [p for p in parties if p["partyType"] == "SUPPLIER"]
both = [p for p in parties if p["partyType"] == "BOTH"]

print(f"\nCustomers: {len(customers)}")
print(f"Suppliers: {len(suppliers)}")
print(f"Both: {len(both)}")

print("\n--- BOTH (Customer & Supplier) ---")
for p in both:
    print(f"  {p['name']}")