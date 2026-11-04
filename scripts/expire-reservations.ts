import { loadEnvFile } from "node:process";
import { expireReservations } from "../src/lib/commerce";
loadEnvFile(".env.local");
expireReservations();
console.log("Expired pending sandbox reservations processed.");
