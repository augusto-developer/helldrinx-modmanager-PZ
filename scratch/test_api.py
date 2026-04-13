import requests
import json

URL = "http://127.0.0.1:8000/api/map-list"
PAYLOAD = ["map_distanciado", "Raven Creek B42", "Muldraugh, KY"]

try:
    print(f"Testing POST to {URL} with payload: {PAYLOAD}")
    response = requests.post(URL, json=PAYLOAD, timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
