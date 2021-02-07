REM More info: https://docs.datalust.co/docs/getting-started-with-docker

docker run ^
  --name seq ^
  -d ^
  --restart unless-stopped ^
  -e ACCEPT_EULA=Y ^
  -v C:/SettleChatSecrets/seq:/data ^
  -p 5340:80 ^
  -p 5341:5341 ^
  datalust/seq