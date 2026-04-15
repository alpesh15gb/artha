docker exec artha-db psql -U artha -d artha_db -c UPDATE users SET role = 'ADMIN' WHERE email = 'admin@artha.com'
