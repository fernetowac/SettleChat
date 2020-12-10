import authService from '../components/api-authorization/AuthorizeService';
import { ThunkDispatch } from 'redux-thunk';
import * as HttpStatusActions from '../actions/HttpStatusActions';
import { isDevelopment } from '../helpers/development/DevDetect';
//import  Ajv  from 'ajv';
var ajv: any;

export enum HttpMethod {
    Get = 'GET',
    Post = 'POST',
    Put = 'PUT',
    Patch = 'PATCH',
    Delete = 'DELETE'
}

const validateSchemaAsync = async <TResponse>(responsePromise: Promise<TResponse>, responseSchema: object): Promise<TResponse> => {
    // dynamically import ajv (json schema validation https://github.com/ajv-validator/ajv/tree/v6) module if needed
    if (!ajv) {
        console.debug("start importingModule", 'ajv');
        var Ajv: any = await import('ajv');
        console.debug("completed importingModule", 'ajv');
        ajv = new Ajv.default({ allErrors: true });
    }

    return responsePromise.then(response => {
        const validate = ajv.compile(responseSchema);
        const valid = validate(response);
        if (!valid) {
            console.error(validate.errors, JSON.stringify(response), JSON.stringify(responseSchema));
        }
        return response;
    });
}

export const fetchExtended =
    async <TResult>(url: string,
        dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
        httpMethod: HttpMethod = HttpMethod.Get,
        requestBody: any,
        attachBearerToken: boolean = true,
        transformResponse?: ResponseTransformationType<TResult>,
        responseSchema?: object): Promise<TResult> => {

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
                    if (isDevelopment && responseSchema) {
                        responseStreamPromise = validateSchemaAsync(responseStreamPromise, responseSchema);
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
    responseSchema?: object
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Get, undefined, attachBearerToken, transformResponse, responseSchema);

export const fetchPost = async <TResult>(
    url: string,
    requestBody: any,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Post, requestBody, attachBearerToken);

export const fetchPut = async <TResult>(
    url: string,
    requestBody: any,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Put, requestBody, attachBearerToken);

export const fetchPatch = async <TResult>(
    url: string,
    requestBody: any,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Patch, requestBody, attachBearerToken);

export const fetchDelete = async <TResult>(
    url: string,
    requestBody: any,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Delete, requestBody, attachBearerToken);
