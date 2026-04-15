import requests

login = requests.post("http://localhost/api/auth/login", json={"email":"admin@artha.com","password":"admin123"})
token = login.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

biz_id = "98813316-06e2-4294-a24b-464a686e7000"

# Check parties
parties = requests.get(f"http://localhost/api/parties/business/{biz_id}", headers=headers).json()
print(f"Parties: {len(parties['data'])}")

# Check items
items = requests.get(f"http://localhost/api/items/business/{biz_id}", headers=headers).json()
print(f"Items: {len(items['data'])}")

# Check invoices
invoices = requests.get(f"http://localhost/api/invoices/business/{biz_id}", headers=headers).json()
print(f"Invoices: {len(invoices['data'])}")

# Show sample invoice
if invoices['data']:
    inv = invoices['data'][0]
    print(f"\nSample Invoice: {inv['invoiceNumber']}")
    print(f"  Party: {inv.get('partyId', 'N/A')}")
    print(f"  Amount: Rs.{inv['totalAmount']}")
    print(f"  Status: {inv['status']}")
    print(f"  Items: {inv.get('_count', {}).get('items', 0)}")