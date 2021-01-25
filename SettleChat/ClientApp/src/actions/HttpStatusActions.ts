import { HTTP_FAIL_STATUS_RECEIVED } from '../types/httpStatusTypes'

export interface HttpFailStatusReceivedAction {
    type: typeof HTTP_FAIL_STATUS_RECEIVED;
    status: number;
    message: string | null;
}

export const actionCreators = {
    httpFailStatusReceivedAction(status: number, message: string | null = null): HttpFailStatusReceivedAction {
        return {
            type: 'HTTP_FAIL_STATUS_RECEIVED',
            status: status,
            message: message
        }
    }
};