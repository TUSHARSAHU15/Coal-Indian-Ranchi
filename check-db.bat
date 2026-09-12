@echo off
title CCL DVMS Database Inspector
cd /d %~dp0
node backend/src/utils/check_db.js
pause
