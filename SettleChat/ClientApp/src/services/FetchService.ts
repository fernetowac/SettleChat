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
            .then(async response => {
                if (response.status === 200) {
                    let responseStreamPromise = response.json();
                    if (isDevelopment && responseSchemaKind) {
                        responseStreamPromise = (await getSchemaValidator()).validateSchemaAsync(responseStreamPromise, responseSchemaKind);
                    }
                    if (transformResponse) {
                        return responseStreamPromise.then(transformResponse);
                    }
                    return responseStreamPromise as Promise<TResult>;
                } else {
                    dispatch(HttpStatusActions.actionCreators.httpFailStatusReceivedAction(response.status, null));//TODO: handle HTTP_FAIL_STATUS_RECEIVED in a new reducer
                    return Promise.reject(`HttpStatus ${response.status}`);
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
