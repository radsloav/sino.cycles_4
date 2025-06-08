import requests
import json
import datetime
import unittest
import math
from datetime import datetime, timedelta

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://ccb9bba6-7176-47d3-8595-6ba30e39a00e.preview.emergentagent.com/api"

class SiNoBackendTests(unittest.TestCase):
    
    def test_cycles_api(self):
        """Test the /api/cycles endpoint to verify all 6 preset cycles are returned with correct data structure"""
        print("\n=== Testing Cycles API ===")
        response = requests.get(f"{BACKEND_URL}/cycles")
        self.assertEqual(response.status_code, 200, "Cycles API should return 200 status code")
        
        cycles = response.json()
        self.assertEqual(len(cycles), 6, "Should return exactly 6 preset cycles")
        
        # Verify all expected cycles are present
        cycle_names = [cycle["name"] for cycle in cycles]
        expected_cycles = ["Great Year", "Zodiac Age", "Solar Year", "Lunar Month", "Solar Day", "Hour"]
        for cycle_name in expected_cycles:
            self.assertIn(cycle_name, cycle_names, f"Cycle '{cycle_name}' should be present")
        
        # Verify cycle structure
        for cycle in cycles:
            self.assertIn("id", cycle, "Cycle should have an id")
            self.assertIn("name", cycle, "Cycle should have a name")
            self.assertIn("epoch", cycle, "Cycle should have an epoch")
            self.assertIn("period_days", cycle, "Cycle should have period_days")
            self.assertIn("quadrant_ratios", cycle, "Cycle should have quadrant_ratios")
            self.assertEqual(len(cycle["quadrant_ratios"]), 4, "quadrant_ratios should have 4 values")
            self.assertIn("unit_seconds", cycle, "Cycle should have unit_seconds")
            self.assertIn("base_stroke", cycle, "Cycle should have base_stroke")
            self.assertIn("color", cycle, "Cycle should have color")
            self.assertIn("description", cycle, "Cycle should have description")
        
        print("✅ Cycles API test passed")
        return cycles
    
    def test_individual_cycle_api(self):
        """Test the /api/cycles/{cycle_name} endpoint to verify cycle lookup functionality"""
        print("\n=== Testing Individual Cycle API ===")
        
        # Test each cycle individually
        cycle_names = ["great_year", "zodiac_age", "solar_year", "lunar_month", "solar_day", "hour"]
        
        for cycle_name in cycle_names:
            response = requests.get(f"{BACKEND_URL}/cycles/{cycle_name}")
            self.assertEqual(response.status_code, 200, f"Cycle API for {cycle_name} should return 200 status code")
            
            cycle = response.json()
            self.assertIn("name", cycle, f"Cycle {cycle_name} should have a name")
            self.assertIn("epoch", cycle, f"Cycle {cycle_name} should have an epoch")
            self.assertIn("period_days", cycle, f"Cycle {cycle_name} should have period_days")
            self.assertIn("quadrant_ratios", cycle, f"Cycle {cycle_name} should have quadrant_ratios")
            
            # Convert the cycle_name back to expected format for comparison
            expected_name = cycle_name.replace("_", " ").title()
            if expected_name == "Great Year":
                self.assertEqual(cycle["name"], "Great Year")
            elif expected_name == "Zodiac Age":
                self.assertEqual(cycle["name"], "Zodiac Age")
            elif expected_name == "Solar Year":
                self.assertEqual(cycle["name"], "Solar Year")
            elif expected_name == "Lunar Month":
                self.assertEqual(cycle["name"], "Lunar Month")
            elif expected_name == "Solar Day":
                self.assertEqual(cycle["name"], "Solar Day")
            elif expected_name == "Hour":
                self.assertEqual(cycle["name"], "Hour")
        
        # Test non-existent cycle
        response = requests.get(f"{BACKEND_URL}/cycles/nonexistent_cycle")
        self.assertEqual(response.status_code, 200, "API should handle non-existent cycles gracefully")
        self.assertIn("error", response.json(), "Should return error for non-existent cycle")
        
        print("✅ Individual Cycle API test passed")
    
    def test_datetime_to_pixel_conversion(self):
        """Test the /api/position endpoint to verify DateTime to pixel conversion accuracy"""
        print("\n=== Testing DateTime to Pixel Conversion API ===")
        
        # Get all cycles first
        cycles_response = requests.get(f"{BACKEND_URL}/cycles")
        cycles = cycles_response.json()
        
        # Test cases with different dates for each cycle
        test_cases = [
            # Test at epoch (should be at beginning of cycle)
            {"cycle": "great_year", "datetime": "2000-03-20T00:00:00Z", "expected_quadrant": 0, "expected_progress": 0.0},
            {"cycle": "zodiac_age", "datetime": "2000-03-20T00:00:00Z", "expected_quadrant": 0, "expected_progress": 0.0},
            {"cycle": "solar_year", "datetime": "2025-03-20T00:00:00Z", "expected_quadrant": 0, "expected_progress": 0.0},
            {"cycle": "lunar_month", "datetime": "2025-01-01T00:00:00Z", "expected_quadrant": 0, "expected_progress": 0.0},
            {"cycle": "solar_day", "datetime": "2025-01-01T06:00:00Z", "expected_quadrant": 0, "expected_progress": 0.0},
            {"cycle": "hour", "datetime": "2025-01-01T00:00:00Z", "expected_quadrant": 0, "expected_progress": 0.0},
            
            # Test at 25% of cycle (should be at end of first quadrant)
            {"cycle": "solar_year", "datetime": "2025-06-21T00:00:00Z", "expected_quadrant": 0, "expected_progress_approx": 1.0},
            {"cycle": "lunar_month", "datetime": "2025-01-08T00:00:00Z", "expected_quadrant": 0, "expected_progress_approx": 1.0},
            {"cycle": "solar_day", "datetime": "2025-01-01T12:00:00Z", "expected_quadrant": 1, "expected_progress_approx": 0.0},
            {"cycle": "hour", "datetime": "2025-01-01T00:15:00Z", "expected_quadrant": 0, "expected_progress_approx": 1.0},
            
            # Test at 50% of cycle (should be at middle of cycle)
            {"cycle": "solar_year", "datetime": "2025-09-22T00:00:00Z", "expected_quadrant": 1, "expected_progress_approx": 1.0},
            {"cycle": "lunar_month", "datetime": "2025-01-15T00:00:00Z", "expected_quadrant": 1, "expected_progress_approx": 1.0},
            {"cycle": "solar_day", "datetime": "2025-01-01T18:00:00Z", "expected_quadrant": 2, "expected_progress_approx": 0.0},
            {"cycle": "hour", "datetime": "2025-01-01T00:30:00Z", "expected_quadrant": 1, "expected_progress_approx": 1.0},
            
            # Test at 75% of cycle (should be at end of third quadrant)
            {"cycle": "solar_year", "datetime": "2025-12-21T00:00:00Z", "expected_quadrant": 2, "expected_progress_approx": 1.0},
            {"cycle": "lunar_month", "datetime": "2025-01-22T00:00:00Z", "expected_quadrant": 2, "expected_progress_approx": 1.0},
            {"cycle": "solar_day", "datetime": "2025-01-02T00:00:00Z", "expected_quadrant": 3, "expected_progress_approx": 0.0},
            {"cycle": "hour", "datetime": "2025-01-01T00:45:00Z", "expected_quadrant": 2, "expected_progress_approx": 1.0},
            
            # Test at full cycle (should wrap around to beginning)
            {"cycle": "solar_year", "datetime": "2026-03-20T00:00:00Z", "expected_quadrant": 0, "expected_progress_approx": 0.0},
            {"cycle": "lunar_month", "datetime": "2025-01-31T00:00:00Z", "expected_quadrant": 0, "expected_progress_approx": 0.0},
            {"cycle": "solar_day", "datetime": "2025-01-02T06:00:00Z", "expected_quadrant": 0, "expected_progress_approx": 0.0},
            {"cycle": "hour", "datetime": "2025-01-01T01:00:00Z", "expected_quadrant": 0, "expected_progress_approx": 0.0},
            
            # Test dates before epoch (should handle negative time correctly)
            {"cycle": "solar_year", "datetime": "2024-03-20T00:00:00Z", "expected_quadrant": 0, "expected_progress_approx": 0.0},
            {"cycle": "lunar_month", "datetime": "2024-12-01T00:00:00Z", "expected_quadrant": 0, "expected_progress_approx": 0.0},
        ]
        
        for test_case in test_cases:
            with self.subTest(f"Testing {test_case['cycle']} at {test_case['datetime']}"):
                payload = {
                    "datetime_iso": test_case["datetime"],
                    "cycle_id": test_case["cycle"]
                }
                
                response = requests.post(f"{BACKEND_URL}/position", json=payload)
                self.assertEqual(response.status_code, 200, f"Position API should return 200 status code for {test_case['cycle']}")
                
                result = response.json()
                self.assertIn("pixel_x", result, "Result should contain pixel_x")
                self.assertIn("phase_percent", result, "Result should contain phase_percent")
                self.assertIn("quadrant", result, "Result should contain quadrant")
                self.assertIn("quadrant_progress", result, "Result should contain quadrant_progress")
                
                # Check if quadrant matches expected
                if "expected_quadrant" in test_case:
                    self.assertEqual(result["quadrant"], test_case["expected_quadrant"], 
                                    f"Quadrant should be {test_case['expected_quadrant']} for {test_case['datetime']} in {test_case['cycle']}")
                
                # Check if progress matches expected (exact match)
                if "expected_progress" in test_case:
                    self.assertAlmostEqual(result["quadrant_progress"], test_case["expected_progress"], places=1,
                                          msg=f"Progress should be {test_case['expected_progress']} for {test_case['datetime']} in {test_case['cycle']}")
                
                # Check if progress matches expected (approximate match)
                if "expected_progress_approx" in test_case:
                    self.assertAlmostEqual(result["quadrant_progress"], test_case["expected_progress_approx"], places=1,
                                          msg=f"Progress should be approximately {test_case['expected_progress_approx']} for {test_case['datetime']} in {test_case['cycle']}")
                
                # Verify pixel_x is within the 1460px cycle width
                self.assertGreaterEqual(result["pixel_x"], 0, "pixel_x should be >= 0")
                self.assertLessEqual(result["pixel_x"], 1460, "pixel_x should be <= 1460")
                
                # Verify phase_percent is between 0 and 100
                self.assertGreaterEqual(result["phase_percent"], 0, "phase_percent should be >= 0")
                self.assertLessEqual(result["phase_percent"], 100, "phase_percent should be <= 100")
        
        print("✅ DateTime to Pixel Conversion API test passed")
    
    def test_current_time_api(self):
        """Test the /api/current_time endpoint to verify real-time positioning calculations for all cycles"""
        print("\n=== Testing Current Time API ===")
        
        response = requests.get(f"{BACKEND_URL}/current_time")
        self.assertEqual(response.status_code, 200, "Current Time API should return 200 status code")
        
        result = response.json()
        
        # Verify all cycles are present
        expected_cycles = ["Great Year", "Zodiac Age", "Solar Year", "Lunar Month", "Solar Day", "Hour"]
        for cycle_name in expected_cycles:
            self.assertIn(cycle_name, result, f"Current time data should include {cycle_name}")
            
            cycle_data = result[cycle_name]
            self.assertIn("pixel_x", cycle_data, f"{cycle_name} should have pixel_x")
            self.assertIn("phase_percent", cycle_data, f"{cycle_name} should have phase_percent")
            self.assertIn("quadrant", cycle_data, f"{cycle_name} should have quadrant")
            self.assertIn("quadrant_progress", cycle_data, f"{cycle_name} should have quadrant_progress")
            self.assertIn("datetime", cycle_data, f"{cycle_name} should have datetime")
            self.assertIn("cycle", cycle_data, f"{cycle_name} should have cycle data")
            
            # Verify pixel_x is within the 1460px cycle width
            self.assertGreaterEqual(cycle_data["pixel_x"], 0, f"{cycle_name} pixel_x should be >= 0")
            self.assertLessEqual(cycle_data["pixel_x"], 1460, f"{cycle_name} pixel_x should be <= 1460")
            
            # Verify phase_percent is between 0 and 100
            self.assertGreaterEqual(cycle_data["phase_percent"], 0, f"{cycle_name} phase_percent should be >= 0")
            self.assertLessEqual(cycle_data["phase_percent"], 100, f"{cycle_name} phase_percent should be <= 100")
            
            # Verify quadrant is between 0 and 3
            self.assertGreaterEqual(cycle_data["quadrant"], 0, f"{cycle_name} quadrant should be >= 0")
            self.assertLessEqual(cycle_data["quadrant"], 3, f"{cycle_name} quadrant should be <= 3")
            
            # Verify quadrant_progress is between 0 and 1
            self.assertGreaterEqual(cycle_data["quadrant_progress"], 0, f"{cycle_name} quadrant_progress should be >= 0")
            self.assertLessEqual(cycle_data["quadrant_progress"], 1, f"{cycle_name} quadrant_progress should be <= 1")
        
        print("✅ Current Time API test passed")
    
    def test_wave_data_api(self):
        """Test the /api/wave_data/{cycle_name} endpoint to verify wave point generation for rendering"""
        print("\n=== Testing Wave Data API ===")
        
        # Test for each cycle
        cycle_names = ["great_year", "zodiac_age", "solar_year", "lunar_month", "solar_day", "hour"]
        
        for cycle_name in cycle_names:
            with self.subTest(f"Testing wave data for {cycle_name}"):
                # Test with default parameters
                response = requests.get(f"{BACKEND_URL}/wave_data/{cycle_name}")
                self.assertEqual(response.status_code, 200, f"Wave Data API should return 200 status code for {cycle_name}")
                
                result = response.json()
                self.assertIn("cycle", result, "Result should contain cycle data")
                self.assertIn("points", result, "Result should contain points array")
                self.assertIn("cycle_px", result, "Result should contain cycle_px")
                
                # Verify cycle_px is 1460
                self.assertEqual(result["cycle_px"], 1460, "cycle_px should be 1460")
                
                # Verify points structure
                points = result["points"]
                self.assertEqual(len(points), 30, "Default should return 30 days of points")
                
                for point in points:
                    self.assertIn("date", point, "Point should have date")
                    self.assertIn("x", point, "Point should have x position")
                    self.assertIn("phase", point, "Point should have phase")
                    self.assertIn("quadrant", point, "Point should have quadrant")
                    
                    # Verify x is within the 1460px cycle width
                    self.assertGreaterEqual(point["x"], 0, "x should be >= 0")
                    self.assertLessEqual(point["x"], 1460, "x should be <= 1460")
                    
                    # Verify phase is between 0 and 100
                    self.assertGreaterEqual(point["phase"], 0, "phase should be >= 0")
                    self.assertLessEqual(point["phase"], 100, "phase should be <= 100")
                    
                    # Verify quadrant is between 0 and 3
                    self.assertGreaterEqual(point["quadrant"], 0, "quadrant should be >= 0")
                    self.assertLessEqual(point["quadrant"], 3, "quadrant should be <= 3")
                
                # Test with custom parameters
                custom_start = "2025-01-01T00:00:00Z"
                custom_days = 10
                response = requests.get(f"{BACKEND_URL}/wave_data/{cycle_name}?start_date={custom_start}&days={custom_days}")
                self.assertEqual(response.status_code, 200, f"Wave Data API should return 200 status code for {cycle_name} with custom params")
                
                result = response.json()
                points = result["points"]
                self.assertEqual(len(points), custom_days, f"Should return {custom_days} days of points")
        
        # Test non-existent cycle
        response = requests.get(f"{BACKEND_URL}/wave_data/nonexistent_cycle")
        self.assertEqual(response.status_code, 200, "API should handle non-existent cycles gracefully")
        self.assertIn("error", response.json(), "Should return error for non-existent cycle")
        
        print("✅ Wave Data API test passed")

if __name__ == "__main__":
    print("Starting SiNo Backend API Tests...")
    print(f"Testing against backend URL: {BACKEND_URL}")
    
    # Run the tests in a specific order
    test_suite = unittest.TestSuite()
    test_suite.addTest(SiNoBackendTests('test_cycles_api'))
    test_suite.addTest(SiNoBackendTests('test_individual_cycle_api'))
    test_suite.addTest(SiNoBackendTests('test_datetime_to_pixel_conversion'))
    test_suite.addTest(SiNoBackendTests('test_current_time_api'))
    test_suite.addTest(SiNoBackendTests('test_wave_data_api'))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Total tests: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped)}")
    
    if result.wasSuccessful():
        print("\n✅ All tests passed successfully!")
    else:
        print("\n❌ Some tests failed. See details above.")
