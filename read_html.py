
import os

file_path = r'd:\laragon\www\VenueVisor\public\build\assets\Reservation Form\revised venue reservation form 2026.html'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    start = content.find('<body')
    if start == -1:
        print("BODY_NOT_FOUND")
    else:
        # Just print the first 2000 chars of body to check structure
        print(content[start:start+2000])
except Exception as e:
    print(f"Error: {e}")
