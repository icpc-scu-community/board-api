import { MetadataType } from '../database/models';
import { JsonBuilder } from './Json.builder';

type MetadataResponse = { lastRun: number | null };
export class MetadataBuilder implements JsonBuilder {
  constructor(private storedMetadata: MetadataType | null) {}
  toJSON(): MetadataResponse {
    return { lastRun: this.storedMetadata?.lastRun || null };
  }
}
