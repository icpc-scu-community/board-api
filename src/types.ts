export type SubmissionsType = {
  [handle: string]: {
    [problemUniqueId: string]: {
      isAc: boolean;
      triesBeforeAC: number;
    };
  };
};

export type TraineesListType = { name: string; handle: string }[];
export type SheetsMapType = { [sheetId: string]: { [sheetIndex: string]: number } };
export type TraineesMapType = { [handle: string]: number };
