#!/usr/bin/env node

/**
 * Comprehensive Usability and User Experience Test Runner
 * 
 * This script runs all usability tests and generates a detailed report
 * covering error handling, user flow navigation, and export functionality.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class UsabilityTestRunner {
  constructor() {
    this.testResults = {
      errorHandling: null,
      userFlow: null,
      exportFunctionality: null,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: null
      }
    };
    
    this.reportPath = path.join(__dirname, '..', '..', 'usability-test-report.json');
  }

  /**
   * Run error handling tests
   */
  runErrorHandlingTests() {
    console.log('🔍 Running User Error Handling Tests...');
    
    try {
      const result = execSync(
        'npm test -- --testPathPattern=UserErrorHandling.test.jsx --watchAll=false --coverage=false --verbose',
        { 
          cwd: path.join(__dirname, '..', '..'),
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );
      
      this.testResults.errorHandling = {
        status: 'PASSED',
        output: result,
        timestamp: new Date().toISOString(),
        testCategories: [
          'DataInput Error Handling',
          'Loading States and Progress Feedback',
          'Forecast Component Error Handling',
          'ResultsTable Error States',
          'User Guidance and Help Messages',
          'Error Recovery Guidance'
        ]
      };
      
      console.log('✅ Error Handling Tests: PASSED');
      
    } catch (error) {
      this.testResults.errorHandling = {
        status: 'FAILED',
        output: error.stdout || error.message,
        error: error.stderr || error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log('❌ Error Handling Tests: FAILED');
      console.log(error.message);
    }
  }

  /**
   * Run user flow and navigation tests
   */
  runUserFlowTests() {
    console.log('🧭 Running User Flow and Navigation Tests...');
    
    try {
      const result = execSync(
        'npm test -- --testPathPattern=UserFlowNavigation.test.jsx --watchAll=false --coverage=false --verbose',
        { 
          cwd: path.join(__dirname, '..', '..'),
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );
      
      this.testResults.userFlow = {
        status: 'PASSED',
        output: result,
        timestamp: new Date().toISOString(),
        testCategories: [
          'Intuitive Navigation Between Components',
          'Clear Instructions and Labels',
          'Keyboard Navigation Accessibility',
          'Screen Reader Accessibility',
          'Intuitive User Interface Flow',
          'Contextual Help and Guidance'
        ]
      };
      
      console.log('✅ User Flow Tests: PASSED');
      
    } catch (error) {
      this.testResults.userFlow = {
        status: 'FAILED',
        output: error.stdout || error.message,
        error: error.stderr || error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log('❌ User Flow Tests: FAILED');
      console.log(error.message);
    }
  }

  /**
   * Run export functionality tests
   */
  runExportTests() {
    console.log('📤 Running Export Functionality Tests...');
    
    try {
      const result = execSync(
        'npm test -- --testPathPattern=ExportFunctionality.test.jsx --watchAll=false --coverage=false --verbose',
        { 
          cwd: path.join(__dirname, '..', '..'),
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );
      
      this.testResults.exportFunctionality = {
        status: 'PASSED',
        output: result,
        timestamp: new Date().toISOString(),
        testCategories: [
          'CSV Export Functionality',
          'Export Data Validation',
          'Cross-Browser Compatibility',
          'Export Button States and Feedback',
          'Additional Export Features'
        ]
      };
      
      console.log('✅ Export Functionality Tests: PASSED');
      
    } catch (error) {
      this.testResults.exportFunctionality = {
        status: 'FAILED',
        output: error.stdout || error.message,
        error: error.stderr || error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log('❌ Export Functionality Tests: FAILED');
      console.log(error.message);
    }
  }

  /**
   * Run all usability tests with coverage
   */
  runAllUsabilityTests() {
    console.log('📊 Running All Usability Tests with Coverage...');
    
    try {
      const result = execSync(
        'npm test -- --testPathPattern="(UserErrorHandling|UserFlowNavigation|ExportFunctionality).test.jsx" --watchAll=false --coverage --coverageDirectory=coverage-usability',
        { 
          cwd: path.join(__dirname, '..', '..'),
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );
      
      // Parse test results for summary
      this.parseTestSummary(result);
      
      console.log('✅ All Usability Tests Completed');
      
    } catch (error) {
      console.log('⚠️  Some usability tests failed, but continuing with report generation...');
      this.parseTestSummary(error.stdout || error.message);
    }
  }

  /**
   * Parse test output to extract summary statistics
   */
  parseTestSummary(output) {
    const lines = output.split('\n');
    
    // Extract test counts
    const testSummaryLine = lines.find(line => line.includes('Tests:'));
    if (testSummaryLine) {
      const passedMatch = testSummaryLine.match(/(\d+) passed/);
      const failedMatch = testSummaryLine.match(/(\d+) failed/);
      const totalMatch = testSummaryLine.match(/(\d+) total/);
      
      this.testResults.summary.passedTests = passedMatch ? parseInt(passedMatch[1]) : 0;
      this.testResults.summary.failedTests = failedMatch ? parseInt(failedMatch[1]) : 0;
      this.testResults.summary.totalTests = totalMatch ? parseInt(totalMatch[1]) : 0;
    }
    
    // Extract coverage information
    const coverageLine = lines.find(line => line.includes('All files'));
    if (coverageLine) {
      const coverageMatch = coverageLine.match(/(\d+\.?\d*)%/);
      this.testResults.summary.coverage = coverageMatch ? parseFloat(coverageMatch[1]) : null;
    }
  }

  /**
   * Generate comprehensive usability test report
   */
  generateReport() {
    console.log('📋 Generating Usability Test Report...');
    
    const report = {
      title: 'Usability and User Experience Test Report',
      generatedAt: new Date().toISOString(),
      testResults: this.testResults,
      recommendations: this.generateRecommendations(),
      summary: this.generateSummary()
    };
    
    // Write JSON report
    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    this.generateHumanReadableReport(report);
    
    console.log(`📄 Report generated: ${this.reportPath}`);
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.testResults.errorHandling?.status === 'FAILED') {
      recommendations.push({
        category: 'Error Handling',
        priority: 'HIGH',
        description: 'Improve error messages and user feedback mechanisms',
        actions: [
          'Implement more descriptive error messages',
          'Add loading states for all async operations',
          'Provide clear recovery guidance for users'
        ]
      });
    }
    
    if (this.testResults.userFlow?.status === 'FAILED') {
      recommendations.push({
        category: 'User Experience',
        priority: 'HIGH',
        description: 'Enhance navigation and accessibility features',
        actions: [
          'Improve keyboard navigation support',
          'Add ARIA labels for screen readers',
          'Simplify user interface flow'
        ]
      });
    }
    
    if (this.testResults.exportFunctionality?.status === 'FAILED') {
      recommendations.push({
        category: 'Export Features',
        priority: 'MEDIUM',
        description: 'Fix export functionality and cross-browser compatibility',
        actions: [
          'Ensure CSV export works in all browsers',
          'Validate export data format',
          'Improve export user feedback'
        ]
      });
    }
    
    // Coverage-based recommendations
    if (this.testResults.summary.coverage && this.testResults.summary.coverage < 80) {
      recommendations.push({
        category: 'Test Coverage',
        priority: 'MEDIUM',
        description: 'Increase test coverage for better quality assurance',
        actions: [
          'Add more edge case tests',
          'Test error scenarios more thoroughly',
          'Include integration tests for user workflows'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * Generate test summary
   */
  generateSummary() {
    const { totalTests, passedTests, failedTests, coverage } = this.testResults.summary;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    
    return {
      overallStatus: failedTests === 0 ? 'PASSED' : 'FAILED',
      successRate: `${successRate}%`,
      testCoverage: coverage ? `${coverage}%` : 'N/A',
      totalTests,
      passedTests,
      failedTests,
      testCategories: {
        errorHandling: this.testResults.errorHandling?.status || 'NOT_RUN',
        userFlow: this.testResults.userFlow?.status || 'NOT_RUN',
        exportFunctionality: this.testResults.exportFunctionality?.status || 'NOT_RUN'
      }
    };
  }

  /**
   * Generate human-readable report
   */
  generateHumanReadableReport(report) {
    const summaryPath = path.join(__dirname, '..', '..', 'USABILITY_TEST_SUMMARY.md');
    
    let content = `# Usability and User Experience Test Report\n\n`;
    content += `**Generated:** ${new Date(report.generatedAt).toLocaleString()}\n\n`;
    
    // Summary
    content += `## Summary\n\n`;
    content += `- **Overall Status:** ${report.summary.overallStatus}\n`;
    content += `- **Success Rate:** ${report.summary.successRate}\n`;
    content += `- **Test Coverage:** ${report.summary.testCoverage}\n`;
    content += `- **Total Tests:** ${report.summary.totalTests}\n`;
    content += `- **Passed:** ${report.summary.passedTests}\n`;
    content += `- **Failed:** ${report.summary.failedTests}\n\n`;
    
    // Test Categories
    content += `## Test Categories\n\n`;
    content += `| Category | Status |\n`;
    content += `|----------|--------|\n`;
    content += `| Error Handling | ${report.summary.testCategories.errorHandling} |\n`;
    content += `| User Flow & Navigation | ${report.summary.testCategories.userFlow} |\n`;
    content += `| Export Functionality | ${report.summary.testCategories.exportFunctionality} |\n\n`;
    
    // Recommendations
    if (report.recommendations.length > 0) {
      content += `## Recommendations\n\n`;
      report.recommendations.forEach((rec, index) => {
        content += `### ${index + 1}. ${rec.category} (Priority: ${rec.priority})\n\n`;
        content += `${rec.description}\n\n`;
        content += `**Actions:**\n`;
        rec.actions.forEach(action => {
          content += `- ${action}\n`;
        });
        content += `\n`;
      });
    }
    
    // Detailed Results
    content += `## Detailed Test Results\n\n`;
    
    Object.entries(report.testResults).forEach(([category, result]) => {
      if (result && typeof result === 'object' && result.status) {
        content += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
        content += `- **Status:** ${result.status}\n`;
        content += `- **Timestamp:** ${new Date(result.timestamp).toLocaleString()}\n`;
        
        if (result.testCategories) {
          content += `- **Test Categories:**\n`;
          result.testCategories.forEach(cat => {
            content += `  - ${cat}\n`;
          });
        }
        
        if (result.error) {
          content += `- **Error:** ${result.error}\n`;
        }
        
        content += `\n`;
      }
    });
    
    fs.writeFileSync(summaryPath, content);
    console.log(`📄 Human-readable summary: ${summaryPath}`);
  }

  /**
   * Run complete usability test suite
   */
  async run() {
    console.log('🚀 Starting Comprehensive Usability Test Suite...\n');
    
    // Run individual test suites
    this.runErrorHandlingTests();
    this.runUserFlowTests();
    this.runExportTests();
    
    // Run all tests with coverage
    this.runAllUsabilityTests();
    
    // Generate comprehensive report
    this.generateReport();
    
    console.log('\n🎉 Usability Test Suite Completed!');
    console.log(`📊 Results: ${this.testResults.summary.passedTests}/${this.testResults.summary.totalTests} tests passed`);
    
    if (this.testResults.summary.failedTests > 0) {
      console.log('⚠️  Some tests failed. Please review the report for recommendations.');
      process.exit(1);
    } else {
      console.log('✅ All usability tests passed successfully!');
    }
  }
}

// Run the test suite if this script is executed directly
if (require.main === module) {
  const runner = new UsabilityTestRunner();
  runner.run().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = UsabilityTestRunner;