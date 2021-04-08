@echo off
echo This will create database schema. Press any key to continue..
pause >nul
pushd .\DB_Scripts\02_CreateSchema
for %%G in (*.sql) do (
	echo Executing:  %%G 
	sqlcmd -S 127.0.0.1,1433 -U sa -P "yourStrong(!)Password" -d SettleChat -i"%%G"
	)
popd
echo Completed
pause