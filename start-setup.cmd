@echo off
rem ===========================================================================
rem  Double-click to set up the Group Chat Archive.
rem  Starts the local server and opens the setup wizard in your browser.
rem  Needs Node.js installed (https://nodejs.org). Closing the browser closes
rem  this window automatically; the window only stays open if startup failed.
rem ===========================================================================
node "%~dp0scripts\server.js" --open
if errorlevel 1 pause
