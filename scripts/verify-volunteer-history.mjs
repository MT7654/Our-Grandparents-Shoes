import assert from "node:assert/strict"
import { PGlite } from "@electric-sql/pglite"
import { volunteerHistory } from "../lib/admin/volunteer-history.ts"

const db = new PGlite()
try {
  await db.exec(`
    create table profiles(user_id text, full_name text, role text);
    create table conversations(uid text, vid text, scenario_name text, difficulty text, completed boolean, created_at timestamptz);
    create table messages(vid text, mid int, sent_at timestamptz, sender text, content text);
    insert into profiles values ('a','Volunteer A','user'),('b','Volunteer B','user'),('c','Coordinator','admin'),('d','New Volunteer','user');
    insert into conversations values ('a','2','House Visit','Hard',false,'2026-11-12Z'),('a','1','Listening Ear','Easy',true,'2026-11-11Z'),('b','3','House Visit','Easy',true,'2026-11-11Z');
    insert into messages values ('1',2,'2026-11-11T10:01Z','user','Morning, Auntie!'),('1',1,'2026-11-11T10:00Z','persona','Can talk awhile?'),('3',3,now(),'user','Other volunteer message');
  `)
  const text = await volunteerHistory(db, 'a')
  assert.match(text, /Volunteer A/)
  assert.match(text, /Margaret: Can talk awhile\?[\s\S]+Volunteer: Morning, Auntie![\s\S]+House Visit · Hard · Incomplete/)
  assert.match(text, /6:00:00\s*pm/i)
  assert.match(text, /No recorded messages/)
  assert.doesNotMatch(text, /Other volunteer message/)
  assert.match(await volunteerHistory(db, 'd'), /No recorded sessions/)
  assert.equal(await volunteerHistory(db, 'c'), null)
  assert.equal(await volunteerHistory(db, 'missing'), null)
  console.log('Volunteer-only export, transcript order, timestamps, incomplete and empty histories passed.')
} finally { await db.close() }
