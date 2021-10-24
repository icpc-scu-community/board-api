import { ScraperType } from '../database/models';
import { MetadataType } from '../types';
import { JsonBuilder } from './Json.builder';

type MetadataResponse = { boardName: string; lastUpdate: number | null };
export class MetadataBuilder implements JsonBuilder {
  constructor(private metadata: MetadataType, private storedMetadata: ScraperType | null) {}
  toJSON(): MetadataResponse {
    return {
      boardName: this.metadata.boardName,
      lastUpdate: this.storedMetadata?.lastUpdate || null,
    };
  }
}
