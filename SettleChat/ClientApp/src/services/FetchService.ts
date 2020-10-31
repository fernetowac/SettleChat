import authService from '../components/api-authorization/AuthorizeService';
import { ThunkDispatch } from 'redux-thunk';
import * as HttpStatusActions from '../actions/HttpStatusActions';

export enum HttpMethod {
    Get = 'GET',
    Post = 'POST',
    Put = 'PUT',
    Delete = 'DELETE'
}

export const fetchExtended =
    async <TResult>(url: string,
        dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
        httpMethod: HttpMethod = HttpMethod.Get,
        requestBody: any,
        attachBearerToken: boolean = true): Promise<TResult> => {

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
            .then(response => {
                if (response.status === 200) {
                    return response.json() as Promise<TResult>;
                } else {
                    dispatch(HttpStatusActions.actionCreators.httpFailStatusReceivedAction(response.status, null));//TODO: handle HTTP_FAIL_STATUS_RECEIVED in a new reducer
                    return Promise.reject(`HttpStatus ${response.status}`);
                }
            });
    };

export const fetchGet = async <TResult>(
    url: string,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Get, undefined, attachBearerToken);

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

export const fetchDelete = async <TResult>(
    url: string,
    requestBody: any,
    dispatch: ThunkDispatch<any, undefined, HttpStatusActions.HttpFailStatusReceivedAction>,
    attachBearerToken: boolean = true
): Promise<TResult> => fetchExtended(url, dispatch, HttpMethod.Delete, requestBody, attachBearerToken);
