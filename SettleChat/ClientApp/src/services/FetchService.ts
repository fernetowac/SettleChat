import authService from '../components/api-authorization/AuthorizeService';
import { ThunkDispatch } from 'redux-thunk';
import * as HttpStatusActions from '../actions/HttpStatusActions';
import { isDevelopment } from '../helpers/development/DevDetect';
import AwaitLock from 'await-lock';
import SchemaKind from '../schemas/SchemaKind'

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


export interface ProblemDetails {
    type: string
    title: string
    status: number
    traceId: string
    detail?: string
    errors?: Errors
}

const aaaa: ProblemDetails = {
    "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
    "title": "One or more validation errors occurred.",
    "status": 400,
    "traceId": "|2d658605-44ee0c9ba5d257aa.",
    "detail": "aa",
    "errors": {
        "aa": "aaa",
        "": [
            "The Nickname field is required.",
            "The field Nickname must be at least 3 characters long."
        ],
        "Nickname": [
            "The Nickname field is required.",
            "The field Nickname must be at least 3 characters long."
        ]
    }
}

const fetchExtended =
    async <TResult>(url: string,
        dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
        httpMethod: HttpMethod = HttpMethod.Get,
        requestBody: any,
        attachBearerToken: boolean = true,
        transformResponse?: ResponseTransformationType<TResult>,
        responseSchemaKind?: SchemaKind): Promise<TResult> => {

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
                    if (transformResponse) {
                        return responsePromise.then(transformResponse);
                    }
                    return responsePromise as Promise<TResult>;
                } else {
                    return responsePromise.then(response => {
                        dispatch(HttpStatusActions.actionCreators.httpFailStatusReceivedAction(responseStream.status, null));//TODO: handle HTTP_FAIL_STATUS_RECEIVED in a new reducer
                        return Promise.reject(response)
                    });
                }
            });
    };
export type ResponseTransformationType<TResult> = (response: any) => TResult;

export const fetchGet = async <TResult>(
    url: string,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true,
    transformResponse?: ResponseTransformationType<TResult>,
    responseSchemaKind?: SchemaKind
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Get, undefined, attachBearerToken, transformResponse, responseSchemaKind);

export const fetchPost = async <TResult>(
    url: string,
    requestBody: any,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true,
    transformResponse?: ResponseTransformationType<TResult>,
    responseSchemaKind?: SchemaKind
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Post, requestBody, attachBearerToken, transformResponse, responseSchemaKind);

export const fetchPut = async <TResult>(
    url: string,
    requestBody: any,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true,
    transformResponse?: ResponseTransformationType<TResult>,
    responseSchemaKind?: SchemaKind
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Put, requestBody, attachBearerToken, transformResponse, responseSchemaKind);

export const fetchPatch = async <TResult>(
    url: string,
    requestBody: any,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true,
    transformResponse?: ResponseTransformationType<TResult>,
    responseSchemaKind?: SchemaKind
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Patch, requestBody, attachBearerToken, transformResponse, responseSchemaKind);

export const fetchDelete = async <TResult>(
    url: string,
    requestBody: any,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true,
    transformResponse?: ResponseTransformationType<TResult>,
    responseSchemaKind?: SchemaKind
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Delete, requestBody, attachBearerToken, transformResponse, responseSchemaKind);
