import { prop, modelOptions, getModelForClass, DocumentType } from '@typegoose/typegoose';

@modelOptions({
  schemaOptions: {
    capped: { max: 1, size: 1024 },
  },
})
class Metadata {
  @prop({ default: Date.now })
  public lastRun!: number;
}

export const MetadataModel = getModelForClass(Metadata);
export type MetadataType = DocumentType<Metadata>;
