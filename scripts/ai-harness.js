const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const progressPath = path.join(rootDir, 'progress.txt')
const taskPath = path.join(rootDir, 'task.json')
const skillsPath = path.join(rootDir, 'skills', 'index.json')

const nowIso = () => new Date().toISOString()
const nowDate = () => new Date().toISOString().slice(0, 10)

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))
const writeJson = (filePath, value) => fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8')

const ensureTaskFile = () => {
  if (!fs.existsSync(taskPath)) {
    const initial = { meta: { project: 'xiecheng', updatedAt: nowIso(), nextId: 1 }, tasks: [] }
    writeJson(taskPath, initial)
  }
}

const appendProgress = (message) => {
  const line = `[${nowDate()}] ${message}\n`
  fs.appendFileSync(progressPath, line, 'utf8')
}

const listTasks = (data) => {
  if (!data.tasks.length) {
    console.log('暂无任务')
    return
  }
  data.tasks.forEach((task) => {
    console.log(`#${task.id} [${task.status}] ${task.title}`)
  })
}

const updateTask = (data, id, status) => {
  const task = data.tasks.find((item) => String(item.id) === String(id))
  if (!task) {
    console.log('未找到任务')
    return false
  }
  task.status = status
  task.updatedAt = nowIso()
  return true
}

const addTask = (data, title) => {
  const task = {
    id: data.meta.nextId,
    title,
    status: 'todo',
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
  data.meta.nextId += 1
  data.tasks.push(task)
  return task
}

const listSkills = () => {
  if (!fs.existsSync(skillsPath)) {
    console.log('未找到技能配置')
    return
  }
  const data = readJson(skillsPath)
  data.skills.forEach((skill) => {
    console.log(`${skill.name}: ${skill.goal}`)
  })
}

const main = () => {
  const args = process.argv.slice(2)
  const [command, subcommand, ...rest] = args

  if (!command) {
    console.log('可用命令: log | task | skills')
    return
  }

  if (command === 'log') {
    const message = [subcommand, ...rest].filter(Boolean).join(' ').trim()
    if (!message) {
      console.log('请输入日志内容')
      return
    }
    appendProgress(message)
    ensureTaskFile()
    const data = readJson(taskPath)
    data.meta.updatedAt = nowIso()
    writeJson(taskPath, data)
    return
  }

  if (command === 'task') {
    ensureTaskFile()
    const data = readJson(taskPath)
    if (subcommand === 'list') {
      listTasks(data)
      return
    }
    if (subcommand === 'add') {
      const title = rest.join(' ').trim()
      if (!title) {
        console.log('请输入任务标题')
        return
      }
      const task = addTask(data, title)
      data.meta.updatedAt = nowIso()
      writeJson(taskPath, data)
      appendProgress(`新增任务 #${task.id} ${task.title}`)
      return
    }
    if (subcommand === 'set') {
      const [id, status] = rest
      if (!id || !status) {
        console.log('用法: task set <id> <status>')
        return
      }
      const ok = updateTask(data, id, status)
      if (ok) {
        data.meta.updatedAt = nowIso()
        writeJson(taskPath, data)
        appendProgress(`更新任务 #${id} 状态为 ${status}`)
      }
      return
    }
    console.log('可用子命令: list | add | set')
    return
  }

  if (command === 'skills') {
    if (subcommand === 'list') {
      listSkills()
      return
    }
    console.log('可用子命令: list')
    return
  }

  console.log('未知命令')
}

main()
