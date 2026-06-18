import requests
import random
import time
import sys

url = "http://localhost:5000/pothole"
devices = ["A001", "A002", "A003", "A004"]

print("==============================================")
print("   SMART POTHOLE IoT SIMULATOR (MOCK ARDUINO)")
print("==============================================")
print(f"Target URL: {url}")
print(f"Simulating devices: {', '.join(devices)}")
print("Sending pothole trigger every 10 seconds...")
print("Press Ctrl+C to stop.\n")

try:
    while True:
        # Select a random device
        device_id = random.choice(devices)
        
        data = {
            "device_id": device_id,
            "status": "POTHOLE"
        }
        
        print(f"[{time.strftime('%H:%M:%S')}] Pothole detected by {device_id}! Sending POST request...")
        
        try:
            response = requests.post(url, json=data, timeout=5)
            if response.status_code in [200, 201]:
                print(f" -> Success! Response: {response.json()}")
            else:
                print(f" -> Failed. Server returned status code: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f" -> Error connecting to backend: {e}")
            
        # Sleep for 10 seconds
        time.sleep(10)

except KeyboardInterrupt:
    print("\nSimulator stopped.")
    sys.exit(0)
