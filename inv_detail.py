import requests

login = requests.post("http://localhost/api/auth/login", json={"email":"admin@artha.com","password":"admin123"})
token = login.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

biz_id = "98813316-06e2-4294-a24b-464a686e7000"

resp = requests.get(f"http://localhost/api/invoices/business/{biz_id}", headers=headers)
invoices = resp.json()["data"]
print(f"Found {len(invoices)} invoices")

for inv in invoices[:3]:
    print(f"\nInvoice {inv['invoiceNumber']}: Rs.{inv['totalAmount']}")
    print(f"  Status: {inv['status']}, Date: {inv['date'][:10]}")
    print(f"  Subtotal: {inv['subtotal']}, Tax: {inv['cgstAmount'] + inv['sgstAmount']}")
    print(f"  Paid: {inv['paidAmount']}, Balance: {inv['balanceDue']}")