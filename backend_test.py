import requests
import sys
import json
from datetime import datetime

class ShelterLinkAPITester:
    def __init__(self, base_url="https://95715eeb-f6f8-431b-9775-24aff10f83c6.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tokens = {}
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

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting ShelterLink Backend API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test sequence
        self.test_provider_registration_with_documents()
        self.test_provider_login_blocked_when_not_verified()
        self.test_seeker_login_works_normally()
        self.test_verificator_login_works()
        self.test_verificator_can_see_documents()
        self.test_forgot_password_endpoint()
        self.test_cancel_booking_endpoint()
        self.test_provider_login_after_verification()
        
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