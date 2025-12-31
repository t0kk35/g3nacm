import { z } from "zod"

/**
 * Helper function to convert a json schema to a zod schema. Example json schema.
 * {
 *  "type": "object",
 *  "fields": {
 *    "title": {
 *      "type": "string",
 *      "description": "Short title"
 *    },
 *  "confidence": {
 *      "type": "number",
 *      "min": 0,
 *      "max": 1
 *    },
 *  "tags": {
 *     "type": "array",
 *     "items": { "type": "string" }
 *   }
 * },
 *  "required": ["title", "confidence"]
 * }
 * 
 * @param def the input json structure.
 * @returns 
 */
export function buildZodSchema(def: any): z.ZodTypeAny {
  switch (def.type) {
    case "string":
      return z.string()

    case "number":
      let num = z.number()
      if (def.min !== undefined) num = num.min(def.min)
      if (def.max !== undefined) num = num.max(def.max)
      return num

    case "array":
      return z.array(buildZodSchema(def.items))

    case "object":
      const shape: Record<string, z.ZodTypeAny> = {}
      for (const [key, value] of Object.entries(def.fields)) {
        shape[key] = buildZodSchema(value)
      }
      return z.object(shape)

    default:
      throw new Error(`Unsupported schema type: ${def.type}`)
  }
}

/*
const schemaDef = agent.output_schema // from DB
const outputSchema = buildZodSchema(schemaDef)

const result = await generateObject({
  model,
  schema: outputSchema,
  prompt
})
*/
