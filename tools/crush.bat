set file_=%2
set dir_=%file_:~0,1%

pngcrush.exe -text b "Copyright" "Copyright 2015 Arthur Hsu CC-BY-NC-SA" %1 \src\calligraphy\assets\%dir_%\%2.png
