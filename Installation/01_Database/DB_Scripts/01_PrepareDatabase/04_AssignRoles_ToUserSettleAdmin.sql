USE [SettleChat]
GO

ALTER ROLE db_owner ADD MEMBER [SettleAdmin];  
ALTER ROLE db_datareader ADD MEMBER [SettleAdmin]; 
ALTER ROLE db_datawriter ADD MEMBER [SettleAdmin]; 
GO  