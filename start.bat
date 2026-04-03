@echo off
if not "%1"=="max" start /MAX "" "%~0" max & exit/b
bun run .
pause