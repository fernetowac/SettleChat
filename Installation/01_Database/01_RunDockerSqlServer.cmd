docker run -d ^
--name sqlserver ^
-e "ACCEPT_EULA=Y" ^
-e "SA_PASSWORD=yourStrong(!)Password" ^
-p 1433:1433 -v C:/SettleChat/SqlVolume/data:/var/opt/mssql/data ^
-v C:/SettleChat/SqlVolume/log:/var/opt/mssql/log ^
-v C:/SettleChat/SqlVolume/secrets:/var/opt/mssql/secrets ^
-d mcr.microsoft.com/mssql/server:2017-latest
