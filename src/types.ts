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
export type MetadataType = { boardName: string };

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
    "metadata": {
      "boardName": "Newcomers Training Board"
    },
 }
*/
export type ConfigsType = {
  groups: GroupsType;
  trainees: TraineesType;
  metadata: MetadataType;
};
