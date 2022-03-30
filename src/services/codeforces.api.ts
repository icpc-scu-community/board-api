import { RequestCache } from '../RequestCache';
import { TraineesType } from '../types';

export interface CodeforcesHandlesResponse {
  status: string;
  result: {
    handle: string;
    lastName?: string;
    firstName?: string;
  }[];
}

export abstract class CodeforcesAPI {
  // No more than 10000 handles is accepted.
  // ref: https://codeforces.com/apiHelp/methods#user.info
  static MAX_HANDLES_SIZE = 10000;
  static HANDLES_SEPARATOR = ';';

  static async getNamesFromHandles(handles: string[]): Promise<TraineesType> {
    if (handles.length > this.MAX_HANDLES_SIZE || handles.length === 0) {
      throw new Error(`Invalid 'handles' size (${handles.length}). Length: Min (1) - Max (${this.MAX_HANDLES_SIZE}).`);
    }

    const handlesEncoded = handles.join(this.HANDLES_SEPARATOR);

    const URL = `https://codeforces.com/api/user.info?handles=${handlesEncoded}`;
    const response = await RequestCache.getJSON<CodeforcesHandlesResponse>(URL);
    return response.result.map(({ handle, firstName, lastName }) => ({
      handle,
      name: firstName && lastName ? `${firstName} ${lastName}` : handle,
    }));
  }
}
