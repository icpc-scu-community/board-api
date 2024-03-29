import { BAD_REQUEST, HttpException } from '../core';
import { ContestModel, ContestType } from '../database/models';
import { GroupsType } from '../types';
import { JsonBuilder } from './Json.builder';

type ContestResponse = {
  name: string;
  id: string;
  groupId: string;
  problems: { id: string; name: string; solved: number }[];
};

export class SheetsBuilder implements JsonBuilder {
  private _contestsIndexer: { [key: string]: ContestResponse } = {};

  constructor(private groups: GroupsType) {}

  get allContests(): number[] {
    return this.groups.map((g) => g.contests).flat();
  }

  get allGroupsIds(): string[] {
    return this.groups.map((g) => g.id);
  }

  async prepare() {
    console.time('SheetsBuilder.prepare');
    const contests = await ContestModel.find(
      { id: { $in: this.allContests }, group: { $in: this.allGroupsIds } },
      { _id: false, id: 1, groupId: 1, name: 1, problems: 1 },
      { lean: true },
    );
    this._indexContests(contests);
    const missingContests = this.allContests.filter((c) => !this._contestsIndexer[c]);
    console.timeEnd('SheetsBuilder.prepare');
    if (missingContests.length) {
      throw new HttpException(BAD_REQUEST, {
        message: `Contests: ${missingContests.join(', ')} are not stored in our DB`,
      });
    }
  }

  private _indexContests(contests: ContestType[]) {
    contests.forEach((contest) => {
      this._contestsIndexer[contest.id] = {
        ...contest,
        problems: contest.problems.map((p) => ({ ...p, solved: 0 })),
      };
    });
  }

  public incrementSolved(contestId: number, problemLetter: string) {
    const contest = this._contestsIndexer[contestId];
    const problemIndex = problemLetter.charCodeAt(0) - 65;
    const problem = contest.problems[problemIndex];
    problem.solved++;
  }

  toJSON(): ContestResponse[] {
    return this._sortContests(Object.values(this._contestsIndexer));
  }

  private _sortContests(contests: ContestResponse[]): ContestResponse[] {
    const indexedGroups = Object.fromEntries(Object.entries(this.allGroupsIds).map(([index, val]) => [val, +index]));
    const indexedContests = Object.fromEntries(Object.entries(this.allContests).map(([index, val]) => [val, +index]));

    return [...contests].sort((c1, c2) =>
      indexedGroups[c1.groupId] === indexedGroups[c2.groupId]
        ? indexedContests[c1.id] - indexedContests[c2.id]
        : indexedGroups[c1.groupId] - indexedGroups[c2.groupId],
    );
  }
}
