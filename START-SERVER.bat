@echo off
REM প্রত্যয় সার্ভার স্টার্ট স্ক্রিপ্ট
REM ================================

echo.
echo ╔════════════════════════════════════════╗
echo ║  প্রত্যয় সার্ভার - শুরু করা হচ্ছে    ║
echo ╚════════════════════════════════════════╝
echo.

REM চেক করুন Node.js ইনস্টল আছে কি
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js ইনস্টল করা নেই!
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js ফাউন্ড
echo.

REM চেক করুন .env ফাইল আছে কি
if not exist ".env" (
    echo ⚠️  .env ফাইল পাওয়া যায়নি!
    echo প্লিজ SETUP-GUIDE.md পড়ুন এবং .env সেটআপ করুন
    pause
    exit /b 1
)

echo ✅ .env ফাইল পাওয়া গেছে
echo.

REM চেক করুন package.json আছে কি
if not exist "package.json" (
    echo ⚠️  package.json পাওয়া যায়নি!
    echo package installation স্টার্ট করা হচ্ছে...
    call npm install
    if errorlevel 1 (
        echo ❌ npm install ব্যর্থ!
        pause
        exit /b 1
    )
)

echo ✅ Dependencies প্রস্তুত
echo.
echo 🚀 সার্ভার শুরু হচ্ছে...
echo.
echo সার্ভার চলবে: http://localhost:5000
echo সার্ভার থামাতে: Ctrl + C
echo.

npm start

if errorlevel 1 (
    echo.
    echo ❌ সার্ভার ব্যর্থ হয়েছে
    echo সমস্যা:
    echo - Port 5000 ইতিমধ্যে ব্যবহৃত হতে পারে
    echo - .env সেটিংস ভুল হতে পারে
    echo - Gmail App Password ভুল হতে পারে
    pause
    exit /b 1
)

pause
