# Board Backend API

The API processes the stored information (scraped submissions, contests, ...etc.) in the database and returns it in a ready to [view format](#response-format).

## Usage

- Clone the repository
- Install the dependencies:  `npm install`
- Create `.env` file and add the required variables from `.env.example`

### Development

```bash
npm run dev
```

## API

### GET `/`

> The root `/` endpoint is the only available endpoint.  
> It returns all the required info to view the submissions summary.

required query variable:

- **configs**: a URL that returns JSON in the following format.  
e.g. <https://api.jsonbin.io/b/6175e8fc9548541c29c80745>

```json
{
  "groups": [
    {
      "id": "MWSDmqGsZm",
      "contests": [
        "219158",
        219432
      ]
    }
  ],
  "trainees": [
    {
      "name": "Amr Salama",
      "handle": "AmrSalama"
    },
    {
      "name": "Kerollos Magdy",
      "handle": "Kerolloz"
    }
  ]
}
```

### Response Format

Example:

<https://api.boardy.cf/?configs=https://api.jsonbin.io/b/6175e8fc9548541c29c80745>

Open the URL to see the response.
