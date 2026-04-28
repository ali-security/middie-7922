'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const middiePlugin = require('../index')

const API_KEY = 'mock-api-key-123'

const variants = [
  '/secret',
  '//secret',
  '/secret/',
  '/secret?x=1',
  '/secret;foo=bar',
  '/secret;foo=bar?x=1',
  '//secret;foo=bar',
  '//secret//',
  '/%2fsecret',
  '/%2Fsecret',
  '/secret%2F'
]

function guardMiddie (req, res, next) {
  if (req.headers['x-api-key'] !== API_KEY) {
    res.statusCode = 401
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Unauthorized', where: 'middie /secret guard' }))
    return
  }
  next()
}

function comboLabel (routerOptions) {
  return 'dup=' + routerOptions.ignoreDuplicateSlashes +
    ',trail=' + routerOptions.ignoreTrailingSlash +
    ',semi=' + routerOptions.useSemicolonDelimiter
}

function allRouterOptionCombinations () {
  const result = []
  const flags = [false, true]
  for (let d = 0; d < flags.length; d++) {
    for (let tr = 0; tr < flags.length; tr++) {
      for (let s = 0; s < flags.length; s++) {
        result.push({
          ignoreDuplicateSlashes: flags[d],
          ignoreTrailingSlash: flags[tr],
          useSemicolonDelimiter: flags[s]
        })
      }
    }
  }
  return result
}

test('router option combinations: crafted variants never bypass middie use(/secret) guard', async function (t) {
  const hooks = [undefined, 'onRequest', 'preValidation', 'preHandler']
  const combos = allRouterOptionCombinations()

  for (let h = 0; h < hooks.length; h++) {
    const hook = hooks[h]
    for (let c = 0; c < combos.length; c++) {
      const routerOptions = combos[c]
      const guarded = Fastify(routerOptions)
      const plain = Fastify(routerOptions)

      t.teardown(function () { return guarded.close() })
      t.teardown(function () { return plain.close() })

      await guarded.register(middiePlugin, hook ? { hook: hook } : undefined)
      guarded.use('/secret', guardMiddie)

      guarded.get('/secret', async function () { return { ok: true, app: 'guarded' } })
      plain.get('/secret', async function () { return { ok: true, app: 'plain' } })

      for (let v = 0; v < variants.length; v++) {
        const url = variants[v]
        const control = await plain.inject({ method: 'GET', url: url })
        const secured = await guarded.inject({ method: 'GET', url: url })

        t.not(
          secured.statusCode,
          200,
          'hook=' + (hook || 'default') + ' ' + comboLabel(routerOptions) + ' url=' + url + ' should never bypass auth as 200'
        )

        if (control.statusCode === 200) {
          t.equal(
            secured.statusCode,
            401,
            'hook=' + (hook || 'default') + ' ' + comboLabel(routerOptions) + ' url=' + url + ' matches route; middie must block'
          )
        }
      }
    }
  }
})
