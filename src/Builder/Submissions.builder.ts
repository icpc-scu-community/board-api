import { SubmissionModel, SubmissionType } from '../database/models';
import { JsonBuilder } from './Json.builder';

type SubmissionResponse = {
  [handle: string]: {
    [problemId: string]: { isAc: boolean; triesBeforeAc: number };
  };
};

export class SubmissionsBuilder implements JsonBuilder {
  private _submissionsIndexer: SubmissionResponse = {};
  submissions!: SubmissionType[];

  async prepare(handles: string[], contests: number[]) {
    console.time('SubmissionsBuilder.prepare');
    this.submissions = await SubmissionModel.find(
      {
        contestId: { $in: contests },
        handle: { $in: handles },
      },
      { _id: 0, id: 1, contestId: 1, handle: 1, problem: 1, isAc: 1 },
      { lean: true },
    );
    this._indexSubmissions(handles);
    console.timeEnd('SubmissionsBuilder.prepare');
  }

  private _indexSubmissions(handles: string[]) {
    handles.forEach((handle) => {
      this._submissionsIndexer[handle] = {};
    });
  }

  setAccepted(handle: string, problemId: string) {
    this._submissionsIndexer[handle][problemId].isAc = true;
  }

  isNotSolvedYet(handle: string, problemId: string): boolean {
    return !this._submissionsIndexer[handle][problemId].isAc;
  }

  isFirstSubmission(handle: string, problemId: string): boolean {
    return this._submissionsIndexer[handle][problemId] === undefined;
  }

  incrementTriesBeforeAc(handle: string, problemId: string) {
    this._submissionsIndexer[handle][problemId].triesBeforeAc++;
  }

  addProblem(handle: string, problemId: string) {
    this._submissionsIndexer[handle][problemId] = {
      isAc: false,
      triesBeforeAc: 0,
    };
  }

  toJSON(): SubmissionResponse {
    return this._submissionsIndexer;
  }
}
