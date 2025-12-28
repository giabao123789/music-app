@echo off
title Start MongoDB Replica Set (rs0) - Music App

echo.
echo ==============================
echo  STOP MongoDB Windows Service
echo ==============================
net stop MongoDB

echo.
echo ==============================
echo  START MongoDB AS REPLICA SET
echo ==============================
"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" ^
  --dbpath "C:\ProgramData\MongoDB\data\db" ^
  --replSet "rs0" ^
  --bind_ip 127.0.0.1 ^
  --port 27017 ^
  --logpath "C:\ProgramData\MongoDB\log\mongod.log" ^
  --logappend

echo.
echo MongoDB ReplicaSet is running...
echo DO NOT CLOSE THIS WINDOW if you want the server to stay up!
pause
