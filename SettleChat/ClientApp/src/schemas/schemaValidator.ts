import commonDefinitionsSchema from '../schemas/common-definitions-schema.json'
import invitationGetResponseSchema from '../schemas/invitation-get-response-schema.json'
import invitationPostResponseSchema from '../schemas/invitation-post-response-schema.json'
import invitationsGetResponseSchema from '../schemas/invitations-get-response-schema.json'
import messagesGetResponseSchema from '../schemas/messages-get-response-schema.json'
import Ajv from 'ajv';
import SchemaKind from './SchemaKind'

interface SchemaWithDependencies {
    content: object;
    dependencies: object[];
}

/**
 * Mapping of schemas with its dependencies to enum.
 * All schemas from enum must be mapped here.
 * */
const schemaByType = new Map<SchemaKind, SchemaWithDependencies>();
schemaByType.set(SchemaKind.InvitationGetResponse, { content: invitationGetResponseSchema, dependencies: [commonDefinitionsSchema] });
schemaByType.set(SchemaKind.InvitationPostResponse, { content: invitationPostResponseSchema, dependencies: [commonDefinitionsSchema] });
schemaByType.set(SchemaKind.InvitationsGetResponse, { content: invitationsGetResponseSchema, dependencies: [commonDefinitionsSchema] });
schemaByType.set(SchemaKind.MessagesGetResponse, { content: messagesGetResponseSchema, dependencies: [] });

const getSchema = (schemaKind: SchemaKind): SchemaWithDependencies => {
    const schema = schemaByType.get(schemaKind);
    if (!schema) {
        throw new Error(`Schema ${schemaKind} not registered.`)
    }
    return schema;
}

export const validateSchemaAsync = async <TResponse>(responsePromise: Promise<TResponse>, responseSchemaKind: SchemaKind): Promise<TResponse> => {
    return responsePromise.then(response => {
        const ajv = new Ajv({ allErrors: true });

        const responseSchema = getSchema(responseSchemaKind);
        ajv.addSchema(responseSchema.dependencies);
        const validate = ajv.compile(responseSchema.content);
        const valid = validate(response);
        if (!valid) {
            console.error(validate.errors, JSON.stringify(response), JSON.stringify(responseSchema.content));
        }
        return response;
    });
}