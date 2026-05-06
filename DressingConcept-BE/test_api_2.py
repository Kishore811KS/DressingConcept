import urllib.request
import json

def test(endpoint):
    url = f"http://localhost:5000{endpoint}"
    print(f"Testing {url}...")
    try:
        with urllib.request.urlopen(url) as r:
            print(f"Status: {r.getcode()}")
            # print(f"Response: {r.read().decode()[:200]}...")
            r.read()
            print("Response read successfully.")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

test("/api/products?per_page=100")
