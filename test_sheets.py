from backend.sheets import db

try:
    print("Testing connection...")
    cxn = db.client
    if cxn:
        print("Client connected.")
        print(f"Opening spreadsheet: {db.sh.title}")
        print("Worksheets:", [ws.title for ws in db.sh.worksheets()])
        print("Setup successful!")
    else:
        print("Failed to connect.")
except Exception as e:
    print(f"Error: {e}")
