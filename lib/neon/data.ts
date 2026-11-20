import { identity } from "./auth"
import { transaction } from "./pool"

const identifier = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw Error("Invalid SQL identifier")
  return '"' + name + '"'
}
const nested: Record<string, string> = {
  "visit_memberships(uid,left_at)":
    "(select coalesce(json_agg(json_build_object('uid',m.uid,'left_at',m.left_at)),'[]') from visit_memberships m where m.cohort_id=t.id) as visit_memberships",
  "visit_recipients(uid)":
    "(select coalesce(json_agg(json_build_object('uid',r.uid)),'[]') from visit_recipients r where r.assignment_id=t.id) as visit_recipients",
  "scores(metric_name,metric_value)":
    "(select coalesce(json_agg(json_build_object('metric_name',s.metric_name,'metric_value',s.metric_value)),'[]') from scores s where s.vid=t.vid) as scores"
}
type Result<D = any> = {
  data: D
  error: null | { code: string; message: string }
  count?: number
}
class Query<D = any[]> {
  private fields = "*"
  private mutation: "insert" | "update" | "upsert" | null = null
  private records: Record<string, unknown>[] = []
  private params: unknown[] = []
  private where: string[] = []
  private ordering = ""
  private maximum = ""
  private cardinality: "one" | "optional" | "many" = "many"
  private count = false
  private conflict = ""
  private ignore = false
  constructor(
    private table: string,
    private uid: string | null
  ) {}
  select(fields = "*", options?: { count?: string }) {
    this.fields = fields
    this.count = !!options?.count
    return this
  }
  private bind(value: unknown) {
    this.params.push(value)
    return "$" + this.params.length
  }
  private filter(col: string, op: string, v: unknown) {
    const param = this.bind(v)
    const related: Record<string, string> = {
      "conversations.uid":
        "exists(select 1 from conversations c where c.vid=t.vid and c.uid=" +
        param +
        ")",
      "visit_recipients.uid":
        "exists(select 1 from visit_recipients r where r.assignment_id=t.id and r.uid=" +
        param +
        ")"
    }
    this.where.push(
      related[col] ?? identifier(col.split(".").at(-1)!) + op + param
    )
    return this
  }
  eq(c: string, v: unknown) {
    return this.filter(c, "=", v)
  }
  like(c: string, v: string) {
    return this.filter(c, " like ", v)
  }
  ilike(c: string, v: string) {
    return this.filter(c, " ilike ", v)
  }
  is(c: string, v: null) {
    if (v !== null) throw Error("Expected null filter")
    this.where.push(identifier(c) + " is null")
    return this
  }
  in(c: string, v: unknown[]) {
    this.where.push(identifier(c) + "=any(" + this.bind(v) + ")")
    return this
  }
  order(c: string, opt?: { ascending: boolean }) {
    this.ordering =
      " order by " +
      identifier(c) +
      (opt?.ascending === false ? " desc" : " asc")
    return this
  }
  limit(n: number) {
    if (!Number.isSafeInteger(n) || n < 0) throw Error("Invalid limit")
    this.maximum = " limit " + n
    return this
  }
  single() {
    this.cardinality = "one"
    return this as unknown as Query<any>
  }
  maybeSingle() {
    this.cardinality = "optional"
    return this as unknown as Query<any>
  }
  insert(r: Record<string, unknown> | Record<string, unknown>[]) {
    this.records = Array.isArray(r) ? r : [r]
    this.mutation = "insert"
    return this
  }
  update(r: Record<string, unknown>) {
    this.records = [r]
    this.mutation = "update"
    return this
  }
  upsert(
    r: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string; ignoreDuplicates?: boolean }
  ) {
    this.insert(r)
    this.mutation = "upsert"
    this.conflict =
      opts?.onConflict ??
      { visit_reflections: "vid", visit_retries: "id" }[this.table] ??
      ""
    this.ignore = !!opts?.ignoreDuplicates
    return this
  }
  private async execute(): Promise<Result> {
    try {
      const relation = identifier(this.table)
      const filter = this.where.length
        ? " where " + this.where.join(" and ")
        : ""
      let sql = ""
      if (this.mutation) {
        const keys = Object.keys(this.records[0])
        if (this.mutation === "update") {
          if (!filter) throw Error("Missing update filter")
          sql =
            "update " +
            relation +
            " as t set " +
            keys
              .map((k) => identifier(k) + "=" + this.bind(this.records[0][k]))
              .join(",") +
            filter
        } else {
          sql =
            "insert into " +
            relation +
            " (" +
            keys.map(identifier).join(",") +
            ") values " +
            this.records
              .map(
                (r) => "(" + keys.map((k) => this.bind(r[k])).join(",") + ")"
              )
              .join(",")
          if (this.mutation === "upsert")
            sql +=
              " on conflict (" +
              this.conflict.split(",").map(identifier).join(",") +
              ") " +
              (this.ignore
                ? "do nothing"
                : "do update set " +
                  keys
                    .map((k) => identifier(k) + "=excluded." + identifier(k))
                    .join(","))
        }
        sql += " returning *"
      } else {
        const fields = this.fields
          .split(/,(?![^()]*\))/)
          .map((f) => f.trim())
          .filter(
            (f) =>
              ![
                "visit_recipients!inner(uid)",
                "conversations!inner(uid)"
              ].includes(f)
          )
        sql =
          "select " +
          (this.count
            ? "count(*) as n"
            : fields
                .map((f) => (f === "*" ? "t.*" : (nested[f] ?? identifier(f))))
                .join(",")) +
          " from " +
          relation +
          " as t" +
          filter +
          this.ordering +
          this.maximum
      }
      const result = await transaction(this.uid, (client) =>
        client.query(sql, this.params)
      )
      if (this.count)
        return { count: Number(result.rows[0]?.n ?? 0), data: [], error: null }
      if (this.cardinality !== "many") {
        if (
          result.rows.length !== 1 &&
          !(this.cardinality === "optional" && !result.rows.length)
        )
          return {
            data: null,
            error: { code: "PGRST116", message: "Record unavailable" }
          }
        return { data: result.rows[0] ?? null, error: null }
      }
      return { data: result.rows, error: null }
    } catch (err) {
      const e = err as { code: string; message: string }
      return { data: null, error: { code: e.code, message: e.message } }
    }
  }
  then<T, U>(
    yes: (r: Result<D>) => T | PromiseLike<T>,
    no?: (e: unknown) => U | PromiseLike<U>
  ) {
    return this.execute().then(yes, no)
  }
}
function client(uid: string | null) {
  return {
    from: (table: string) => new Query(table, uid),
    async rpc(name: string, args: Record<string, unknown>): Promise<Result> {
      try {
        const rows = await transaction(uid, (c) =>
          c.query(
            "select * from " +
              identifier(name) +
              "(" +
              Object.keys(args)
                .map((k, i) => identifier(k) + "=>$" + (i + 1))
                .join(",") +
              ")",
            Object.values(args)
          )
        )
        return {
          data: name === "practice_usage" ? rows.rows : rows.rows[0]?.[name],
          error: null
        }
      } catch (err) {
        const e = err as { code: string; message: string }
        return { data: null, error: e }
      }
    }
  }
}
export async function createClient() {
  const user = await identity()
  if (!user) throw Error("Unauthorized")
  return client(user.id)
}
export async function createServiceClient() {
  return client(null)
}
