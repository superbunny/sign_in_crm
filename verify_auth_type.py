import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5000/api"

def test_multiple_auth_types():
    print("Testing multiple auth types...")
    
    # 1. Create a new department for testing
    print("\n1. Creating test department...")
    dept_data = {
        "name": "Test Dept Auth",
        "acronym": "TDA",
        "tier": "standard",
        "status": "active",
        "owner_team": "Client Success Alpha"
    }
    response = requests.post(f"{BASE_URL}/departments", json=dept_data)
    if response.status_code != 201:
        print(f"Failed to create department: {response.text}")
        sys.exit(1)
    dept_id = response.json()['department_id']
    print(f"Department created with ID: {dept_id}")

    # 2. Create application with multiple auth types
    print("\n2. Creating application with multiple auth types...")
    app_data = {
        "department_id": dept_id,
        "app_name": "Test App Multi Auth",
        "environment": "test",
        "auth_type": ["GC Key", "Interact Sign In"],
        "status": "integrating"
    }
    response = requests.post(f"{BASE_URL}/applications", json=app_data)
    if response.status_code != 201:
        print(f"Failed to create application: {response.text}")
        sys.exit(1)
    app = response.json()
    app_id = app['app_id']
    print(f"Application created with ID: {app_id}")
    print(f"Auth Type returned: {app.get('auth_type')}")
    
    if app.get('auth_type') != "GC Key,Interact Sign In":
        print("FAIL: Auth type not stored correctly on creation")
        # clean up
        requests.delete(f"{BASE_URL}/departments/{dept_id}")
        sys.exit(1)
    else:
        print("PASS: Auth type stored correctly on creation")

    # 3. Update application with different auth types
    print("\n3. Updating application auth types...")
    update_data = {
        "auth_type": ["GCCF Consolidator", "GC Key"]
    }
    response = requests.put(f"{BASE_URL}/applications/{app_id}", json=update_data)
    if response.status_code != 200:
        print(f"Failed to update application: {response.text}")
        sys.exit(1)
    updated_app = response.json()
    print(f"Updated Auth Type returned: {updated_app.get('auth_type')}")
    
    if updated_app.get('auth_type') != "GCCF Consolidator,GC Key":
        print("FAIL: Auth type not stored correctly on update")
    else:
        print("PASS: Auth type stored correctly on update")

    # Clean up
    print("\n4. Cleaning up...")
    requests.delete(f"{BASE_URL}/applications/{app_id}")
    requests.delete(f"{BASE_URL}/departments/{dept_id}")
    print("Cleanup complete.")

if __name__ == "__main__":
    try:
        test_multiple_auth_types()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the Flask app is running on port 5000.")
