@echo off
REM PDF Generation Script for Windows
REM This script converts all markdown documentation to PDF format

echo.
echo ============================================
echo PDF Documentation Generator
echo ============================================
echo.

REM Create output directory
set OUTPUT_DIR=pdf-documentation
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Check if pandoc is installed
where pandoc >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pandoc is not installed
    echo.
    echo Please install pandoc first:
    echo   Download from: https://pandoc.org/installing.html
    echo   Or use: choco install pandoc
    echo.
    pause
    exit /b 1
)

echo [OK] pandoc found
echo.

REM List of documentation files
set FILES=MASTER_DOCUMENTATION APP_DOCUMENTATION LISA_USER_GUIDE DESIGN_DIAGRAMS FEATURE_NAVIGATION_GUIDE TESTING_GUIDE LISA_COMMANDS LISA_LEARNING_SYSTEM SEARCH_FEATURES FEATURE_ANNOUNCEMENTS PDF_EXPORT_GUIDE

set SUCCESS_COUNT=0
set FAIL_COUNT=0

REM Convert each file
for %%f in (%FILES%) do (
    set INPUT_FILE=%%f.md
    set OUTPUT_FILE=%OUTPUT_DIR%\%%f.pdf
    
    if exist "%%f.md" (
        echo [Converting] %%f.md...
        
        pandoc "%%f.md" -o "%OUTPUT_DIR%\%%f.pdf" --pdf-engine=xelatex -V geometry:margin=1in -V fontsize=11pt --toc --toc-depth=3 --highlight-style=tango --number-sections 2>nul
        
        if !ERRORLEVEL! EQU 0 (
            echo   [OK] %%f.pdf created
            set /a SUCCESS_COUNT+=1
        ) else (
            echo   [FAIL] Error creating %%f.pdf
            set /a FAIL_COUNT+=1
        )
    ) else (
        echo   [SKIP] %%f.md not found
        set /a FAIL_COUNT+=1
    )
    echo.
)

REM Create combined PDF
echo [Creating] Combined documentation PDF...
pandoc MASTER_DOCUMENTATION.md APP_DOCUMENTATION.md LISA_USER_GUIDE.md DESIGN_DIAGRAMS.md FEATURE_NAVIGATION_GUIDE.md TESTING_GUIDE.md LISA_COMMANDS.md LISA_LEARNING_SYSTEM.md SEARCH_FEATURES.md FEATURE_ANNOUNCEMENTS.md PDF_EXPORT_GUIDE.md -o "%OUTPUT_DIR%\COMPLETE_APP_DOCUMENTATION_ALL_IN_ONE.pdf" --pdf-engine=xelatex -V geometry:margin=1in -V fontsize=11pt --toc --toc-depth=2 --highlight-style=tango --number-sections 2>nul

if %ERRORLEVEL% EQU 0 (
    echo   [OK] Combined PDF created
    set /a SUCCESS_COUNT+=1
) else (
    echo   [FAIL] Error creating combined PDF
    set /a FAIL_COUNT+=1
)
echo.

REM Create ZIP archive
echo [Creating] ZIP archive...
set ARCHIVE_NAME=app-documentation-%date:~-4,4%%date:~-10,2%%date:~-7,2%.zip
powershell Compress-Archive -Path "%OUTPUT_DIR%\*.pdf" -DestinationPath "%ARCHIVE_NAME%" -Force 2>nul

if %ERRORLEVEL% EQU 0 (
    echo   [OK] Archive created: %ARCHIVE_NAME%
) else (
    echo   [FAIL] Error creating archive
)
echo.

REM Summary
echo ============================================
echo PDF Generation Complete!
echo ============================================
echo.
echo Summary:
echo   [OK] Successful: %SUCCESS_COUNT%
if %FAIL_COUNT% GTR 0 (
    echo   [FAIL] Failed: %FAIL_COUNT%
)
echo.
echo Output:
echo   Directory: .\%OUTPUT_DIR%\
echo   Archive:   .\%ARCHIVE_NAME%
echo.
echo Files created:
dir /b "%OUTPUT_DIR%\*.pdf"
echo.
echo Done! Check the %OUTPUT_DIR% directory for your PDFs.
echo.
pause
