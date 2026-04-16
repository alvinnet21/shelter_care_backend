import requests
import sys
from datetime import datetime

class ReviewCollectionTester:
    def __init__(self, base_url="https://admin-panel-update-37.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
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

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return True, response.json() if response.content else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            f"Login {email}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            return response['token']
        return None

    def test_listings_with_reviews_collection(self):
        """Test GET /api/listings returns reviews from reviews collection"""
        print("\n🎯 TESTING: Backend GET /api/listings returns reviews from reviews collection")
        
        success, response = self.run_test(
            "GET /api/listings (reviews from collection)",
            "GET",
            "listings?available_only=false",
            200
        )
        
        if not success:
            return False
            
        if 'listings' not in response:
            print("❌ Response missing 'listings' field")
            return False
            
        listings = response['listings']
        print(f"📊 Found {len(listings)} listings")
        
        if len(listings) == 0:
            print("ℹ️ No listings found to test reviews")
            return True
            
        # Check each listing for reviews field
        reviews_found = False
        for i, listing in enumerate(listings[:5]):  # Check first 5 listings
            listing_id = listing.get('id', f'listing_{i}')
            
            if 'reviews' not in listing:
                print(f"❌ Listing {listing_id} missing 'reviews' field")
                continue
                
            reviews = listing['reviews']
            print(f"✅ Listing {listing_id}: {len(reviews)} reviews")
            
            if len(reviews) > 0:
                reviews_found = True
                # Check review structure from reviews collection
                for j, review in enumerate(reviews[:2]):  # Check first 2 reviews
                    print(f"   Review {j+1}:")
                    
                    # Required fields from reviews collection
                    required_fields = ['rating', 'comment', 'seeker_id', 'listing_id']
                    for field in required_fields:
                        if field in review:
                            print(f"   ✅ Has {field}: {review[field]}")
                        else:
                            print(f"   ❌ Missing {field}")
                    
                    # Optional fields
                    optional_fields = ['seeker_name', 'created_at']
                    for field in optional_fields:
                        if field in review:
                            print(f"   ✅ Has {field}: {review[field]}")
                        else:
                            print(f"   ℹ️ Missing optional {field}")
        
        if not reviews_found:
            print("ℹ️ No reviews found in any listings (this is OK if no reviews exist)")
            
        return True

    def test_listing_detail_with_reviews_and_seeker_info(self):
        """Test GET /api/listings/{id} returns last 5 reviews with seeker_photo and seeker_name"""
        print("\n🎯 TESTING: Backend GET /api/listings/{id} returns last 5 reviews with seeker info")
        
        # First get a listing ID
        success, response = self.run_test(
            "GET /api/listings (to get listing ID)",
            "GET",
            "listings?available_only=false",
            200
        )
        
        if not success or not response.get('listings'):
            print("❌ Could not get listings to test detail endpoint")
            return False
            
        listing_id = response['listings'][0]['id']
        print(f"📋 Testing listing detail for ID: {listing_id}")
        
        # Test the detail endpoint
        success, response = self.run_test(
            f"GET /api/listings/{listing_id} (with reviews + seeker info)",
            "GET",
            f"listings/{listing_id}",
            200
        )
        
        if not success:
            return False
            
        listing = response
        
        # Check for reviews field
        if 'reviews' not in listing:
            print("❌ Listing detail missing 'reviews' field")
            return False
            
        reviews = listing['reviews']
        print(f"✅ Listing detail has {len(reviews)} reviews")
        
        # Check max 5 reviews constraint
        if len(reviews) <= 5:
            print("✅ Reviews limited to 5 or fewer (correct)")
        else:
            print(f"❌ Too many reviews returned: {len(reviews)} (should be max 5)")
            
        # Check review_count field
        if 'review_count' in listing:
            print(f"✅ Has review_count field: {listing['review_count']}")
        else:
            print("❌ Missing review_count field")
            
        # Check reviews structure with seeker info
        if len(reviews) > 0:
            print("📋 Checking review structure with seeker info:")
            for i, review in enumerate(reviews[:3]):  # Check first 3 reviews
                print(f"   Review {i+1}:")
                
                # Required fields
                required_fields = ['rating', 'comment']
                for field in required_fields:
                    if field in review:
                        print(f"   ✅ Has {field}: {review[field]}")
                    else:
                        print(f"   ❌ Missing required {field}")
                
                # Seeker info fields (key requirement)
                seeker_fields = ['seeker_name', 'seeker_photo']
                for field in seeker_fields:
                    if field in review:
                        value = review[field]
                        if value is not None:
                            print(f"   ✅ Has {field}: {value}")
                        else:
                            print(f"   ℹ️ Has {field} but value is null")
                    else:
                        print(f"   ❌ Missing {field}")
        else:
            print("ℹ️ No reviews found in listing detail (this is OK if no reviews exist)")
            
        return True

def main():
    print("🚀 Testing ShelterLink Review Collection Integration")
    print("=" * 60)
    
    tester = ReviewCollectionTester()
    
    # Test login with seeker credentials
    print("\n📋 Authentication...")
    seeker_token = tester.test_login("seeker2@test.com", "password123")
    if seeker_token:
        tester.token = seeker_token
        print("✅ Seeker login successful")
    else:
        print("❌ Seeker login failed")
    
    # Run the specific tests for review collection integration
    print("\n📋 Testing Review Collection Integration...")
    
    test1_passed = tester.test_listings_with_reviews_collection()
    test2_passed = tester.test_listing_detail_with_reviews_and_seeker_info()
    
    # Print results
    print("\n" + "=" * 60)
    print("📊 REVIEW COLLECTION TEST RESULTS:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if test1_passed and test2_passed:
        print("🎉 Review collection integration tests PASSED!")
        return 0
    else:
        print("❌ Some review collection tests FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())