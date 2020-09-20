# Board Backend API

The API processes the information stored in the database and returns it to
frontend.

## Usage

- Clone the repository
- Create `.env` file and add the required variables in `.env.example`
- Install the dependencies:  `npm install`

### Development

Run _Nodemon_ and binds to port `process.env.PORT || 5000`.

```bash
npm run dev
```

## API

### GET `/parse`

required query variables:
- **trainees-list**: URL that returns JSON in the following format.  
e.g. https://api.jsonbin.io/b/5f67d6bd302a837e956a47bf
```json
  [
    {
      "name": "Amr Salama",
      "handle": "AmrSalama"
    },
    {
      "name": "Kerollos Magdy",
      "handle": "Kerolloz"
    }
  ]
```
- **sheets-list**: URL that returns JSON in the following format.  
e.g. https://api.jsonbin.io/b/5f67d83e7243cd7e8240387c
```json
  [
    "223338",
    "223340"
  ]
```
---

Example:

https://icpc-scu-board-api.herokuapp.com/parse?trainees-list=https://api.jsonbin.io/b/5f67d6bd302a837e956a47bf&sheets-list=https://api.jsonbin.io/b/5f67d83e7243cd7e8240387c


Open the URL to see the response.
