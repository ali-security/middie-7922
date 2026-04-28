'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const middiePlugin = require('../index')

test('req.url stripping with duplicate slashes', async function (t) {
  t.plan(3)
  const app = Fastify({ ignoreDuplicateSlashes: true })
  t.teardown(function () { return app.close() })

  await app.register(middiePlugin)

  let capturedUrl = null

  app.use('/secret', function (req, _res, next) {
    capturedUrl = req.url
    next()
  })

  app.get('/secret/data', async function () { return { ok: true } })

  capturedUrl = null
  await app.inject({ method: 'GET', url: '/secret/data' })
  t.equal(capturedUrl, '/data', 'normal path should strip to /data')

  capturedUrl = null
  await app.inject({ method: 'GET', url: '//secret/data' })
  t.equal(capturedUrl, '/data', '//secret/data should strip to /data, not //data')

  capturedUrl = null
  await app.inject({ method: 'GET', url: '/secret//data' })
  t.equal(capturedUrl, '/data', '/secret//data should strip to /data, not //data')
})

test('req.url stripping with semicolon delimiter', async function (t) {
  t.plan(3)
  const app = Fastify({ useSemicolonDelimiter: true })
  t.teardown(function () { return app.close() })

  await app.register(middiePlugin)

  let capturedUrl = null

  app.use('/secret', function (req, _res, next) {
    capturedUrl = req.url
    next()
  })

  app.get('/secret', async function () { return { ok: true } })
  app.get('/secret/data', async function () { return { ok: true } })

  capturedUrl = null
  await app.inject({ method: 'GET', url: '/secret' })
  t.equal(capturedUrl, '/', 'normal path should strip to /')

  capturedUrl = null
  await app.inject({ method: 'GET', url: '/secret;foo=bar' })
  t.equal(capturedUrl, '/', '/secret;foo=bar should strip to /, not /;foo=bar')

  capturedUrl = null
  await app.inject({ method: 'GET', url: '/secret;foo=bar/data' })
  t.equal(capturedUrl, '/', '/secret;foo=bar/data has path /secret, strips to /')
})

test('req.url stripping with trailing slash', async function (t) {
  t.plan(3)
  const app = Fastify({ ignoreTrailingSlash: true })
  t.teardown(function () { return app.close() })

  await app.register(middiePlugin)

  let capturedUrl = null

  app.use('/secret', function (req, _res, next) {
    capturedUrl = req.url
    next()
  })

  app.get('/secret', async function () { return { ok: true } })
  app.get('/secret/data', async function () { return { ok: true } })

  capturedUrl = null
  await app.inject({ method: 'GET', url: '/secret' })
  t.equal(capturedUrl, '/', 'normal path should strip to /')

  capturedUrl = null
  await app.inject({ method: 'GET', url: '/secret/' })
  t.equal(capturedUrl, '/', '/secret/ should strip to /')

  capturedUrl = null
  await app.inject({ method: 'GET', url: '/secret/data/' })
  t.equal(capturedUrl, '/data', '/secret/data/ should strip to /data')
})

test('req.url stripping with all normalization options combined', async function (t) {
  t.plan(2)
  const app = Fastify({
    ignoreDuplicateSlashes: true,
    useSemicolonDelimiter: true,
    ignoreTrailingSlash: true
  })
  t.teardown(function () { return app.close() })

  await app.register(middiePlugin)

  let capturedUrl = null

  app.use('/secret', function (req, _res, next) {
    capturedUrl = req.url
    next()
  })

  app.get('/secret', async function () { return { ok: true } })
  app.get('/secret/data', async function () { return { ok: true } })

  capturedUrl = null
  await app.inject({ method: 'GET', url: '//secret;foo=bar/' })
  t.equal(capturedUrl, '/', '//secret;foo=bar/ should strip to /')

  capturedUrl = null
  await app.inject({ method: 'GET', url: '//secret//data//' })
  t.equal(capturedUrl, '/data', '//secret//data// should strip to /data')
})
