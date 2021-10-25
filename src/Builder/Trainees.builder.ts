import { SubmissionType } from '../database/models';
import { TraineesType } from '../types';
import { JsonBuilder } from './Json.builder';

type TraineesResponse = {
  name: string;
  handle: string;
  states: { solved: number; tried: number; submissions: number };
};

export class TraineesBuilder implements JsonBuilder {
  private _traineesIndexer: { [key: string]: TraineesResponse } = {};

  constructor(private trainees: TraineesType) {}

  get allHandles() {
    return this.trainees.map((t) => t.handle);
  }

  prepare() {
    console.time('TraineesBuilder.prepare');
    this._indexTrainees(this.trainees);
    console.timeEnd('TraineesBuilder.prepare');
  }

  private _indexTrainees(trainees: TraineesType) {
    trainees.forEach((trainee) => {
      this._traineesIndexer[trainee.handle] = {
        ...trainee,
        states: { solved: 0, tried: 0, submissions: 0 },
      };
    });
  }

  public decrementProblemsTried(handle: string) {
    this._traineesIndexer[handle].states.tried--;
  }

  public incrementProblemsTried(handle: string) {
    this._traineesIndexer[handle].states.tried++;
  }
  public incrementProblemsSolved(handle: string) {
    this._traineesIndexer[handle].states.solved++;
  }
  public incrementSubmissions(handle: string) {
    this._traineesIndexer[handle].states.submissions++;
  }

  toJSON(): TraineesResponse[] {
    const trainees = Object.values(this._traineesIndexer);
    const smaller_first = (num1: number, num2: number) => (num1 < num2 ? -1 : num1 > num2 ? 1 : 0);
    const greater_first = (num1: number, num2: number) => smaller_first(num2, num1);

    trainees.sort((t1, t2) => {
      if (t1.states.solved !== t2.states.solved) {
        return greater_first(t1.states.solved, t2.states.solved);
      }
      // t1_solved === t2_solved === 0
      if (t1.states.solved === 0) {
        return greater_first(t1.states.submissions, t2.states.submissions);
      }
      // t1_solved === t2_solved !== 0
      if (t1.states.submissions !== t2.states.submissions) {
        return smaller_first(t1.states.submissions, t2.states.submissions);
      }
      // t1_solved === t2_solved && t1_submissions === t2_submissions
      return t1.name.localeCompare(t2.name);
    });
    return trainees;
  }
}
