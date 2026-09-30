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
  assert.ok(reply.length > 0 && !reply.includes("don't understand"))
  console.log('PASS persona reply')
  for (const name of ['House Visit', 'Resolve a Task']) {
    const evaluation = await evaluateResponse(name, personas.Margaret, message, history, null, 'Easy', scenarios[name].objective)
    assert.ok(['positive', 'neutral', 'negative'].includes(evaluation.sentiment))
    assert.ok(scenarios[name].constraints.approved_expressions.includes(evaluation.expression))
    assert.ok(Number.isFinite(evaluation.rapportChange))
    assert.equal(typeof evaluation.suggestion, 'string')
    if (name === 'Resolve a Task') assert.equal(typeof evaluation.taskCompleted, 'boolean')
    console.log('PASS mid-conversation evaluation:', name)
  }
  const result = await evaluateCompletion(history)
  assert.equal(typeof result.completed, 'boolean')
  assert.equal(typeof result.objective_met, 'boolean')
  assert.equal(typeof result.feedback, 'string')
  assert.equal(result.scores.length, 4)
  assert.ok(result.scores.every(s => Number.isInteger(s.value) && s.value >= 0 && s.value <= 100))
  console.log('PASS completion evaluation')
}
main().catch(error => {
  console.error('LLM smoke test failed:', error.message)
  process.exitCode = 1
})
