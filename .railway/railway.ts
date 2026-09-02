import { defineRailway, project, service } from "railway/iac";

// Last resort for a per-service CaC repo. Prefer one .railway file for the
// project and drop this if you later combine services into that file.
export const partial = "umamusica";

export default defineRailway(() => {
  const umamusica = service("umamusica", {
    build: "npm run build",
    start: "npm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 30,
    // builder from CaC: "nixpacks"
  });
  return project("umamusica", {
    resources: [umamusica],
  });
});
