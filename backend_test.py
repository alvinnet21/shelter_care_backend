import requests
import sys
import json
from datetime import datetime

class ShelterLinkAPITester:
    def __init__(self, base_url="https://admin-panel-update-37.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tokens = {}
        self.listing_id = None
        self.booking_id = None
        self.test_results = {
            "passed": [],
            "failed": [],
            "backend_issues": [],
            "frontend_issues": []
        }

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        if success:
            self.test_results["passed"].append(f"✅ {test_name}")
            print(f"✅ {test_name}")
        else:
            self.test_results["failed"].append(f"❌ {test_name}: {details}")
            print(f"❌ {test_name}: {details}")

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            return success, response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return False, None

    def test_provider_registration_with_documents(self):
        """Test provider registration with both ID document and police check"""
        print("\n🔍 Testing Provider Registration with Documents...")
        
        # Test with both documents
        provider_data = {
            "email": "test_provider_docs@test.com",
            "full_name": "Test Provider With Docs",
            "password": "password123",
            "role": "PROVIDER",
            "id_document": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A==",
            "police_check": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        }
        
        success, response = self.make_request('POST', 'auth/register', provider_data, expected_status=200)
        
        if success:
            response_data = response.json()
            if response_data.get("needs_verification") == True:
                self.log_result("Provider registration with documents", True)
            else:
                self.log_result("Provider registration with documents", False, "Should indicate needs_verification=True")
        else:
            self.log_result("Provider registration with documents", False, f"Status: {response.status_code if response else 'No response'}")

    def test_provider_login_blocked_when_not_verified(self):
        """Test that unverified provider login returns 403"""
        print("\n🔍 Testing Provider Login Blocked When Not Verified...")
        
        # Try to login with unverified provider
        login_data = {
            "email": "test_provider_docs@test.com",
            "password": "password123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, expected_status=403)
        
        if success:
            response_data = response.json()
            if "verification" in response_data.get("detail", "").lower():
                self.log_result("Provider login blocked when not verified", True)
            else:
                self.log_result("Provider login blocked when not verified", False, f"Wrong error message: {response_data.get('detail')}")
        else:
            self.log_result("Provider login blocked when not verified", False, f"Expected 403, got {response.status_code if response else 'No response'}")

    def test_seeker_login_works_normally(self):
        """Test that seeker login works without verification"""
        print("\n🔍 Testing Seeker Login Works Normally...")
        
        # First register a seeker
        seeker_data = {
            "email": "test_seeker@test.com",
            "full_name": "Test Seeker",
            "password": "password123",
            "role": "SEEKER",
            "question_answer": "Test situation"
        }
        
        reg_success, reg_response = self.make_request('POST', 'auth/register', seeker_data, expected_status=200)
        
        if reg_success:
            # Now try to login
            login_data = {
                "email": "test_seeker@test.com",
                "password": "password123"
            }
            
            login_success, login_response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
            
            if login_success:
                response_data = login_response.json()
                if response_data.get("token") and response_data.get("user", {}).get("role") == "SEEKER":
                    self.tokens["seeker"] = response_data["token"]
                    self.log_result("Seeker login works normally", True)
                else:
                    self.log_result("Seeker login works normally", False, "Missing token or wrong role")
            else:
                self.log_result("Seeker login works normally", False, f"Login failed with status {login_response.status_code if login_response else 'No response'}")
        else:
            self.log_result("Seeker login works normally", False, "Failed to register seeker")

    def test_verificator_login_works(self):
        """Test that verificator login works"""
        print("\n🔍 Testing Verificator Login...")
        
        # Use existing verificator credentials
        login_data = {
            "email": "verificator@test.com",
            "password": "password123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success:
            response_data = response.json()
            if response_data.get("token") and response_data.get("user", {}).get("role") == "VERIFICATOR":
                self.tokens["verificator"] = response_data["token"]
                self.log_result("Verificator login works", True)
            else:
                self.log_result("Verificator login works", False, "Missing token or wrong role")
        else:
            self.log_result("Verificator login works", False, f"Status: {response.status_code if response else 'No response'}")

    def test_verificator_can_see_documents(self):
        """Test that verificator can see both ID and police check documents"""
        print("\n🔍 Testing Verificator Can See Documents...")
        
        if "verificator" not in self.tokens:
            self.log_result("Verificator can see documents", False, "No verificator token available")
            return
        
        success, response = self.make_request('GET', 'verificator/providers?status=PENDING', token=self.tokens["verificator"])
        
        if success:
            response_data = response.json()
            providers = response_data.get("providers", [])
            
            # Look for our test provider
            test_provider = None
            for provider in providers:
                if provider.get("email") == "test_provider_docs@test.com":
                    test_provider = provider
                    break
            
            if test_provider:
                has_id = bool(test_provider.get("id_document"))
                has_police = bool(test_provider.get("police_check"))
                
                if has_id and has_police:
                    self.log_result("Verificator can see documents", True)
                else:
                    self.log_result("Verificator can see documents", False, f"Missing documents - ID: {has_id}, Police: {has_police}")
            else:
                self.log_result("Verificator can see documents", False, "Test provider not found in pending list")
        else:
            self.log_result("Verificator can see documents", False, f"Status: {response.status_code if response else 'No response'}")

    def test_forgot_password_endpoint(self):
        """Test forgot password endpoint"""
        print("\n🔍 Testing Forgot Password Endpoint...")
        
        forgot_data = {
            "email": "test_seeker@test.com"
        }
        
        success, response = self.make_request('POST', 'auth/forgot-password', forgot_data, expected_status=200)
        
        if success:
            response_data = response.json()
            if "password" in response_data.get("message", "").lower():
                self.log_result("Forgot password endpoint", True)
            else:
                self.log_result("Forgot password endpoint", False, f"Unexpected message: {response_data.get('message')}")
        else:
            self.log_result("Forgot password endpoint", False, f"Status: {response.status_code if response else 'No response'}")

    def test_cancel_booking_endpoint(self):
        """Test cancel booking endpoint restrictions"""
        print("\n🔍 Testing Cancel Booking Endpoint...")
        
        if "seeker" not in self.tokens:
            self.log_result("Cancel booking endpoint", False, "No seeker token available")
            return
        
        # First create a booking (this will fail if no listings exist, but we test the cancel endpoint)
        # For now, test with a fake booking ID to check the endpoint exists
        fake_booking_id = "test-booking-123"
        
        success, response = self.make_request('PUT', f'bookings/{fake_booking_id}/cancel', token=self.tokens["seeker"], expected_status=404)
        
        # We expect 404 for non-existent booking, which means the endpoint exists
        if success or (response and response.status_code == 404):
            self.log_result("Cancel booking endpoint exists", True)
        else:
            self.log_result("Cancel booking endpoint exists", False, f"Unexpected status: {response.status_code if response else 'No response'}")

    def test_provider_login_after_verification(self):
        """Test that provider can login after verification"""
        print("\n🔍 Testing Provider Login After Verification...")
        
        if "verificator" not in self.tokens:
            self.log_result("Provider login after verification", False, "No verificator token available")
            return
        
        # First, approve the test provider
        # Get the provider ID first
        success, response = self.make_request('GET', 'verificator/providers?status=PENDING', token=self.tokens["verificator"])
        
        if success:
            providers = response.json().get("providers", [])
            test_provider = None
            for provider in providers:
                if provider.get("email") == "test_provider_docs@test.com":
                    test_provider = provider
                    break
            
            if test_provider:
                provider_id = test_provider["id"]
                
                # Approve the provider
                approve_success, approve_response = self.make_request(
                    'PUT', 
                    f'verificator/providers/{provider_id}/verify?action=APPROVE', 
                    token=self.tokens["verificator"]
                )
                
                if approve_success:
                    # Now try to login as the provider
                    login_data = {
                        "email": "test_provider_docs@test.com",
                        "password": "password123"
                    }
                    
                    login_success, login_response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
                    
                    if login_success:
                        response_data = login_response.json()
                        if response_data.get("token") and response_data.get("user", {}).get("role") == "PROVIDER":
                            self.tokens["provider"] = response_data["token"]
                            self.log_result("Provider login after verification", True)
                        else:
                            self.log_result("Provider login after verification", False, "Missing token or wrong role")
                    else:
                        self.log_result("Provider login after verification", False, f"Login failed: {login_response.status_code if login_response else 'No response'}")
                else:
                    self.log_result("Provider login after verification", False, "Failed to approve provider")
            else:
                self.log_result("Provider login after verification", False, "Test provider not found")
        else:
            self.log_result("Provider login after verification", False, "Failed to get providers list")

    def test_existing_credentials_login(self):
        """Test login with existing test credentials"""
        print("\n🔍 Testing Existing Credentials Login...")
        
        # Login with seeker3 (has accepted booking Apr 15-20)
        seeker3_data = {
            "email": "seeker3@test.com",
            "password": "password123"
        }
        
        success, response = self.make_request('POST', 'auth/login', seeker3_data, expected_status=200)
        if success:
            response_data = response.json()
            if response_data.get("token"):
                self.tokens["seeker3"] = response_data["token"]
                self.log_result("Seeker3 login", True)
            else:
                self.log_result("Seeker3 login", False, "No token received")
        else:
            self.log_result("Seeker3 login", False, f"Status: {response.status_code if response else 'No response'}")

        # Login with provider
        provider_data = {
            "email": "provider@test.com",
            "password": "password123"
        }
        
        success, response = self.make_request('POST', 'auth/login', provider_data, expected_status=200)
        if success:
            response_data = response.json()
            if response_data.get("token"):
                self.tokens["provider_verified"] = response_data["token"]
                self.log_result("Verified provider login", True)
            else:
                self.log_result("Verified provider login", False, "No token received")
        else:
            self.log_result("Verified provider login", False, f"Status: {response.status_code if response else 'No response'}")

    def test_create_listing_for_calendar_test(self):
        """Create a test listing for calendar testing"""
        print("\n🔍 Creating Test Listing for Calendar...")
        
        if "provider_verified" not in self.tokens:
            self.log_result("Create test listing", False, "No verified provider token")
            return
        
        listing_data = {
            "title": "Calendar Test Shelter",
            "description": "Test shelter for calendar blocking functionality",
            "address": "123 Test Street, Test City",
            "photos": ["https://example.com/photo1.jpg"]
        }
        
        success, response = self.make_request('POST', 'listings', listing_data, token=self.tokens["provider_verified"], expected_status=200)
        
        if success:
            response_data = response.json()
            listing = response_data.get("listing", {})
            if listing.get("id"):
                self.listing_id = listing["id"]
                self.log_result("Create test listing", True)
            else:
                self.log_result("Create test listing", False, "No listing ID returned")
        else:
            self.log_result("Create test listing", False, f"Status: {response.status_code if response else 'No response'}")

    def test_create_accepted_booking(self):
        """Create an accepted booking for Apr 15-20 to test calendar blocking"""
        print("\n🔍 Creating Accepted Booking for Calendar Test...")
        
        if not self.listing_id or "seeker3" not in self.tokens:
            self.log_result("Create accepted booking", False, "Missing listing ID or seeker3 token")
            return
        
        # Create booking
        booking_data = {
            "listing_id": self.listing_id,
            "check_in_date": "2025-04-15T00:00:00",
            "check_out_date": "2025-04-20T00:00:00"
        }
        
        success, response = self.make_request('POST', 'bookings', booking_data, token=self.tokens["seeker3"], expected_status=200)
        
        if success:
            response_data = response.json()
            booking = response_data.get("booking", {})
            if booking.get("id"):
                self.booking_id = booking["id"]
                
                # Accept the booking as provider
                accept_success, accept_response = self.make_request(
                    'PUT', 
                    f'bookings/{self.booking_id}/accept', 
                    token=self.tokens["provider_verified"]
                )
                
                if accept_success:
                    self.log_result("Create and accept booking", True)
                else:
                    self.log_result("Create and accept booking", False, "Failed to accept booking")
            else:
                self.log_result("Create and accept booking", False, "No booking ID returned")
        else:
            self.log_result("Create and accept booking", False, f"Status: {response.status_code if response else 'No response'}")

    def test_listing_availability_api(self):
        """Test the listing availability API returns blocked dates"""
        print("\n🔍 Testing Listing Availability API...")
        
        if not self.listing_id:
            self.log_result("Listing availability API", False, "No listing ID available")
            return
        
        success, response = self.make_request('GET', f'listings/{self.listing_id}/availability')
        
        if success:
            response_data = response.json()
            blocked_dates = response_data.get("blocked_dates", [])
            
            # Check if we have blocked dates from the accepted booking
            has_april_block = False
            for block in blocked_dates:
                check_in = block.get("check_in", "")
                if "2025-04-15" in check_in:
                    has_april_block = True
                    break
            
            if has_april_block:
                self.log_result("Listing availability API returns blocked dates", True)
            else:
                self.log_result("Listing availability API returns blocked dates", False, f"No April 15-20 block found in: {blocked_dates}")
        else:
            self.log_result("Listing availability API returns blocked dates", False, f"Status: {response.status_code if response else 'No response'}")

    def test_manual_date_blocking(self):
        """Test manual date blocking by provider"""
        print("\n🔍 Testing Manual Date Blocking...")
        
        if not self.listing_id or "provider_verified" not in self.tokens:
            self.log_result("Manual date blocking", False, "Missing listing ID or provider token")
            return
        
        # Block some manual dates
        block_data = {
            "dates": ["2025-05-01", "2025-05-02", "2025-05-03"]
        }
        
        success, response = self.make_request(
            'POST', 
            f'listings/{self.listing_id}/block-dates', 
            block_data, 
            token=self.tokens["provider_verified"]
        )
        
        if success:
            # Verify the dates are blocked by checking availability
            avail_success, avail_response = self.make_request('GET', f'listings/{self.listing_id}/availability')
            
            if avail_success:
                blocked_dates = avail_response.json().get("blocked_dates", [])
                has_manual_block = any("2025-05-01" in block.get("check_in", "") for block in blocked_dates)
                
                if has_manual_block:
                    self.log_result("Manual date blocking", True)
                else:
                    self.log_result("Manual date blocking", False, "Manual blocked dates not found in availability")
            else:
                self.log_result("Manual date blocking", False, "Failed to verify blocked dates")
        else:
            self.log_result("Manual date blocking", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_login(self):
        """Test admin login with existing credentials"""
        print("\n🔍 Testing Admin Login...")
        
        admin_data = {
            "email": "admin@test.com",
            "password": "password123"
        }
        
        success, response = self.make_request('POST', 'auth/login', admin_data, expected_status=200)
        if success:
            response_data = response.json()
            if response_data.get("token") and response_data.get("user", {}).get("role") == "ADMIN":
                self.tokens["admin"] = response_data["token"]
                self.log_result("Admin login", True)
            else:
                self.log_result("Admin login", False, "Missing token or wrong role")
        else:
            self.log_result("Admin login", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_stats_api(self):
        """Test admin stats API returns total users, bookings, listings"""
        print("\n🔍 Testing Admin Stats API...")
        
        if "admin" not in self.tokens:
            self.log_result("Admin stats API", False, "No admin token available")
            return
        
        success, response = self.make_request('GET', 'admin/stats', token=self.tokens["admin"])
        
        if success:
            response_data = response.json()
            required_fields = ["total_users", "total_bookings", "total_listings"]
            has_all_fields = all(field in response_data for field in required_fields)
            
            if has_all_fields:
                self.log_result("Admin stats API", True)
            else:
                missing = [f for f in required_fields if f not in response_data]
                self.log_result("Admin stats API", False, f"Missing fields: {missing}")
        else:
            self.log_result("Admin stats API", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_user_management(self):
        """Test admin user management APIs"""
        print("\n🔍 Testing Admin User Management...")
        
        if "admin" not in self.tokens:
            self.log_result("Admin user management", False, "No admin token available")
            return
        
        # Test get all users
        success, response = self.make_request('GET', 'admin/users', token=self.tokens["admin"])
        
        if success:
            response_data = response.json()
            users = response_data.get("users", [])
            
            if isinstance(users, list) and len(users) > 0:
                # Find a non-admin user to test soft delete
                test_user = None
                for user in users:
                    if user.get("role") != "ADMIN":
                        test_user = user
                        break
                
                if test_user:
                    user_id = test_user["id"]
                    
                    # Test soft delete
                    delete_success, delete_response = self.make_request(
                        'PUT', 
                        f'admin/users/{user_id}/delete', 
                        token=self.tokens["admin"]
                    )
                    
                    if delete_success:
                        self.log_result("Admin user soft delete", True)
                    else:
                        self.log_result("Admin user soft delete", False, f"Delete failed: {delete_response.status_code if delete_response else 'No response'}")
                else:
                    self.log_result("Admin user management", False, "No non-admin users found to test delete")
            else:
                self.log_result("Admin user management", False, "No users returned or invalid format")
        else:
            self.log_result("Admin user management", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_listing_management(self):
        """Test admin listing management APIs"""
        print("\n🔍 Testing Admin Listing Management...")
        
        if "admin" not in self.tokens:
            self.log_result("Admin listing management", False, "No admin token available")
            return
        
        # Test get all listings
        success, response = self.make_request('GET', 'admin/listings', token=self.tokens["admin"])
        
        if success:
            response_data = response.json()
            listings = response_data.get("listings", [])
            
            if isinstance(listings, list):
                if self.listing_id:
                    # Test soft delete listing
                    delete_success, delete_response = self.make_request(
                        'PUT', 
                        f'admin/listings/{self.listing_id}/delete', 
                        token=self.tokens["admin"]
                    )
                    
                    if delete_success:
                        self.log_result("Admin listing takedown", True)
                    else:
                        self.log_result("Admin listing takedown", False, f"Takedown failed: {delete_response.status_code if delete_response else 'No response'}")
                else:
                    self.log_result("Admin listing management", True, "Listings API works (no test listing to delete)")
            else:
                self.log_result("Admin listing management", False, "Invalid listings format")
        else:
            self.log_result("Admin listing management", False, f"Status: {response.status_code if response else 'No response'}")

    def test_public_profile_api(self):
        """Test public profile API for different user roles"""
        print("\n🔍 Testing Public Profile API...")
        
        # Test with seeker profile
        if "seeker3" in self.tokens:
            # Get seeker user ID from token (we'll use a known seeker)
            success, response = self.make_request('GET', 'auth/me', token=self.tokens["seeker3"])
            
            if success:
                user_data = response.json()
                user_id = user_data.get("id")
                
                if user_id:
                    # Test public profile access
                    profile_success, profile_response = self.make_request('GET', f'users/{user_id}/profile')
                    
                    if profile_success:
                        profile_data = profile_response.json()
                        
                        # Check seeker profile shows phone number
                        if profile_data.get("role") == "SEEKER":
                            has_phone = "phone_number" in profile_data
                            self.log_result("Public profile API - Seeker shows phone", has_phone)
                        else:
                            self.log_result("Public profile API - Seeker", False, "Wrong role returned")
                    else:
                        self.log_result("Public profile API - Seeker", False, f"Profile fetch failed: {profile_response.status_code if profile_response else 'No response'}")
                else:
                    self.log_result("Public profile API - Seeker", False, "No user ID found")
            else:
                self.log_result("Public profile API - Seeker", False, "Failed to get user info")

        # Test with provider profile
        if "provider_verified" in self.tokens:
            success, response = self.make_request('GET', 'auth/me', token=self.tokens["provider_verified"])
            
            if success:
                user_data = response.json()
                user_id = user_data.get("id")
                
                if user_id:
                    profile_success, profile_response = self.make_request('GET', f'users/{user_id}/profile')
                    
                    if profile_success:
                        profile_data = profile_response.json()
                        
                        # Check provider profile shows listings but no phone
                        if profile_data.get("role") == "PROVIDER":
                            has_listings = "listings" in profile_data
                            has_reviews = "last_reviews" in profile_data
                            no_phone = "phone_number" not in profile_data
                            
                            if has_listings and has_reviews and no_phone:
                                self.log_result("Public profile API - Provider shows listings, no phone", True)
                            else:
                                self.log_result("Public profile API - Provider", False, f"Missing fields - listings: {has_listings}, reviews: {has_reviews}, no_phone: {no_phone}")
                        else:
                            self.log_result("Public profile API - Provider", False, "Wrong role returned")
                    else:
                        self.log_result("Public profile API - Provider", False, f"Profile fetch failed: {profile_response.status_code if profile_response else 'No response'}")

    def test_bookings_with_phone_visibility(self):
        """Test that provider can see seeker phone in booking requests"""
        print("\n🔍 Testing Booking Phone Visibility...")
        
        if "provider_verified" not in self.tokens:
            self.log_result("Booking phone visibility", False, "No provider token available")
            return
        
        # Get provider bookings
        success, response = self.make_request('GET', 'bookings/me', token=self.tokens["provider_verified"])
        
        if success:
            response_data = response.json()
            bookings = response_data.get("bookings", [])
            
            if bookings:
                # Check if any booking has seeker phone
                has_phone_info = any(booking.get("seeker_phone") for booking in bookings)
                
                if has_phone_info:
                    self.log_result("Booking phone visibility", True)
                else:
                    self.log_result("Booking phone visibility", False, "No seeker phone found in bookings")
            else:
                self.log_result("Booking phone visibility", True, "No bookings to test (API works)")
        else:
            self.log_result("Booking phone visibility", False, f"Status: {response.status_code if response else 'No response'}")

    def test_listing_with_address_fields(self):
        """Test listing creation with separate address, suburb, postcode fields"""
        print("\n🔍 Testing Listing Address Fields...")
        
        if "provider_verified" not in self.tokens:
            self.log_result("Listing address fields", False, "No provider token available")
            return
        
        listing_data = {
            "title": "Address Test Shelter",
            "description": "Test shelter for address field separation",
            "address": "456 Test Avenue",
            "suburb": "Testville",
            "postcode": "2000",
            "photos": ["https://example.com/photo1.jpg"]
        }
        
        success, response = self.make_request('POST', 'listings', listing_data, token=self.tokens["provider_verified"], expected_status=200)
        
        if success:
            response_data = response.json()
            listing = response_data.get("listing", {})
            
            # Check all address fields are present
            has_address = listing.get("address") == "456 Test Avenue"
            has_suburb = listing.get("suburb") == "Testville"
            has_postcode = listing.get("postcode") == "2000"
            
            if has_address and has_suburb and has_postcode:
                self.log_result("Listing address fields", True)
            else:
                self.log_result("Listing address fields", False, f"Missing fields - address: {has_address}, suburb: {has_suburb}, postcode: {has_postcode}")
        else:
            self.log_result("Listing address fields", False, f"Status: {response.status_code if response else 'No response'}")

    def test_profile_update_with_phone(self):
        """Test profile update with phone number (+61 prefix)"""
        print("\n🔍 Testing Profile Update with Phone...")
        
        if "seeker3" not in self.tokens:
            self.log_result("Profile update with phone", False, "No seeker token available")
            return
        
        profile_data = {
            "full_name": "Updated Seeker Name",
            "phone_number": "+61412345678",
            "description": "Updated description",
            "date_of_birth": "1990-01-01"
        }
        
        success, response = self.make_request('PUT', 'auth/profile', profile_data, token=self.tokens["seeker3"])
        
        if success:
            # Verify the update by getting profile
            verify_success, verify_response = self.make_request('GET', 'auth/me', token=self.tokens["seeker3"])
            
            if verify_success:
                user_data = verify_response.json()
                
                has_phone = user_data.get("phone_number") == "+61412345678"
                has_name = user_data.get("full_name") == "Updated Seeker Name"
                has_dob = user_data.get("date_of_birth") == "1990-01-01"
                
                if has_phone and has_name and has_dob:
                    self.log_result("Profile update with phone", True)
                else:
                    self.log_result("Profile update with phone", False, f"Update failed - phone: {has_phone}, name: {has_name}, dob: {has_dob}")
            else:
                self.log_result("Profile update with phone", False, "Failed to verify update")
        else:
            self.log_result("Profile update with phone", False, f"Status: {response.status_code if response else 'No response'}")

    def test_soft_deleted_user_cannot_login(self):
        """Test that soft deleted user cannot login"""
        print("\n🔍 Testing Soft Deleted User Cannot Login...")
        
        # First create a test user to delete
        test_user_data = {
            "email": "delete_test@test.com",
            "full_name": "Delete Test User",
            "password": "password123",
            "role": "SEEKER",
            "question_answer": "Test situation"
        }
        
        reg_success, reg_response = self.make_request('POST', 'auth/register', test_user_data, expected_status=200)
        
        if reg_success:
            # Login to get user ID
            login_data = {
                "email": "delete_test@test.com",
                "password": "password123"
            }
            
            login_success, login_response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
            
            if login_success:
                user_data = login_response.json()
                user_id = user_data.get("user", {}).get("id")
                
                if user_id and "admin" in self.tokens:
                    # Soft delete the user
                    delete_success, delete_response = self.make_request(
                        'PUT', 
                        f'admin/users/{user_id}/delete', 
                        token=self.tokens["admin"]
                    )
                    
                    if delete_success:
                        # Try to login again - should fail
                        retry_success, retry_response = self.make_request('POST', 'auth/login', login_data, expected_status=401)
                        
                        if retry_success or (retry_response and retry_response.status_code == 401):
                            self.log_result("Soft deleted user cannot login", True)
                        else:
                            self.log_result("Soft deleted user cannot login", False, f"Login should have failed but got: {retry_response.status_code if retry_response else 'No response'}")
                    else:
                        self.log_result("Soft deleted user cannot login", False, "Failed to delete user")
                else:
                    self.log_result("Soft deleted user cannot login", False, "Missing user ID or admin token")
            else:
                self.log_result("Soft deleted user cannot login", False, "Failed to login test user")
        else:
            self.log_result("Soft deleted user cannot login", False, "Failed to create test user")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting ShelterLink Backend API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test sequence - original tests
        self.test_provider_registration_with_documents()
        self.test_provider_login_blocked_when_not_verified()
        self.test_seeker_login_works_normally()
        self.test_verificator_login_works()
        self.test_verificator_can_see_documents()
        self.test_forgot_password_endpoint()
        self.test_cancel_booking_endpoint()
        self.test_provider_login_after_verification()
        
        # Calendar blocking tests
        print("\n🗓️ Starting Calendar Blocking Tests...")
        self.test_existing_credentials_login()
        self.test_create_listing_for_calendar_test()
        self.test_create_accepted_booking()
        self.test_listing_availability_api()
        self.test_manual_date_blocking()
        
        # New feature tests for major update
        print("\n🆕 Starting Major Update Feature Tests...")
        self.test_admin_login()
        self.test_admin_stats_api()
        self.test_admin_user_management()
        self.test_admin_listing_management()
        self.test_public_profile_api()
        self.test_bookings_with_phone_visibility()
        self.test_listing_with_address_fields()
        self.test_profile_update_with_phone()
        self.test_soft_deleted_user_cannot_login()
        
        # Summary
        print(f"\n📊 Test Summary:")
        print(f"✅ Passed: {len(self.test_results['passed'])}")
        print(f"❌ Failed: {len(self.test_results['failed'])}")
        
        if self.test_results['failed']:
            print("\n❌ Failed Tests:")
            for failure in self.test_results['failed']:
                print(f"  {failure}")
        
        return len(self.test_results['failed']) == 0

def main():
    tester = ShelterLinkAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())