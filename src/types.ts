export type SubmissionsType = {
  [handle: string]: {
    [problemUniqueId: string]: {
      verdict: string;
      triesBeforeAC: number;
      list: { id: string; message: string; verdict: string }[];
    };
  };
};

export type TraineesListType = { name: string; handle: string }[];
export type SheetsMapType = { [sheetId: string]: { [sheetIndex: string]: number } };
export type TraineesMapType = { [handle: string]: number };
