import requests
import sys
from datetime import datetime

class ShelterLinkAPITester:
    def __init__(self, base_url="https://admin-panel-update-37.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.seeker_token = None
        self.provider_token = None
        self.verificator_token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register_and_login(self, email, full_name, password, role_name):
        """Register user and then login"""
        # Try to register first
        register_data = {
            "email": email,
            "full_name": full_name,
            "password": password,
            "role": role_name.upper()
        }
        
        # Add required fields for provider
        if role_name.upper() == "PROVIDER":
            register_data["id_document"] = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=="
            register_data["police_check"] = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=="
        
        success, response = self.run_test(
            f"Register {role_name}",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not success:
            print(f"   Registration failed, trying to login with existing credentials...")
        
        # Try to login regardless of registration result
        success, response = self.run_test(
            f"Login as {role_name}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            return response['token']
        return None

    def test_admin_features(self):
        """Test admin-specific features"""
        print("\n=== TESTING ADMIN FEATURES ===")
        
        # Test admin stats
        success, stats = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Stats: Users={stats.get('total_users')}, Bookings={stats.get('total_bookings')}, Listings={stats.get('total_listings')}")

        # Test admin users list
        success, users_data = self.run_test(
            "Admin Users List",
            "GET",
            "admin/users",
            200,
            token=self.admin_token
        )
        if success:
            users = users_data.get('users', [])
            print(f"   Found {len(users)} users")
            # Check for pending providers
            pending_providers = [u for u in users if u.get('role') == 'PROVIDER' and u.get('verification_status') == 'PENDING']
            print(f"   Pending providers: {len(pending_providers)}")

        # Test admin listings list
        success, listings_data = self.run_test(
            "Admin Listings List",
            "GET",
            "admin/listings",
            200,
            token=self.admin_token
        )
        if success:
            listings = listings_data.get('listings', [])
            print(f"   Found {len(listings)} listings")

    def test_verificator_features(self):
        """Test verificator features accessible by admin"""
        print("\n=== TESTING VERIFICATOR FEATURES (Admin Access) ===")
        
        # Test verificator stats
        success, stats = self.run_test(
            "Verificator Stats",
            "GET",
            "verificator/stats",
            200,
            token=self.admin_token
        )
        if success:
            print(f"   Provider Stats: Total={stats.get('total_providers')}, Pending={stats.get('pending_verification')}, Verified={stats.get('verified_providers')}")

        # Test providers list
        success, providers_data = self.run_test(
            "Verificator Providers List",
            "GET",
            "verificator/providers",
            200,
            token=self.admin_token
        )
        if success:
            providers = providers_data.get('providers', [])
            print(f"   Found {len(providers)} providers")

    def test_profile_api(self):
        """Test public profile API"""
        print("\n=== TESTING PROFILE API ===")
        
        # Get admin user profile
        success, response = self.run_test(
            "Admin Profile API",
            "GET",
            "auth/me",
            200,
            token=self.admin_token
        )
        if success:
            admin_id = response.get('id')
            if admin_id:
                # Test public profile endpoint
                success, profile = self.run_test(
                    "Public Profile API",
                    "GET",
                    f"users/{admin_id}/profile",
                    200
                )
                if success:
                    print(f"   Profile: {profile.get('full_name')} ({profile.get('role')})")

    def test_listings_api(self):
        """Test listings API"""
        print("\n=== TESTING LISTINGS API ===")
        
        # Test public listings
        success, listings_data = self.run_test(
            "Public Listings",
            "GET",
            "listings?available_only=false",
            200
        )
        if success:
            listings = listings_data.get('listings', [])
            print(f"   Found {len(listings)} public listings")
            
            # Test listing detail if any listings exist
            if listings:
                listing_id = listings[0]['id']
                success, listing_detail = self.run_test(
                    "Listing Detail",
                    "GET",
                    f"listings/{listing_id}",
                    200
                )
                if success:
                    print(f"   Listing detail: {listing_detail.get('title')}")

def main():
    # Setup
    tester = ShelterLinkAPITester()
    
    print("🚀 Starting ShelterLink Admin Panel Update API Tests")
    
    # Test credentials from test_credentials.md
    test_credentials = [
        {"email": "admin@test.com", "password": "password123", "role": "ADMIN", "full_name": "Admin User"},
        {"email": "seeker2@test.com", "password": "password123", "role": "SEEKER", "full_name": "Seeker User"},
        {"email": "provider@test.com", "password": "password123", "role": "PROVIDER", "full_name": "Provider User"},
        {"email": "verificator@test.com", "password": "password123", "role": "VERIFICATOR", "full_name": "Verificator User"}
    ]
    
    # Register and login with different roles
    for cred in test_credentials:
        token = tester.test_register_and_login(cred["email"], cred["full_name"], cred["password"], cred["role"])
        if token:
            if cred["role"] == "ADMIN":
                tester.admin_token = token
            elif cred["role"] == "SEEKER":
                tester.seeker_token = token
            elif cred["role"] == "PROVIDER":
                tester.provider_token = token
            elif cred["role"] == "VERIFICATOR":
                tester.verificator_token = token

    # Run feature tests if admin login successful
    if tester.admin_token:
        tester.test_admin_features()
        tester.test_verificator_features()
        tester.test_profile_api()
        tester.test_listings_api()
    else:
        print("❌ Admin login failed, skipping admin feature tests")

    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())