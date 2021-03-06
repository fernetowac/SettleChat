import { ProblemDetails } from '../types/commonTypes'
import { isDevelopment } from '../helpers/development/DevDetect'

export const parseErrors = (response: ProblemDetails): string[] => {
    const problemDetails = response as ProblemDetails;
    const genericErrorMessage = "Ooops. Something went wrong."

    if (problemDetails.status === 500) {
        if (isDevelopment && problemDetails.title) {
            return [problemDetails.title]
        }
        else {
            return [genericErrorMessage]
        }
    }

    if (problemDetails.errors) {
        const errors: string[] = [];
        const errorKeys = Object.keys(problemDetails.errors);
        for (let i = 0; i < errorKeys.length; i++) {
            const errorValue = problemDetails.errors[errorKeys[i]];
            if (Array.isArray(errorValue)) {
                for (let j = 0; j < errorValue.length; j++) {
                    errors.push(errorValue[j])
                }
            }
            else {
                errors.push(errorValue)
            }
        }
        if (errors.length > 0) {
            return errors;
        }
    }

    if (problemDetails.detail) {
        return [problemDetails.detail]
    }
    if (problemDetails.title) {
        return [problemDetails.title]
    }
    return [genericErrorMessage]
}