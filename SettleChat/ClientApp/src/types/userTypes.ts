export enum UserStatus {
    Offline = 1,
    Online = 2,
    Inactive = 3
}

export type User = {
    id: string,
    userName: string,
    status: UserStatus,
    lastActivityTimestamp: string
}