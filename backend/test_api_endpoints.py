import requests
import json

def test_api():
    try:
        print("Testing Dashboard Stats...")
        r1 = requests.get("http://127.0.0.1:8000/api/dashboard/stats")
        print(f"Stats Status: {r1.status_code}")
        print(f"Stats Content: {r1.text}")

        print("\nTesting Dashboard Charts...")
        r2 = requests.get("http://127.0.0.1:8000/api/dashboard/charts")
        print(f"Charts Status: {r2.status_code}")
        print(f"Charts Content: {r2.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
