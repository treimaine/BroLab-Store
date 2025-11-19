/**
 * Test Mock Alert Page
 *
 * Test page to demonstrate the MockDataAlert component
 * and verify that it's properly visible above the navbar.
 */

import { MockDataAlert } from "@/components/alerts/MockDataAlert";
import { FixedAlert } from "@/components/layout/FixedAlert";
import { MainContent } from "@/components/layout/MainContent";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";

const TestMockAlertPage: React.FC = () => {
  const [showAlert, setShowAlert] = useState(true);

  // Mock data indicators for testing
  const mockIndicators = [
    {
      field: "user.email",
      type: "generic_value" as const,
      value: "test@example.com",
      confidence: 0.9,
      reason: "Email matches common test email pattern",
    },
    {
      field: "user.name",
      type: "placeholder_text" as const,
      value: "John Doe",
      confidence: 0.8,
      reason: "Name appears to be placeholder text",
    },
    {
      field: "stats.totalFavorites",
      type: "generic_value" as const,
      value: 100,
      confidence: 0.6,
      reason: "Value appears to be a round number that might indicate mock data",
    },
    {
      field: "orders[0].title",
      type: "lorem_ipsum" as const,
      value: "Lorem ipsum dolor sit amet",
      confidence: 0.95,
      reason: "Text contains Lorem ipsum placeholder content",
    },
    {
      field: "activity[0].description",
      type: "test_data" as const,
      value: "Test activity description",
      confidence: 0.7,
      reason: "Description contains test data patterns",
    },
  ];

  return (
    <MainContent withNavbarPadding={true} paddingTop="md">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Mock Data Alert Test Page</h1>
            <p className="text-gray-400 mb-6">
              This page demonstrates the MockDataAlert component and tests its visibility above the
              fixed navbar.
            </p>
          </div>

          {/* Alert Controls */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Alert Controls</h2>
            <div className="flex gap-4">
              <Button
                onClick={() => setShowAlert(true)}
                disabled={showAlert}
                className="bg-red-600 hover:bg-red-700"
              >
                Show Mock Data Alert
              </Button>
              <Button onClick={() => setShowAlert(false)} disabled={!showAlert} variant="outline">
                Hide Alert
              </Button>
            </div>
          </div>

          {/* Mock Data Alert */}
          <FixedAlert isVisible={showAlert} position="below" animation="slide">
            <MockDataAlert
              mockIndicators={mockIndicators}
              onDismiss={() => setShowAlert(false)}
              showDetails={true}
            />
          </FixedAlert>

          {/* Content Sections */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Test Content Section 1</h2>
              <p className="text-gray-300">
                This content should be properly spaced from the navbar and not hidden by it. The
                mock data alert should appear above this content and be fully visible.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Test Content Section 2</h2>
              <p className="text-gray-300">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Test Content Section 3</h2>
              <p className="text-gray-300">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa
                qui officia deserunt mollit anim id est laborum.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Alert Information</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Expected Behavior:</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-1">
                    <li>The mock data alert should appear at the top of the page</li>
                    <li>It should be positioned above the fixed navbar (z-index 60 vs 50)</li>
                    <li>It should be fully visible and not cut off</li>
                    <li>
                      The content should have proper padding to avoid being hidden by the navbar
                    </li>
                    <li>The alert should be dismissible and show detailed information</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Mock Indicators Detected:</h3>
                  <div className="bg-gray-700 rounded p-4">
                    <pre className="text-sm text-gray-300 overflow-x-auto">
                      {JSON.stringify(mockIndicators, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainContent>
  );
};

export default TestMockAlertPage;
