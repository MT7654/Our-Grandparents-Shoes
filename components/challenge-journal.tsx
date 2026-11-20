"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import {
  chapters,
  challenges,
  chapterBadges,
  chapterImage,
  getChallenge,
  mastery,
  type SkillVisit,
  type SkillReport,
} from "@/lib/visits/challenges"

export function SkillAlbum() {
  const [visits, setVisits] = useState<SkillVisit[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetch("/api/visits/skills")
      .then(async (r) => {
        if (!r.ok) throw Error()
        setVisits((await r.json()).visits)
      })
      .catch(() => setFailed(true))
  }, [])
  return (
    <section className="album">
      <h2>My stamp album</h2>
      {failed ? (
        <p>Journal unavailable. Refresh to try again.</p>
      ) : !visits ? (
        <p>Opening your journal…</p>
      ) : (
        chapters.map((chapter, i) => {
          const skills = challenges.filter((c) => c.scenario === chapter)
          const badge = skills.every(
            (c) =>
              mastery(visits.filter((v) => v.challenge_id === c.id)) ===
              "Repeated independently",
          )
          return (
            <details key={chapter}>
              <summary>
                {chapter}{" "}
                <span>
                  {badge
                    ? chapterBadges[i]
                    : skills.filter((c) =>
                        visits.some(
                          (v) =>
                            v.challenge_id === c.id &&
                            v.skill_report?.state === "Demonstrated",
                        ),
                      ).length + " / 4 demonstrated"}
                </span>
              </summary>
              {badge && <p>Chapter badge earned · {chapterBadges[i]}</p>}
              <div className="stamp-grid">
                {skills.map((c) => {
                  const entries = visits.filter((v) => v.challenge_id === c.id)
                  const status = mastery(entries)
                  return (
                    <article key={c.id}>
                      <img
                        src={c.image}
                        alt=""
                        className={
                          ["Demonstrated", "Repeated independently"].includes(
                            status,
                          )
                            ? ""
                            : "uncollected"
                        }
                      />
                      <h3>{c.title}</h3>
                      <p>{status}</p>
                      {entries.map((v) => (
                        <Link key={v.vid} href={"/dashboard/review/" + v.vid}>
                          {new Date(v.started_at).toLocaleDateString("en-SG")} ·{" "}
                          {v.difficulty} ·{" "}
                          {v.skill_report?.state ?? "Awaiting review"}
                        </Link>
                      ))}
                      <Link
                        href={
                          "/chat/" +
                          chapter.replaceAll(" ", "-") +
                          "?focus=" +
                          c.id
                        }
                      >
                        Practise this skill
                      </Link>
                    </article>
                  )
                })}
              </div>
            </details>
          )
        })
      )}
    </section>
  )
}

type Review = {
  focus: string | null
  report: SkillReport | null
  flagged: boolean
  prompt: string
}
export function SkillDebrief({ vid }: { vid: string }) {
  const [data, setData] = useState<Review | null>(null),
    [draft, setDraft] = useState(""),
    [reply, setReply] = useState(""),
    [retryText, setRetryText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Original")
  async function send(action: string) {
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/visits/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vid, action, text: draft }),
      })
      if (!res.ok) throw Error()
      const result = await res.json()
      if (action === "review") setData(result)
      if (action === "flag")
        setData((prev) => prev && { ...prev, flagged: true })
      if (action === "replay") {
        setReply(result.reply)
        setRetryText(draft)
        setTab("Retry")
      }
    } catch {
      setError("Couldn’t load this journal action. Please try again.")
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    void send("review")
  }, [vid])
  const c = getChallenge(data?.focus)
  if (!c)
    return error ? (
      <button onClick={() => send("review")}>{error}</button>
    ) : null
  const r = data?.report
  return (
    <section className="evidence-card">
      <img
        src={c.image}
        alt=""
        className={r?.state === "Demonstrated" ? "earned" : "uncollected"}
      />
      <div>
        <h2>
          {r?.state === "Demonstrated"
            ? "Skill demonstrated"
            : (r?.state ?? "Awaiting review")}
        </h2>
        <h3>{c.title}</h3>
        {r ? (
          <>
            <p>{r.note}</p>
            {r.volunteer && (
              <>
                <blockquote>
                  <b>You</b>
                  {r.volunteer}
                </blockquote>
                <blockquote>
                  <b>Margaret</b>
                  {r.margaret}
                </blockquote>
              </>
            )}
            {r.turn >= 1 && (
              <details className="focus-tab">
                <summary>Replay this moment</summary>
                <p>{data?.prompt}</p>
                <div className="journal-actions">
                  {["Original", "Retry"].map((value) => (
                    <button
                      key={value}
                      aria-pressed={tab === value}
                      onClick={() => setTab(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                {tab === "Original" ? (
                  <p>
                    {r.volunteer} · {r.margaret}
                  </p>
                ) : (
                  reply && (
                    <p>
                      {retryText} · {reply}
                    </p>
                  )
                )}
                <label>
                  Your new reply
                  <textarea
                    maxLength={800}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                </label>
                <button
                  disabled={busy || !draft.trim()}
                  onClick={() => send("replay")}
                >
                  {busy ? "Please wait…" : "Try this reply"}
                </button>
              </details>
            )}
            <button
              className="journal-link"
              onClick={() => send("flag")}
              disabled={busy || data?.flagged}
            >
              {data?.flagged
                ? "Flagged for facilitator review"
                : "Flag this judgement"}
            </button>
          </>
        ) : (
          <button disabled={busy} onClick={() => send("review")}>
            Retry assessment
          </button>
        )}
        {error && <p role="alert">{error}</p>}
        <Link className="journal-link" href="/dashboard#album">
          Back to stamp album
        </Link>
      </div>
    </section>
  )
}
export function ChapterCover({ name }: { name: string }) {
  return <img className="chapter-strip" alt="" src={chapterImage(name)} />
}
