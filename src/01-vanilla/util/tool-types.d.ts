import { type JSONSchema7 } from 'json-schema';
export interface Tool {
  name: string;
  description: string;
  input_schema: JSONSchema7;
}
