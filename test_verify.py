import requests

BASE_URL = "http://localhost"

login = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "admin@artha.com",
    "password": "admin123"
})
token = login.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

# Check parties - the correct endpoint is /business/:businessId
biz_id = "98813316-06e2-4294-a24b-464a686e7000"
parties_url = f"{BASE_URL}/api/parties/business/{biz_id}"
parties = requests.get(parties_url, headers=headers)
print("Parties:", parties.json())

# Check items
items_url = f"{BASE_URL}/api/items/business/{biz_id}"
items = requests.get(items_url, headers=headers)
print("\nItems count:", len(items.json()["data"]))