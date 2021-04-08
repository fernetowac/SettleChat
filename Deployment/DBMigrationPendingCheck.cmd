REM TODO: use path with Release build of SettleChat.exe for production CI/CD
pushd ..\SettleChat\bin\Debug\netcoreapp3.1\

SettleChat.exe --ef-migrate-check

popd