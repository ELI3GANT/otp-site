function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateJsonSchema(value, schema, path = '$') {
    const errors = [];
    if (schema.type === 'object') {
        if (!isObject(value)) return [`${path} must be an object`];
        for (const key of schema.required || []) {
            if (!(key in value)) errors.push(`${path}.${key} is required`);
        }
        if (schema.additionalProperties === false) {
            for (const key of Object.keys(value)) {
                if (!(key in (schema.properties || {}))) errors.push(`${path}.${key} is not allowed`);
            }
        }
        for (const [key, propertySchema] of Object.entries(schema.properties || {})) {
            if (key in value) errors.push(...validateJsonSchema(value[key], propertySchema, `${path}.${key}`));
        }
        return errors;
    }
    if (schema.type === 'array') {
        if (!Array.isArray(value)) return [`${path} must be an array`];
        if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} has too few items`);
        if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} has too many items`);
        value.forEach((entry, index) => errors.push(...validateJsonSchema(entry, schema.items, `${path}[${index}]`)));
        return errors;
    }
    if (schema.type === 'string') {
        if (typeof value !== 'string') return [`${path} must be a string`];
        if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} is too short`);
        if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path} is too long`);
        if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} has an unsupported value`);
        return errors;
    }
    if (schema.type === 'number' && typeof value !== 'number') errors.push(`${path} must be a number`);
    if (schema.type === 'boolean' && typeof value !== 'boolean') errors.push(`${path} must be a boolean`);
    return errors;
}

module.exports = { validateJsonSchema };
