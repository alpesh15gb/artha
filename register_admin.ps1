$body = @{email='admin@artha.com';password='admin123';name='Admin'} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://localhost/api/auth/register' -Method POST -Body $body -ContentType 'application/json'
