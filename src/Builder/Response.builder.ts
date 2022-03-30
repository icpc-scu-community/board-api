import { MetadataType } from '../database/models';
import { ConfigsType } from '../types';
import { JsonBuilder } from './Json.builder';
import { MetadataBuilder } from './Metadata.builder';
import { SheetsBuilder } from './Sheets.builder';
import { SubmissionsBuilder } from './Submissions.builder';
import { TraineesBuilder } from './Trainees.builder';
import days from './days.json';

export class ResponseBuilder implements JsonBuilder {
  private sheetsBuilder: SheetsBuilder;
  private traineesBuilder: TraineesBuilder;
  private metadataBuilder: MetadataBuilder;
  private submissionsBuilder: SubmissionsBuilder;

  constructor({ groups, trainees }: ConfigsType, storedMetdata: MetadataType | null) {
    this.sheetsBuilder = new SheetsBuilder(groups);
    this.traineesBuilder = new TraineesBuilder(trainees);
    this.metadataBuilder = new MetadataBuilder(storedMetdata);
    this.submissionsBuilder = new SubmissionsBuilder();
  }

  async toJSON() {
    console.time('ResponseBuilder.Promise.all.prepare');
    await Promise.all([
      this.traineesBuilder.prepare(),
      this.sheetsBuilder.prepare(),
      this.submissionsBuilder.prepare(this.traineesBuilder.allHandles, this.sheetsBuilder.allContests),
    ]);
    console.timeEnd('ResponseBuilder.Promise.all.prepare');

    console.time('submissions-loop');
    this.submissionsBuilder.submissions.forEach(({ contestId, handle, isAc, problem, when }) => {
      const problemLetter = problem.split(' - ')[0]; // submission.problem is like "A - ProblemName"
      const problemId = `${contestId}-${problemLetter}`; // problemId is like "123-A"

      /* ------- Ramadan Challenge Logic --------- */
      // get the day when the current problem was released
      const problemsDay = days[problemLetter as 'A'] as number;
      const EG_TIMEZONE = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
      const from = new Date(EG_TIMEZONE);
      const to = new Date(EG_TIMEZONE);
      const PM_10 = 12 + 10 - 2; // 10:00 PM UTC
      const APRIL = 4 - 1; // month is zero-based

      from.setFullYear(2022, APRIL, problemsDay);
      to.setFullYear(2022, APRIL, problemsDay + 1);

      from.setUTCHours(PM_10, 0, 0, 0);
      to.setUTCHours(PM_10, 0, 0, 0);

      const submittedAt = when;
      const shouldBeCounted = submittedAt >= from && submittedAt <= to;

      if (!shouldBeCounted) return;
      /* ------- Ramadan Challenge Logic --------- */

      this.traineesBuilder.incrementSubmissions(handle);
      // (first time the user tries this problem)
      if (this.submissionsBuilder.isFirstSubmission(handle, problemId)) {
        this.submissionsBuilder.addProblem(handle, problemId);
        // the user tried a new problem
        this.traineesBuilder.incrementProblemsTried(handle);
      }

      if (this.submissionsBuilder.isNotSolvedYet(handle, problemId)) {
        // and the current submissions is the first accepted submissions the user gets  for this problem
        if (isAc) {
          // the user solved the problem
          this.submissionsBuilder.setAccepted(handle, problemId);
          // increment solved problems for trainee
          this.traineesBuilder.incrementProblemsSolved(handle);
          // decrement problems tried but not solved yet for trainee
          this.traineesBuilder.decrementProblemsTried(handle);
          // increment problem solved for contest
          this.sheetsBuilder.incrementSolved(contestId, problemLetter);
        } else {
          // not accepted
          // increment tries before getting accepted for problem
          this.submissionsBuilder.incrementTriesBeforeAc(handle, problemId);
        }
      }
    });
    console.timeEnd('submissions-loop');

    console.time('ResponseBuilder.Promise.all.toJSON');
    const [trainees, sheets, metadata, submissions] = [
      this.traineesBuilder.toJSON(),
      this.sheetsBuilder.toJSON(),
      this.metadataBuilder.toJSON(),
      this.submissionsBuilder.toJSON(),
    ];
    console.timeEnd('ResponseBuilder.Promise.all.toJSON');
    return { trainees, sheets, submissions, metadata };
  }
}
