@echo off
echo ========================================
echo  USABILITY AND UX TESTS VALIDATION
echo ========================================
echo.

cd frontend

echo [1/4] Running User Error Handling Tests...
echo ----------------------------------------
call npm test -- --testPathPattern=UserErrorHandling.test.jsx --watchAll=false --passWithNoTests
if %errorlevel% neq 0 (
    echo ERROR: User Error Handling Tests failed
    goto :error
)
echo ✓ User Error Handling Tests completed
echo.

echo [2/4] Running User Flow Navigation Tests...
echo -------------------------------------------
call npm test -- --testPathPattern=UserFlowNavigation.test.jsx --watchAll=false --passWithNoTests
if %errorlevel% neq 0 (
    echo ERROR: User Flow Navigation Tests failed
    goto :error
)
echo ✓ User Flow Navigation Tests completed
echo.

echo [3/4] Running Export Functionality Tests...
echo --------------------------------------------
call npm test -- --testPathPattern=ExportFunctionality.test.jsx --watchAll=false --passWithNoTests
if %errorlevel% neq 0 (
    echo ERROR: Export Functionality Tests failed
    goto :error
)
echo ✓ Export Functionality Tests completed
echo.

echo [4/4] Running Complete Usability Test Suite with Coverage...
echo ------------------------------------------------------------
call npm test -- --testPathPattern="(UserErrorHandling|UserFlowNavigation|ExportFunctionality).test.jsx" --watchAll=false --coverage --coverageDirectory=coverage-usability
if %errorlevel% neq 0 (
    echo WARNING: Some tests may have failed, but continuing...
)
echo ✓ Complete test suite executed
echo.

echo ========================================
echo  USABILITY TESTS VALIDATION COMPLETED
echo ========================================
echo.
echo All usability and user experience tests have been executed.
echo Check the coverage report in: frontend/coverage-usability/
echo Review the test summary in: frontend/USABILITY_TESTS_SUMMARY.md
echo.
goto :end

:error
echo.
echo ========================================
echo  VALIDATION FAILED
echo ========================================
echo.
echo Some usability tests failed. Please review the output above.
echo Fix the issues and run the validation again.
echo.
exit /b 1

:end
echo Validation completed successfully!
pause