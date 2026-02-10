const { authRequired, requireRole, signToken, verifyToken } = require('../src/middleware/auth')

const createRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('auth middleware', () => {
  it('authRequired blocks missing token', () => {
    const req = { headers: {} }
    const res = createRes()
    const next = jest.fn()
    authRequired(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('authRequired allows valid token', () => {
    const token = signToken({ id: 1, role: 'admin' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = createRes()
    const next = jest.fn()
    authRequired(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.user).toEqual(expect.objectContaining({ id: 1, role: 'admin' }))
  })

  it('requireRole blocks wrong role', () => {
    const req = { user: { role: 'merchant' } }
    const res = createRes()
    const next = jest.fn()
    requireRole('admin')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('verifyToken validates signed token', () => {
    const token = signToken({ id: 2, role: 'merchant' })
    const payload = verifyToken(token)
    expect(payload).toEqual(expect.objectContaining({ id: 2, role: 'merchant' }))
  })
})
