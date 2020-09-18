@echo off
echo This will create database schema. Press any key to continue..
pause >nul
pushd .\DB_Scripts\01_PrepareDatabase
for %%G in (*.sql) do (
	echo Executing:  %%G 
	# docker with WSL2 breaks when there is localhost, but 127.0.0.1 works
	sqlcmd -S 127.0.0.1,1433 -U sa -P "yourStrong(!)Password" -i"%%G"
	)
popd
pushd .\DB_Scripts\02_CreateSchema
for %%G in (*.sql) do (
	echo Executing:  %%G 
	sqlcmd -S 127.0.0.1,1433 -U sa -P "yourStrong(!)Password" -d SettleChat -i"%%G"
	)
popd
echo Completed
pause