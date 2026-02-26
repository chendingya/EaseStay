export async function seedSession(page, { role = 'merchant', username = 'e2e-user', token = 'e2e-token' } = {}) {
  await page.addInitScript((session) => {
    localStorage.setItem('token', session.token)
    localStorage.setItem('role', session.role)
    localStorage.setItem('username', session.username)
  }, { role, username, token })
}
