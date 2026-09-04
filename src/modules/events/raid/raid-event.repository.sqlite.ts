import type { DatabaseConnection } from "../../../infrastructure/database/database";
import type { RaidEventRepository } from "./raid-event.repository";
export class SqliteRaidEventRepository implements RaidEventRepository{
 constructor(private readonly database:DatabaseConnection){}
 getOrCreate(eventId:number){this.database.prepare(`INSERT OR IGNORE INTO raid_event_state(event_id,hp_percentage,total_kill_count) VALUES (?,100,0)`).run(eventId);const row=this.database.prepare(`SELECT hp_percentage,total_kill_count FROM raid_event_state WHERE event_id=?`).get(eventId) as {hp_percentage:number;total_kill_count:number};return{hpPercentage:row.hp_percentage,totalKillCount:row.total_kill_count};}
}
