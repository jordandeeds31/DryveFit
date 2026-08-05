import { getWeeksPlan } from "./getWeeksPlan";

const result = getWeeksPlan(new Date("2026-07-28"), 14, ["mon", "wed", "fri"]);

console.log(JSON.stringify(result, null, 2));
