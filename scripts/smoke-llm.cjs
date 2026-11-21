// Run real application prompts without creating users or modifying the database.
// Usage: node --env-file=.env scripts/smoke-llm.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'server-only') return {}
  if (request.startsWith('@/')) request = path.join(root, request.slice(2))
  return originalLoad.call(this, request, parent, isMain)
}
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  })
  module._compile(compiled.outputText, filename)
}

async function playVisits() {
  const { generateLiveReply } = require('../lib/llm/chat.ts')
  const { Margaret } = require('../lib/personas.json')
  const scenarios = require('../lib/scenarios.json')
  const turns = {
    'House Visit': ['Hello Auntie, I’m Sam from the centre. Can we talk at the door?', 'What would you like a hand with?', 'Nope.', 'Sorry, that was abrupt. Would another time suit you?', 'Okay, I’ll leave you to it. Bye Auntie.'],
    'Emotional Listening Ear': ['Can I sit with you a while? Sounds like a rough morning.', 'What happened between you two?', 'You stupid.', 'I’m sorry I called you that. You deserved a listening ear.', 'Would you like some quiet company or some time to yourself?', 'Okay Auntie. Thank you for telling me.', 'I’m glad we could sit a while. Shall I leave you to rest now? Take care.'],
    'Resolve a Task': ['Open HealthHub and sign in privately with Singpass. What do you see?', 'This app is stupid.', 'You stupid.', 'Sorry Auntie. I was rude. Take your time.', 'Tap the Healthier SG banner, choose your own profile and start enrolment.', 'Tap Enrol in Healthier SG, then Select preferred clinic. Choose the clinic you want.', 'Check the clinic name and tap Confirm enrolment. What does your screen say?', 'Tap Book appointment for your first Health Plan visit. Choose a time that suits you and confirm. What does it show?', 'Check the date and clinic shown. Are you happy to leave it there for today?', 'Thanks for checking with me. Take care, Auntie.'],
  }
  const selected = process.argv[process.argv.indexOf("--play-visits") + 1]
  if (selected) assert.ok(Object.hasOwn(turns, selected), "Unknown scenario")
  for (const [scenario, lines] of Object.entries(turns)) {
    if (selected && scenario !== selected) continue
    for (const difficulty of ['Easy', 'Hard']) {
      const history = [{ sender: 'persona', content: scenarios[scenario].starting_messages[0] }]
      console.log(scenario, difficulty, history[0].content)
      for (const line of lines) {
        await new Promise(resolve => setTimeout(resolve, 2300))
        const reply = await generateLiveReply(scenario, difficulty, Margaret, history, line)
        console.log(line, '→', reply.expression, reply.text)
        if (line === 'You stupid.') assert.equal(reply.expression, 'angry')
        if (line === 'This app is stupid.') assert.notEqual(reply.expression, 'angry')
        history.push({ sender: 'user', content: line }, { sender: 'persona', content: reply.text })
        if (reply.requestedEnd) break
      }
    }
  }
}

async function main() {
  const { talkToPersona } = require('../lib/llm/chat.ts')
  const { evaluateResponse } = require('../lib/llm/evaluate.ts')
  const { evaluateCompletion } = require('../lib/llm/completion.ts')
  const { getModelNames } = require('../lib/llm/models.ts')
  const personas = require('../lib/personas.json')
  const scenarios = require('../lib/scenarios.json')
  const message = 'Hello Margaret, how are you today? May I come in and see how you are doing?'
  const history = [{ sender: 'user', content: message, sent_at: new Date().toISOString() }]
  console.log('Testing models:', getModelNames().join(', '))
  const reply = await talkToPersona('House Visit', 'Easy', personas.Margaret, [], message)
  assert.equal(typeof reply, 'string')
  assert.ok(reply.length > 0)
  console.log('PASS persona reply')
  const booking = 'Resolve a Task'
  const turns = [
    ['Open HealthHub and log in yourself with Singpass.', 'Okay, I logged in. Now where?'],
    ['Tap the Healthier SG banner to start enrolment.', 'Found it. Which name to choose?'],
    ['Choose your own profile and tap Enrol in Healthier SG.', 'Okay, my name is there.'],
    ['Tap Select preferred clinic and pick the clinic you want.', 'I chose my usual clinic.'],
    ['Check the clinic name and tap Confirm enrolment.', 'Enrolled already. The appointment how?'],
    ['Tap Book appointment, choose a slot for your first Health Plan visit and confirm.', 'Can see the booking already. Tuesday morning at my clinic.'],
  ]
  const transcript = [{ sender: 'persona', content: scenarios[booking].starting_messages[0] }]
  for (const [index, [volunteer, margaret]] of turns.entries()) {
    if (index === 3 || index === 5) {
      const assessment = await evaluateResponse(booking, personas.Margaret, volunteer, transcript, null,
        'Hard', scenarios[booking].objective, 0, 2048, margaret)
      assert.equal(assessment.objectiveMet, index === 5, 'Booking rubric at step ' + (index + 1))
    }
    transcript.push({ sender: 'user', content: volunteer }, { sender: 'persona', content: margaret })
  }
  console.log('PASS incomplete and complete HealthHub guidance')
  for (const name of ['House Visit', 'Resolve a Task']) {
    const evaluation = await evaluateResponse(name, personas.Margaret, message, history, null, 'Easy', scenarios[name].objective)
    assert.ok(['positive', 'neutral', 'negative'].includes(evaluation.sentiment))
    assert.ok(scenarios[name].constraints.approved_expressions.includes(evaluation.expression))
    assert.ok(Number.isFinite(evaluation.rapportChange))
    assert.equal(typeof evaluation.suggestion, 'string')
    if (name === 'Resolve a Task') assert.equal(typeof evaluation.taskCompleted, 'boolean')
    console.log('PASS mid-conversation evaluation:', name)
  }
  const result = await evaluateCompletion(history, "Complete a polite and efficient home visit.")
  assert.equal(typeof result.completed, 'boolean')
  assert.equal(typeof result.objective_met, 'boolean')
  assert.equal(typeof result.feedback, 'string')
  assert.equal(result.scores.length, 4)
  assert.ok(result.scores.every(s => Number.isInteger(s.value) && s.value >= 0 && s.value <= 100))
  console.log('PASS completion evaluation')
  const doorstep = [
    ['persona', 'Yes, who is it?'],
    ['user', 'I’m Sam from the centre. Is now okay for a quick check-in at the door?'],
    ['persona', 'A minute can. My radio cuts out but please leave it where it is.'],
    ['user', 'I’ll leave the radio alone. Would you like the centre’s number in case you want someone to look at it later?'],
    ['persona', 'Yes please, leave the number beside the radio.'],
    ['user', 'I’ve left the number beside your radio. Thank you for your time. Bye, Auntie.'],
    ['persona', 'Thank you, Sam. Bye.'],
  ].map(([sender, content]) => ({ sender, content }))
  const { objectiveCriteria } = require('../lib/chat/live-rules.ts')
  const report = await evaluateCompletion(doorstep, objectiveCriteria['House Visit'])
  assert.equal(report.completed, true, 'The volunteer and Margaret agreed to end the visit')
  assert.equal(report.objective_met, true, 'A consent-based agreed next step earns credit')
  console.log('PASS agreed doorstep ending with transcript evidence')
}
(process.argv.includes('--play-visits') ? playVisits() : main()).catch(error => {
  console.error('LLM smoke test failed:', error.message)
  process.exitCode = 1
})
