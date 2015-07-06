@echo off
for /f "tokens=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20 delims=\u" %%a in ("%1") do (
  cmd /c crush.bat 1.png %a
  cmd /c crush.bat 2.png %b
  cmd /c crush.bat 3.png %c
  cmd /c crush.bat 4.png %d
  cmd /c crush.bat 5.png %e
  cmd /c crush.bat 6.png %f
  cmd /c crush.bat 7.png %g
  cmd /c crush.bat 8.png %h
  cmd /c crush.bat 9.png %i
  cmd /c crush.bat 10.png %j
  cmd /c crush.bat 11.png %k
  cmd /c crush.bat 12.png %l
  cmd /c crush.bat 13.png %m
  cmd /c crush.bat 14.png %n
  cmd /c crush.bat 15.png %o
  cmd /c crush.bat 16.png %p
  cmd /c crush.bat 17.png %q
  cmd /c crush.bat 18.png %r
  cmd /c crush.bat 19.png %s
  cmd /c crush.bat 20.png %t
)
del *.png