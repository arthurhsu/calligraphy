@echo off
setlocal enableextensions enabledelayedexpansion
set /a k=0
for /l %%l in (231, 210, 2121) do (
  set /a k+=1
  convert %1 -crop 202x202+%%l+207 !k!.png
  set /a k+=1
  convert %1 -crop 202x202+%%l+1836 !k!.png
)