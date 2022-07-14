export type SubmissionsType = {
  [handle: string]: {
    [problemUniqueId: string]: {
      isAc: boolean;
      triesBeforeAC: number;
    };
  };
};

export type SheetsMapType = { [sheetId: string]: { [sheetIndex: string]: number } };
export type GroupsType = { id: string; contests: number[] }[];
export type TraineesType = { name: string; handle: string }[];

/**
 @example
 {
    "groups": [
      {
        "id": "MWSDmqGsZm",
        "contests": [219158, 219432]
      }
    ],
    "trainees": [
      {
        "name": "Kerollos Magdy",
        "handle": "Kerolloz"
      }
    ],
 }
*/
export type ConfigsType = {
  groups: GroupsType;
  trainees: TraineesType;
};

export type ResponseType = {
  record: ConfigsType;
};
