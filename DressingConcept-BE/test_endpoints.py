import requests

try:
    print("Testing /api/attendance/list?date=2026-05-06...")
    r = requests.get("http://localhost:5000/api/attendance/list?date=2026-05-06")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:500]}")
    
    print("\nTesting /api/salary/calculate?month=5&year=2026...")
    r = requests.get("http://localhost:5000/api/salary/calculate?month=5&year=2026")
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:500]}")
except Exception as e:
    print(f"Error: {str(e)}")
