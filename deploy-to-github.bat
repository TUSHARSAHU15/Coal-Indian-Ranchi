@echo off
echo =======================================================
echo   Push CCL Digital Visitor Management to GitHub
echo =======================================================
echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/username/ccl-digital-visitor.git): "

if "%REPO_URL%"=="" (
    echo Error: Repository URL cannot be empty.
    pause
    exit /b 1
)

echo.
echo [1/3] Renaming branch to main...
git branch -M main

echo [2/3] Adding remote origin...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo [3/3] Pushing code to GitHub...
git push -u origin main

echo.
echo =======================================================
echo   Code pushed to GitHub successfully!
echo   Next Step: Go to Render.com and create Web Service
echo   with name: ccl-digital-visitor
echo =======================================================
pause
