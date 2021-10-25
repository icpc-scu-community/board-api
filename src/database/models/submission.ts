import { prop, getModelForClass, pre, DocumentType } from '@typegoose/typegoose';

const ACCEPTED_VERDICT = 'Accepted';

@pre<Submission>('validate', function () {
  this.isAc = this.verdict === ACCEPTED_VERDICT;
})
class Submission {
  @prop({ required: true, unique: true })
  public id!: number;

  @prop({ required: true, lowercase: true, index: true })
  public handle!: string;

  @prop({ required: true })
  public problem!: string;

  @prop({ required: true })
  public verdict!: string;

  @prop({ required: true })
  public isAc!: boolean;

  @prop({ required: true, index: true })
  public contestId!: number;
}

export const SubmissionModel = getModelForClass(Submission);
export type SubmissionType = DocumentType<Submission>;
