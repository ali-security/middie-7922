'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const middiePlugin = require('../index')

const API_KEY = 'mock-api-key-123'

function guardMiddie (req, res, next) {
  if (req.headers['x-api-key'] !== API_KEY) {
    res.statusCode = 401
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Unauthorized', where: 'middie /secret guard' }))
    return
  }
  next()
}

function buildWithMiddieHook (hook) {
  const app = Fastify({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    useSemicolonDelimiter: true
  })

  return {
    app: app,
    register: function () {
      return app.register(middiePlugin, hook ? { hook: hook } : undefined)
    }
  }
}

test('baseline: /secret is blocked without API key when guarded via middie use(/secret)', async function (t) {
  t.plan(2)
  const built = buildWithMiddieHook()
  const app = built.app
  t.teardown(function () { return app.close() })

  await built.register()
  app.use('/secret', guardMiddie)

  app.get('/secret', async function () { return { ok: true, route: '/secret' } })

  const res = await app.inject({ method: 'GET', url: '/secret' })
  const trailing = await app.inject({ method: 'GET', url: '/secret/' })
  t.equal(res.statusCode, 401)
  t.equal(trailing.statusCode, 401)
})

test('regression: crafted paths are blocked by middie use(/secret) under default onRequest hook', async function (t) {
  t.plan(4)
  const built = buildWithMiddieHook('onRequest')
  const app = built.app
  t.teardown(function () { return app.close() })

  await built.register()
  app.use('/secret', guardMiddie)

  app.get('/secret', async function (request) {
    return { ok: true, route: '/secret', url: request.raw.url }
  })

  const baseline = await app.inject({ method: 'GET', url: '/secret' })
  t.equal(baseline.statusCode, 401)

  const duplicateSlash = await app.inject({ method: 'GET', url: '//secret' })
  t.equal(duplicateSlash.statusCode, 401)

  const semicolonVariant = await app.inject({ method: 'GET', url: '/secret;foo=bar' })
  t.equal(semicolonVariant.statusCode, 401)

  const trailingSlash = await app.inject({ method: 'GET', url: '/secret/' })
  t.equal(trailingSlash.statusCode, 401)
})

test('mitigation: registering middie with hook preValidation makes use(/secret) auth block crafted variants', async function (t) {
  t.plan(4)
  const built = buildWithMiddieHook('preValidation')
  const app = built.app
  t.teardown(function () { return app.close() })

  await built.register()
  app.use('/secret', guardMiddie)

  app.get('/secret', async function () { return { ok: true, route: '/secret' } })

  const r1 = await app.inject({ method: 'GET', url: '/secret' })
  const r2 = await app.inject({ method: 'GET', url: '//secret' })
  const r3 = await app.inject({ method: 'GET', url: '/secret;foo=bar' })
  const r4 = await app.inject({ method: 'GET', url: '/secret/' })

  t.equal(r1.statusCode, 401)
  t.equal(r2.statusCode, 401)
  t.equal(r3.statusCode, 401)
  t.equal(r4.statusCode, 401)
})

test('mitigation: registering middie with hook preHandler makes use(/secret) auth block crafted variants', async function (t) {
  t.plan(4)
  const built = buildWithMiddieHook('preHandler')
  const app = built.app
  t.teardown(function () { return app.close() })

  await built.register()
  app.use('/secret', guardMiddie)

  app.get('/secret', async function () { return { ok: true, route: '/secret' } })

  const r1 = await app.inject({ method: 'GET', url: '/secret' })
  const r2 = await app.inject({ method: 'GET', url: '//secret' })
  const r3 = await app.inject({ method: 'GET', url: '/secret;foo=bar' })
  const r4 = await app.inject({ method: 'GET', url: '/secret/' })

  t.equal(r1.statusCode, 401)
  t.equal(r2.statusCode, 401)
  t.equal(r3.statusCode, 401)
  t.equal(r4.statusCode, 401)
})
