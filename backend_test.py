import requests
import sys
import json
from datetime import datetime
import io

class LeadCentralAPITester:
    def __init__(self, base_url="https://projet-tracker-14.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.prospecteur_token = None
        self.tests_run = 0
        self.tests_passed = 0

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ PASS: {test_name}")
        else:
            print(f"❌ FAIL: {test_name} - {details}")
        
        if details:
            print(f"   Details: {details}")

    def make_request(self, method, endpoint, data=None, headers=None, files=None):
        """Make HTTP request and return response"""
        url = f"{self.api_url}{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if headers:
            default_headers.update(headers)
        
        # Remove Content-Type for file uploads
        if files:
            default_headers.pop('Content-Type', None)

        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=default_headers)
                else:
                    response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)
            
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_basic_api(self):
        """Test basic API endpoint"""
        print("\n🔍 Testing basic API endpoints...")
        
        # Test /api/
        response = self.make_request('GET', '/')
        if response and response.status_code == 200:
            data = response.json()
            success = "LeadCentral API" in data.get("message", "")
            self.log_result("API Root Endpoint", success, f"Status: {response.status_code}, Message: {data.get('message', 'No message')}")
        else:
            self.log_result("API Root Endpoint", False, f"Status: {response.status_code if response else 'No response'}")

        # Test health check
        response = self.make_request('GET', '/health')
        if response and response.status_code == 200:
            data = response.json()
            success = data.get("status") == "healthy"
            self.log_result("Health Check", success, f"Status: {data.get('status')}")
        else:
            self.log_result("Health Check", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_login(self):
        """Test admin login with provided credentials"""
        print("\n🔍 Testing admin login...")
        
        login_data = {
            "email": "admin@leadcentral.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.admin_token = data['token']
                user = data['user']
                success = user.get('role') == 'admin' and user.get('email') == 'admin@leadcentral.com'
                self.log_result("Admin Login", success, f"Admin user: {user.get('prenom', '')} {user.get('nom', '')}")
                return True
            else:
                self.log_result("Admin Login", False, "Missing token or user in response")
                return False
        else:
            self.log_result("Admin Login", False, f"Status: {response.status_code if response else 'No response'}, Response: {response.text if response else 'None'}")
            return False

    def test_prospecteur_registration(self):
        """Test prospecteur registration"""
        print("\n🔍 Testing prospecteur registration...")
        
        timestamp = datetime.now().strftime("%H%M%S")
        registration_data = {
            "nom": "Testeur",
            "prenom": "Jean", 
            "email": f"jean.testeur.{timestamp}@example.com",
            "telephone": "0123456789"
        }
        
        response = self.make_request('POST', '/auth/register', registration_data)
        if response and response.status_code == 200:
            data = response.json()
            success = "demande a été envoyée" in data.get("message", "")
            self.log_result("Prospecteur Registration", success, data.get("message", ""))
            return registration_data  # Return for potential validation testing
        else:
            self.log_result("Prospecteur Registration", False, f"Status: {response.status_code if response else 'No response'}")
            return None

    def test_admin_dashboard_endpoints(self):
        """Test admin dashboard related endpoints"""
        print("\n🔍 Testing admin dashboard endpoints...")
        
        if not self.admin_token:
            self.log_result("Admin Dashboard Tests", False, "No admin token available")
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}

        # Test admin stats
        response = self.make_request('GET', '/admin/stats', headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            expected_keys = ['total_prospecteurs', 'total_calls', 'total_rdv', 'conversion_rate']
            success = all(key in data for key in expected_keys)
            self.log_result("Admin Stats", success, f"Stats keys: {list(data.keys())}")
        else:
            self.log_result("Admin Stats", False, f"Status: {response.status_code if response else 'No response'}")

        # Test prospecteurs list
        response = self.make_request('GET', '/admin/prospecteurs', headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_result("Admin Prospecteurs List", success, f"Found {len(data)} prospecteurs")
        else:
            self.log_result("Admin Prospecteurs List", False, f"Status: {response.status_code if response else 'No response'}")

        # Test unassigned prospects
        response = self.make_request('GET', '/admin/prospects/unassigned', headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_result("Unassigned Prospects", success, f"Found {len(data)} unassigned prospects")
        else:
            self.log_result("Unassigned Prospects", False, f"Status: {response.status_code if response else 'No response'}")

        # Test all prospects
        response = self.make_request('GET', '/admin/prospects/all', headers=headers)
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_result("All Prospects", success, f"Found {len(data)} prospects")
        else:
            self.log_result("All Prospects", False, f"Status: {response.status_code if response else 'No response'}")

    def test_file_import(self):
        """Test CSV file import functionality"""
        print("\n🔍 Testing file import...")
        
        if not self.admin_token:
            self.log_result("File Import", False, "No admin token available")
            return

        # Create a test CSV content
        csv_content = """nom,secteur,telephone,email
Test Company 1,Technology,0123456789,contact1@test.com
Test Company 2,Finance,0123456790,contact2@test.com
Test Company 3,Healthcare,0123456791,contact3@test.com"""
        
        # Create file-like object
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        files = {'file': ('test_prospects.csv', csv_file, 'text/csv')}
        headers = {'Authorization': f'Bearer {self.admin_token}'}

        response = self.make_request('POST', '/admin/prospects/import', headers=headers, files=files)
        if response and response.status_code == 200:
            data = response.json()
            success = "importés avec succès" in data.get("message", "") and data.get("count", 0) > 0
            self.log_result("CSV Import", success, f"Imported {data.get('count', 0)} prospects")
        else:
            self.log_result("CSV Import", False, f"Status: {response.status_code if response else 'No response'}")

    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint with admin token"""
        print("\n🔍 Testing auth/me endpoint...")
        
        if not self.admin_token:
            self.log_result("Auth Me Endpoint", False, "No admin token available")
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        response = self.make_request('GET', '/auth/me', headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            expected_keys = ['id', 'nom', 'prenom', 'email', 'role']
            success = all(key in data for key in expected_keys) and data.get('role') == 'admin'
            self.log_result("Auth Me", success, f"User: {data.get('prenom', '')} {data.get('nom', '')} ({data.get('role', '')})")
        else:
            self.log_result("Auth Me", False, f"Status: {response.status_code if response else 'No response'}")

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        print("\n🔍 Testing invalid login...")
        
        invalid_login_data = {
            "email": "invalid@example.com", 
            "password": "wrongpassword"
        }
        
        response = self.make_request('POST', '/auth/login', invalid_login_data)
        if response and response.status_code == 401:
            success = True
            self.log_result("Invalid Login Rejection", success, "Correctly rejected invalid credentials")
        else:
            self.log_result("Invalid Login Rejection", False, f"Expected 401, got {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting LeadCentral API Tests...")
        print(f"Backend URL: {self.base_url}")
        
        # Basic API tests
        self.test_basic_api()
        
        # Authentication tests
        admin_login_success = self.test_admin_login()
        self.test_invalid_login()
        self.test_prospecteur_registration()
        
        # Protected endpoints (require admin login)
        if admin_login_success:
            self.test_auth_me_endpoint()
            self.test_admin_dashboard_endpoints()
            self.test_file_import()
        
        # Final results
        print(f"\n📊 Test Results:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = LeadCentralAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())