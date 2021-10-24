import { prop, modelOptions, getModelForClass, DocumentType } from '@typegoose/typegoose';

// scraper metadata
@modelOptions({
  schemaOptions: {
    capped: { max: 1, size: 1024 },
  },
})
class Scraper {
  @prop({ default: Date.now })
  public lastUpdate!: number;
}

export const ScraperModel = getModelForClass(Scraper);
export type ScraperType = DocumentType<Scraper>;
