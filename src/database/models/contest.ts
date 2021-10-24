import { prop, getModelForClass, DocumentType } from '@typegoose/typegoose';

class Problem {
  @prop() public id!: string; // problem id is a letter in codeforces (e.g. A, B, C, ...)
  @prop() public name!: string;
}

// each codeforces group (e.g. https://codeforces.com/group/n3sTiYtHxI/) has a set of contests (aka sheets)
// every contest (e.g. https://codeforces.com/group/n3sTiYtHxI/contest/348729) consists of problems and submissions
// submissions exist under status page (e.g. https://codeforces.com/group/n3sTiYtHxI/contest/348729/status)
class Contest {
  @prop({ required: true, unique: true })
  public id!: number;

  @prop({ required: true, index: true })
  public groupId!: string;

  @prop({ required: true })
  public name!: string;

  @prop({ type: () => Problem, _id: false, default: [] })
  public problems!: Problem[];

  @prop({ required: true, default: 1 })
  public lastParsedStatusPage!: number;
}

export const ContestModel = getModelForClass(Contest);
export type ContestType = DocumentType<Contest>;
