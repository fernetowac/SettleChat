# Database setup

## Run docker SQL Server
`$SettleChat\Installation\01_Database\01_RunDockerSqlServer.cmd`

>[Extra] Command for removal of docker SQL Server (in case needed to restart with clean DB)**
`.\Installation\01_Database\__01_RemoveDockerSqlServer.cmd`

## Initialize empty DB schema
`.\Installation\01_Database\02_CreateDBSchema.cmd`

## Generate schema creation script:
`.\Development\GenerateSchemaCreateScript.cmd`


# How to connect to DB:
>**Host**: *localhost,1433*\
**Login**: *SettleAdmin*\
**Password**: *mUtLw5i4YL/oo/S4JnzNPP0ImZ7K5fx5grTC+dXMjZA=*

# Logging setup
## Run docker SEQ server
Create empty folder for persisting Seq data: *C:\SettleChatSecrets\seq*

`$SettleChat\Installation\02_Logging\01_RunDockerSeq.cmd`

Go to http://127.0.0.1:5340 and enable authentication under *Settings -> USERS*

## Sentry
Update Sentry DSN in `$\SettleChat\ClientApp\src\index.tsx`

# Configuration

## Create Google ClientId and ClientSecret:
- Create `OAuth 2.0 Client IDs` (https://console.developers.google.com/apis/credentials)
- Enter following URIs under `Authorized redirect URIs` section:
  - *https​://localhost:44328/signin-google*
  - *https​://localhost:44328/authentication/login-callback*
  
## Create configuration files:
- `C:\SettleChatSecrets\appsettings.json` (**optional**, can contain common secret settings)
- `C:\SettleChatSecrets\appsettings.Development.json` (**optional**, can contain secret settings for development)
- `C:\SettleChatSecrets\appsettings.Production.json` (**optional**, can contain secret settings for production)

Content of `appsettings.Production.json`:
```json
{
  "IdentityServer": {    
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
>Note: Certificate configuration for IdentityServer is read by `AddSigningCredentials()` inside of `AddApiAuthorization()`

`C:\SettleChatSecrets\MyIdentityServerCert.pfx` (optional - needed for IdentityServer for production - google how to create certificate for .NET Core app, e.g. https://benjii.me/2017/06/creating-self-signed-certificate-identity-server-azure/)

# Publish
Publish using VisualStudio publish profile called `FolderProfile`

# Run for Production (when published using `FolderProfile` Visual Studio publish profile)
`.\SettleChat\bin\Release\netcoreapp3.1\publish\RunProduction.bat`


# Postman
Exported Postman configuration is here: `.\SettleChat local development.postman_collection.json`