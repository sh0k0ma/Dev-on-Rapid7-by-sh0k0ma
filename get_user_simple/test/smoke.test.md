# Smoke Test: get_user_simple

Manual steps to verify basic functionality.

1. Configure API in `src/config.js`.
   - Set BASE_URL, endpoints, header mode, regions, and pagination.
2. Run interactively:
   - `npm start`
   - Enter a valid API key when prompted.
3. Verify output:
   - See a table of users.
   - Footer shows total users and regions covered.
4. JSON mode:
   - `node ./src/index.js --json`
   - Output is a JSON array of user objects.
5. Env var mode:
   - `API_KEY=xxxxx node ./src/index.js`
   - Should skip prompt.
6. Error handling:
   - Try with an invalid key (expect clear 401/403 message and exit code 1).
   - If rate limited (429), confirm auto-retries with backoff messages.
