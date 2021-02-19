import authService from '../components/api-authorization/AuthorizeService';
import { isDevelopment } from '../helpers/development/DevDetect';
import AwaitLock from 'await-lock';
import SchemaKind from '../schemas/SchemaKind'
import { Serializable } from '../types/commonTypes'

enum HttpMethod {
    Get = 'GET',
    Post = 'POST',
    Put = 'PUT',
    Patch = 'PATCH',
    Delete = 'DELETE'
}

interface SchemaValidator {
    validateSchemaAsync: <TResponse>(responsePromise: Promise<TResponse>, responseSchemaKind: SchemaKind) => Promise<TResponse>;
}

const schemaValidatorImporterLock = new AwaitLock();
let _schemaValidator: SchemaValidator | undefined = undefined;
const getSchemaValidator = async (): Promise<SchemaValidator> => {
    await schemaValidatorImporterLock.acquireAsync();
    try {
        if (_schemaValidator) {
            return Promise.resolve(_schemaValidator);
        }
        _schemaValidator = await import('../schemas/schemaValidator');
        return _schemaValidator;
    }
    finally {
        schemaValidatorImporterLock.release();
    }
};


export interface Errors {
    [key: string]: string | string[];
}


/**
 * @example
 * {
 *    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
 *    "title": "One or more validation errors occurred.",
 *    "status": 400,
 *    "traceId": "|2d658605-44ee0c9ba5d257aa.",
 *    "detail": "aa",
 *    "errors": {
 *        "aa": "aaa",
 *        "": [
 *            "The Nickname field is required.",
 *            "The field Nickname must be at least 3 characters long."
 *        ],
 *        "Nickname": [
 *            "The Nickname field is required.",
 *            "The field Nickname must be at least 3 characters long."
 *        ]
 *    }
 *}
 * */
export interface ProblemDetails {
    type: string
    title: string
    status: number
    traceId: string
    detail?: string
    errors?: Errors
}

const fetchExtended =
    async <TResponse extends Serializable>(url: string,
        httpMethod: HttpMethod = HttpMethod.Get,
        requestBody: any,
        attachBearerToken: boolean = true,
        responseSchemaKind?: SchemaKind): Promise<TResponse> => {

        let bearerTokenHeader: { Authorization: string } | undefined = undefined;
        if (attachBearerToken) {
            bearerTokenHeader = await authService.getAccessToken().then(token => {
                return { 'Authorization': `Bearer ${token}` }
            });
        }
        if (httpMethod === HttpMethod.Get && requestBody) {
            throw Error('Request body is not allowed for HTTP_GET');
        }
        return await fetch(url,
            {
                method: httpMethod.toString(),
                cache: "no-cache",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    ...bearerTokenHeader
                },
                body: JSON.stringify(requestBody)
            })
            .then(async responseStream => {
                let responsePromise = responseStream.json();
                if (responseStream.status === 200) {
                    if (isDevelopment && responseSchemaKind) {
                        responsePromise = (await getSchemaValidator()).validateSchemaAsync(responsePromise, responseSchemaKind);
                    }
                    return responsePromise as Promise<TResponse>;
                } else {
                    return responsePromise.then(response => {
                        return Promise.reject(response)
                    });
                }
            });
    };

export const fetchGet = async <TResponse extends Serializable>(
    url: string,
    attachBearerToken: boolean = true,
    responseSchemaKind?: SchemaKind
): Promise<TResponse> => fetchExtended(url, HttpMethod.Get, undefined, attachBearerToken, responseSchemaKind);

export const fetchPost = async <TResponse extends Serializable>(
    url: string,
    requestBody: Serializable,
    attachBearerToken: boolean = true,
    responseSchemaKind?: SchemaKind
): Promise<TResponse> => fetchExtended(url, HttpMethod.Post, requestBody, attachBearerToken, responseSchemaKind);

export const fetchPut = async <TResponse extends Serializable>(
    url: string,
    requestBody: Serializable,
    attachBearerToken: boolean = true,
    responseSchemaKind?: SchemaKind
): Promise<TResponse> => fetchExtended(url, HttpMethod.Put, requestBody, attachBearerToken, responseSchemaKind);

export const fetchPatch = async <TResponse extends Serializable>(
    url: string,
    requestBody: Serializable,
    attachBearerToken: boolean = true,
    responseSchemaKind?: SchemaKind
): Promise<TResponse> => fetchExtended(url, HttpMethod.Patch, requestBody, attachBearerToken, responseSchemaKind);

export const fetchDelete = async <TResponse extends Serializable>(
    url: string,
    requestBody: Serializable,
    attachBearerToken: boolean = true,
    responseSchemaKind?: SchemaKind
): Promise<TResponse> => fetchExtended(url, HttpMethod.Delete, requestBody, attachBearerToken, responseSchemaKind);