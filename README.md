- Database setup

Run docker SQL Server
$SettleChat\Installation\01_Database\01_RunDockerSqlServer.cmd


(not needed) Remove docker SQL Server (in case needed to restart with clean DB)
$SettleChat\Installation\01_Database\__01_RemoveDockerSqlServer.cmd

Initialize empty DB schema
$SettleChat\Installation\01_Database\02_CreateDBSchema.cmd

Generate schema creation script:
$SettleChat\Development\GenerateSchemaCreateScript.cmd


- How to connect to DB:
Host: localhost,1433
Login: SettleAdmin
Password: mUtLw5i4YL/oo/S4JnzNPP0ImZ7K5fx5grTC+dXMjZA=


- Create Google ClientId and ClientSecret:
Create OAuth 2.0 Client IDs (https://console.developers.google.com/apis/credentials)
Enter following URIs under Authorized redirect URIs section:
https://localhost:44328/signin-google
https://localhost:44328/authentication/login-callback

Create configuration files:
C:\SettleChatSecrets\appsettings.json (optional, can contain common secret settings)
C:\SettleChatSecrets\appsettings.Development.json (optional, can contain secret settings for development)
C:\SettleChatSecrets\appsettings.Production.json (optional, can contain secret settings for production)
Content:
```
{
  "IdentityServer": {
    // Certificate configuration for IdentityServer read by AddSigningCredentials() inside of AddApiAuthorization()
    "Key": {
      "Type": "File",
      "FilePath": "C:\\SettleChatSecrets\\MyIdentityServerCert.pfx",
      "Password": "<password used by .pfx>"
    }
  },
  "GoogleOAuth:ClientId":"<client id from google developer console>",
  "GoogleOAuth:ClientSecret":"<client secret from google developer console>"
}
```
C:\SettleChatSecrets\MyIdentityServerCert.pfx (optional - needed for IdentityServer for production - google how to create certificate for .NET Core app, e.g. https://benjii.me/2017/06/creating-self-signed-certificate-identity-server-azure/)

- Publish
Publish using VisualStudio publish profile called "FolderProfile"

- Run for Production (when published using "FolderProfile" VS publish profile)
$SettleChat\SettleChat\bin\Release\netcoreapp3.1\publish\RunProduction.bat


