export interface Identifiable {
    id: string | undefined;//TODO: we should get rid of undefined
}

export interface ValidationError {
    key: string | null;
    errorMessage: string;
}