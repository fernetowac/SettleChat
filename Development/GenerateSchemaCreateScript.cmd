pushd ..\SettleChat
REM Docs: https://docs.microsoft.com/en-us/ef/core/miscellaneous/cli/dotnet
dotnet ef migrations script --project ..\SettleChat.Migrations --startup-project . --output "..\Installation\01_Database\DB_Scripts\02_CreateSchema\01_CreateSchema.sql"
"..\Installation\01_Database\DB_Scripts\02_CreateSchema\01_CreateSchema.sql"
popd