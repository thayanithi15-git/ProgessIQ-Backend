const { BigQuery } = require("@google-cloud/bigquery");
require("dotenv").config();

let credentials;
try {
  if (!process.env.GOOGLE_CLOUD_CREDENTIALS) {
    throw new Error("GOOGLE_CLOUD_CREDENTIALS environment variable is not set");
  }
  credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_CLOUD_CREDENTIALS, "base64").toString("utf8")
  );
} catch (error) {
  console.error("Error parsing Google Cloud credentials:", error);
  process.exit(1); // Exit the application if credentials are invalid
}
// jobs.query fast path: BigQuery answers short queries without creating a job (~200ms
// saved per call from Mumbai to our US datasets). Must be set before the constructor
// below reads it, so it lives here rather than in .env. Load jobs are unaffected.
if (process.env.QUERY_PREVIEW_ENABLED === undefined) {
  process.env.QUERY_PREVIEW_ENABLED = "TRUE";
}

const bigquery = new BigQuery({
  projectId: process.env.BIGQUERY_PROJECT_ID,
  // keyFilename: process.env.BIGQUERY_KEY_FILE
  credentials,
  // Include Drive scope so queries against Sheets-linked federated tables work
  scopes: [
    "https://www.googleapis.com/auth/bigquery",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
});

bigquery.credentials = credentials;
module.exports = bigquery;
