import requests

login = requests.post("http://localhost/api/auth/login", json={"email":"admin@artha.com","password":"admin123"})
token = login.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

items = requests.get("http://localhost/api/items/business/98813316-06e2-4294-a24b-464a686e7000", headers=headers).json()["data"]
print(f"Total: {len(items)} items")
for i in items:
    print(f"  - {i['name'][:35]}: Rs.{i['sellingPrice']}, stock: {i['currentStock']}")