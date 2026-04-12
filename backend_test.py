import requests
import sys
import json
from datetime import datetime

class ShelterLinkAPITester:
    def __init__(self, base_url="https://shelter-calendar-pro.preview.emergentagent.com/api"):
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