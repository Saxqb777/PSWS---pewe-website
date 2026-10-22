import "server-only";

/**
 * Switches for the members' portal, set in the Vercel project settings.
 *
 * PSWS_PORTAL=on   every member gets their own number and page under /erp/me.
 *                  Off (the default), the office works exactly as before.
 * PSWS_DEMO=on     the demo copy: sample people anyone can sign in as with one
 *                  tap. Only ever set on the demo project, which has its own
 *                  database of sample data; never on the real office.
 */
export const portalOn = () => process.env.PSWS_PORTAL === "on";
export const demoOn = () => portalOn() && process.env.PSWS_DEMO === "on";
