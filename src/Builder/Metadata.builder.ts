import { MetadataType } from '../types';
import { JsonBuilder } from './Json.builder';

export class MetadataBuilder implements JsonBuilder {
  constructor(private metadata: MetadataType) {}
  toJSON(): MetadataType {
    return this.metadata;
  }
}
