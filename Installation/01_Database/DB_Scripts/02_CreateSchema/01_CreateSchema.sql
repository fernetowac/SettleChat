IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;

GO

CREATE TABLE [Conversations] (
    [Id] uniqueidentifier NOT NULL,
    [Name] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Conversations] PRIMARY KEY ([Id])
);

GO

CREATE TABLE [Users] (
    [Id] uniqueidentifier NOT NULL,
    [Name] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);

GO

CREATE TABLE [Messages] (
    [Id] uniqueidentifier NOT NULL,
    [Text] nvarchar(max) NOT NULL,
    [Created] datetime2 NOT NULL,
    [ConversationId] uniqueidentifier NOT NULL,
    [AuthorId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_Messages] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Messages_Users_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [Users] ([Id]),
    CONSTRAINT [FK_Messages_Conversations_ConversationId] FOREIGN KEY ([ConversationId]) REFERENCES [Conversations] ([Id])
);

GO

CREATE TABLE [ConversationUsers] (
    [Id] uniqueidentifier NOT NULL,
    [ConversationId] uniqueidentifier NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    [LastReadMessageId] uniqueidentifier NULL,
    CONSTRAINT [PK_ConversationUsers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ConversationUsers_Conversations_ConversationId] FOREIGN KEY ([ConversationId]) REFERENCES [Conversations] ([Id]),
    CONSTRAINT [FK_ConversationUsers_Messages_LastReadMessageId] FOREIGN KEY ([LastReadMessageId]) REFERENCES [Messages] ([Id]),
    CONSTRAINT [FK_ConversationUsers_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

GO

CREATE INDEX [IX_ConversationUsers_ConversationId] ON [ConversationUsers] ([ConversationId]);

GO

CREATE INDEX [IX_ConversationUsers_LastReadMessageId] ON [ConversationUsers] ([LastReadMessageId]);

GO

CREATE INDEX [IX_ConversationUsers_UserId] ON [ConversationUsers] ([UserId]);

GO

CREATE INDEX [IX_Messages_AuthorId] ON [Messages] ([AuthorId]);

GO

CREATE INDEX [IX_Messages_ConversationId] ON [Messages] ([ConversationId]);

GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20200818155208_InitialCreate', N'3.1.7');

GO

DECLARE @var0 sysname;
SELECT @var0 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Conversations]') AND [c].[name] = N'Name');
IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [Conversations] DROP CONSTRAINT [' + @var0 + '];');
ALTER TABLE [Conversations] DROP COLUMN [Name];

GO

ALTER TABLE [Users] ADD [Email] nvarchar(max) NOT NULL DEFAULT N'';

GO

ALTER TABLE [Conversations] ADD [Title] nvarchar(max) NOT NULL DEFAULT N'';

GO

CREATE TABLE [UserSecrets] (
    [UserId] uniqueidentifier NOT NULL,
    [Secret] nvarchar(max) NOT NULL,
    CONSTRAINT [FK_UserSecrets_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

GO

CREATE UNIQUE INDEX [IX_UserSecrets_UserId] ON [UserSecrets] ([UserId]);

GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20200820211441_Initial', N'3.1.7');

GO

ALTER TABLE [UserSecrets] ADD [Id] uniqueidentifier NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20200821191557_AddedPKForUserSecret', N'3.1.7');

GO

ALTER TABLE [UserSecrets] ADD CONSTRAINT [PK_UserSecrets] PRIMARY KEY ([Id]);

GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20200821192335_AddedPKToUserSecret', N'3.1.7');

GO

ALTER TABLE [ConversationUsers] DROP CONSTRAINT [FK_ConversationUsers_Users_UserId];

GO

ALTER TABLE [Messages] DROP CONSTRAINT [FK_Messages_Users_AuthorId];

GO

ALTER TABLE [UserSecrets] DROP CONSTRAINT [FK_UserSecrets_Users_UserId];

GO

DROP TABLE [Users];

GO

CREATE TABLE [AspNetRoles] (
    [Id] uniqueidentifier NOT NULL,
    [Name] nvarchar(256) NULL,
    [NormalizedName] nvarchar(256) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
);

GO

CREATE TABLE [AspNetUsers] (
    [Id] uniqueidentifier NOT NULL,
    [UserName] nvarchar(256) NULL,
    [NormalizedUserName] nvarchar(256) NULL,
    [Email] nvarchar(256) NULL,
    [NormalizedEmail] nvarchar(256) NULL,
    [EmailConfirmed] bit NOT NULL,
    [PasswordHash] nvarchar(max) NULL,
    [SecurityStamp] nvarchar(max) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    [PhoneNumber] nvarchar(max) NULL,
    [PhoneNumberConfirmed] bit NOT NULL,
    [TwoFactorEnabled] bit NOT NULL,
    [LockoutEnd] datetimeoffset NULL,
    [LockoutEnabled] bit NOT NULL,
    [AccessFailedCount] int NOT NULL,
    CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
);

GO

CREATE TABLE [DeviceCodes] (
    [UserCode] nvarchar(200) NOT NULL,
    [DeviceCode] nvarchar(200) NOT NULL,
    [SubjectId] nvarchar(200) NULL,
    [ClientId] nvarchar(200) NOT NULL,
    [CreationTime] datetime2 NOT NULL,
    [Expiration] datetime2 NOT NULL,
    [Data] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_DeviceCodes] PRIMARY KEY ([UserCode])
);

GO

CREATE TABLE [PersistedGrants] (
    [Key] nvarchar(200) NOT NULL,
    [Type] nvarchar(50) NOT NULL,
    [SubjectId] nvarchar(200) NULL,
    [ClientId] nvarchar(200) NOT NULL,
    [CreationTime] datetime2 NOT NULL,
    [Expiration] datetime2 NULL,
    [Data] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_PersistedGrants] PRIMARY KEY ([Key])
);

GO

CREATE TABLE [AspNetRoleClaims] (
    [Id] int NOT NULL IDENTITY,
    [RoleId] uniqueidentifier NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
);

GO

CREATE TABLE [AspNetUserClaims] (
    [Id] int NOT NULL IDENTITY,
    [UserId] uniqueidentifier NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);

GO

CREATE TABLE [AspNetUserLogins] (
    [LoginProvider] nvarchar(450) NOT NULL,
    [ProviderKey] nvarchar(450) NOT NULL,
    [ProviderDisplayName] nvarchar(max) NULL,
    [UserId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
    CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);

GO

CREATE TABLE [AspNetUserRoles] (
    [UserId] uniqueidentifier NOT NULL,
    [RoleId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
    CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);

GO

CREATE TABLE [AspNetUserTokens] (
    [UserId] uniqueidentifier NOT NULL,
    [LoginProvider] nvarchar(450) NOT NULL,
    [Name] nvarchar(450) NOT NULL,
    [Value] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
    CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);

GO

CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);

GO

CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;

GO

CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);

GO

CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);

GO

CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);

GO

CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);

GO

CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;

GO

CREATE UNIQUE INDEX [IX_DeviceCodes_DeviceCode] ON [DeviceCodes] ([DeviceCode]);

GO

CREATE INDEX [IX_DeviceCodes_Expiration] ON [DeviceCodes] ([Expiration]);

GO

CREATE INDEX [IX_PersistedGrants_Expiration] ON [PersistedGrants] ([Expiration]);

GO

CREATE INDEX [IX_PersistedGrants_SubjectId_ClientId_Type] ON [PersistedGrants] ([SubjectId], [ClientId], [Type]);

GO

ALTER TABLE [ConversationUsers] ADD CONSTRAINT [FK_ConversationUsers_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]);

GO

ALTER TABLE [Messages] ADD CONSTRAINT [FK_Messages_AspNetUsers_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [AspNetUsers] ([Id]);

GO

ALTER TABLE [UserSecrets] ADD CONSTRAINT [FK_UserSecrets_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]);

GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20200829221031_IdentityServer', N'3.1.7');

GO

ALTER TABLE [AspNetUsers] ADD [LastActivityTimestamp] datetime2 NOT NULL DEFAULT '0001-01-01T00:00:00.0000000';

GO

ALTER TABLE [AspNetUsers] ADD [Status] int NOT NULL DEFAULT 0;

GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20200906160647_Added status and lastActiveTimestamp to user', N'3.1.7');

GO

