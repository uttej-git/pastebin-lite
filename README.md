
# Pastebin-Lite

A backend-focused Pastebin-like web application that allows users to create text pastes, share them through unique URLs, and view their content. Pastes can optionally expire after a specified time or number of views.

## Features

- Create text pastes and generate shareable links.
- Retrieve paste content through a REST API.
- View paste content through a web page.
- Optional time-to-live (TTL) expiry.
- Optional maximum view count.
- Persistent PostgreSQL storage.
- Input validation and unavailable-paste handling.
- Safe rendering of paste content.

## Technology Stack

- Node.js
- Express.js
- PostgreSQL
- `pg` PostgreSQL client
- Vercel for deployment

## Running Locally

### Prerequisites

- Node.js and npm
- A PostgreSQL database

### Installation

Clone the repository:

```bash
git clone https://github.com/uttej-git/pastebin-lite.git
cd pastebin-lite
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Configure the environment variables required by the application in a local `.env` file. Use the variable names expected by the application and provide your PostgreSQL connection string.

Never commit `.env` or database credentials to GitHub.

### Start the Application

Use the start command defined in `package.json`. For example:

```bash
npm start
```

If the project uses a different start command, follow the scripts defined in `package.json`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/healthz` | Check application and database health |
| POST | `/api/pastes` | Create a paste |
| GET | `/api/pastes/:id` | Retrieve a paste through the API |
| GET | `/p/:id` | View paste content as HTML |

### Create a Paste

Example request body:

```json
{
  "content": "Hello, Pastebin!",
  "ttl_seconds": 60,
  "max_views": 5
}
```

The TTL and maximum view count are optional. When provided, each must be an integer greater than or equal to 1.

A successful creation returns the paste ID and its shareable URL.

## Persistence

PostgreSQL is used as the persistent storage layer. Paste records are stored in the database so they can survive across separate application requests and serverless invocations.

## Testing

Run the project's configured test command:

```bash
npm test
```

The tests should cover API behavior, input validation, expiry, view limits, and unavailable pastes, as implemented by the project.

## Deployment

The application is deployed on Vercel:

https://pastebin-lite-orcin-iota.vercel.app/

## Repository

https://github.com/uttej-git/pastebin-lite
