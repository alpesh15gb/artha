import requests

BASE_URL = "http://localhost"

login = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "admin@artha.com",
    "password": "admin123"
})
token = login.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

biz_id = "98813316-06e2-4294-a24b-464a686e7000"
print(f"Using business: {biz_id}")

print("\nUploading test.vyb with clearExisting=true...")
with open("C:/Artha/test.vyb", "rb") as f:
    files = {"file": ("test.vyb", f, "application/zip")}
    data = {"businessId": biz_id, "clearExisting": "true"}
    import_resp = requests.post(
        f"{BASE_URL}/api/import/vyapar",
        files=files,
        data=data,
        headers=headers
    )

print("Import response:", import_resp.status_code)
print(import_resp.text)

if import_resp.status_code == 200:
    import_id = import_resp.json().get("data", {}).get("importId")
    if import_id:
        print(f"\nChecking import status (ID: {import_id})...")
        import time
        for i in range(10):
            time.sleep(2)
            status_resp = requests.get(f"{BASE_URL}/api/import/status/{import_id}", headers=headers)
            status = status_resp.json()["data"]
            print(f"Status: {status['status']} - Imported: {status['recordsImported']}, Failed: {status['recordsFailed']}")
            if status["status"] in ["COMPLETED", "FAILED", "PARTIAL"]:
                break