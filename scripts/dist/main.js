import { main } from "./cli.js";
main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ type: "workflow.failed", error: message }));
    process.exit(1);
});
