import requests

login = requests.post("http://localhost/api/auth/login", json={"email":"admin@artha.com","password":"admin123"})
token = login.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

biz_id = "98813316-06e2-4294-a24b-464a686e7000"

# Clear invoices first
resp = requests.delete(f"http://localhost/api/invoices/business/{biz_id}", headers=headers)
print("Clear invoices:", resp.status_code)

# Clear parties
resp = requests.delete(f"http://localhost/api/parties/business/{biz_id}", headers=headers)
print("Clear parties:", resp.status_code)

# Clear items
resp = requests.delete(f"http://localhost/api/items/business/{biz_id}", headers=headers)
print("Clear items:", resp.status_code)

print("Done!")