import {
  broadcastResponseToMainFrame,
} from "@azure/msal-browser/redirect-bridge";

broadcastResponseToMainFrame().catch((error) => {
  console.error(
    "Microsoft redirect bridge error:",
    error
  );
});