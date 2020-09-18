USE [master]
GO

/* For security reasons the login is created disabled and with a random password. */
/****** Object:  Login [SettleAdmin]    Script Date: 8/18/2020 6:25:02 PM ******/
CREATE LOGIN [SettleAdmin] WITH PASSWORD=N'mUtLw5i4YL/oo/S4JnzNPP0ImZ7K5fx5grTC+dXMjZA=', DEFAULT_DATABASE=[SettleChat], DEFAULT_LANGUAGE=[us_english], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF
GO

--ALTER LOGIN [SettleAdmin] ENABLE
--GO


