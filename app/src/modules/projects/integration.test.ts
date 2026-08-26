import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../core/db/schema'
import {
  completeTask,
  createProject,
  createTask,
  duplicateProject,
  permanentlyDeleteProject,
  reopenTask,
  restoreProject,
  softDeleteProject,
  softDeleteTask,
  toggleFavorite,
  updateProject,
  ValidationFailedError,
} from './service'
import { projectsRepository, tasksRepository } from './repository'

const BASE_PROJECT_INPUT = {
  name: 'نظام إدارة المخزون',
  type: 'تطبيق ويب',
  description: 'وصف تجريبي',
  status: 'planning' as const,
  priority: 'high' as const,
  deadline: null,
  live_url: null,
  repository_url: null,
  tech_stack: ['React', 'TypeScript'],
  notes: '',
}

const BASE_TASK_INPUT = {
  title: 'إعداد قاعدة البيانات',
  description: '',
  status: 'todo' as const,
  priority: 'medium' as const,
  due_date: null,
}

beforeEach(async () => {
  await Promise.all([
    db.projects.clear(),
    db.tasks.clear(),
    db.activity_log.clear(),
    db.settings.clear(),
    db.workspace.clear(),
  ])
})

describe('project CRUD (real IndexedDB via Dexie)', () => {
  it('creates a project and persists it in the database', async () => {
    const created = await createProject(BASE_PROJECT_INPUT)
    const fromDb = await projectsRepository.get(created.id)
    expect(fromDb).toBeDefined()
    expect(fromDb?.name).toBe('نظام إدارة المخزون')
    expect(fromDb?.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('rejects creating a project with an empty name', async () => {
    await expect(createProject({ ...BASE_PROJECT_INPUT, name: '' })).rejects.toBeInstanceOf(ValidationFailedError)
  })

  it('updates a project', async () => {
    const created = await createProject(BASE_PROJECT_INPUT)
    await updateProject(created.id, { ...BASE_PROJECT_INPUT, name: 'اسم جديد', status: 'active' })
    const fromDb = await projectsRepository.get(created.id)
    expect(fromDb?.name).toBe('اسم جديد')
    expect(fromDb?.status).toBe('active')
  })

  it('toggles favorite', async () => {
    const created = await createProject(BASE_PROJECT_INPUT)
    await toggleFavorite(created.id, true)
    expect((await projectsRepository.get(created.id))?.favorite).toBe(true)
  })

  it('soft-deletes and restores a project (undo)', async () => {
    const created = await createProject(BASE_PROJECT_INPUT)
    await softDeleteProject(created.id)
    let fromDb = await projectsRepository.get(created.id)
    expect(fromDb?.deleted_at).not.toBeNull()

    await restoreProject(created.id)
    fromDb = await projectsRepository.get(created.id)
    expect(fromDb?.deleted_at).toBeNull()
  })

  it('permanently deletes a project and cascades to its tasks', async () => {
    const created = await createProject(BASE_PROJECT_INPUT)
    await createTask(created.id, BASE_TASK_INPUT)
    expect(await tasksRepository.listByProject(created.id)).toHaveLength(1)

    await permanentlyDeleteProject(created.id)

    expect(await projectsRepository.get(created.id)).toBeUndefined()
    expect(await tasksRepository.listByProject(created.id)).toHaveLength(0)
  })

  it('duplicates a project along with its non-deleted tasks', async () => {
    const created = await createProject(BASE_PROJECT_INPUT)
    const task1 = await createTask(created.id, BASE_TASK_INPUT)
    const task2 = await createTask(created.id, { ...BASE_TASK_INPUT, title: 'مهمة أخرى' })
    await softDeleteTask(task2.id)

    const clone = await duplicateProject(created.id)

    expect(clone.id).not.toBe(created.id)
    expect(clone.name).toBe(`${created.name} (نسخة)`)
    expect(clone.favorite).toBe(false)

    const cloneTasks = await tasksRepository.listByProject(clone.id)
    expect(cloneTasks).toHaveLength(1)
    expect(cloneTasks[0]?.title).toBe(task1.title)
    expect(cloneTasks[0]?.id).not.toBe(task1.id)
  })
})

describe('task lifecycle and computed progress', () => {
  it('completing and reopening a task updates completed_at', async () => {
    const project = await createProject(BASE_PROJECT_INPUT)
    const task = await createTask(project.id, BASE_TASK_INPUT)

    await completeTask(task.id)
    let fromDb = await tasksRepository.get(task.id)
    expect(fromDb?.status).toBe('completed')
    expect(fromDb?.completed_at).not.toBeNull()

    await reopenTask(task.id)
    fromDb = await tasksRepository.get(task.id)
    expect(fromDb?.status).toBe('todo')
    expect(fromDb?.completed_at).toBeNull()
  })

  it('project progress reflects only real, non-deleted tasks', async () => {
    const project = await createProject(BASE_PROJECT_INPUT)
    const t1 = await createTask(project.id, BASE_TASK_INPUT)
    const t2 = await createTask(project.id, { ...BASE_TASK_INPUT, title: 't2' })
    await createTask(project.id, { ...BASE_TASK_INPUT, title: 't3 (will be deleted)' })

    await completeTask(t1.id)
    const tasks = await tasksRepository.listByProject(project.id)
    const deletedOne = tasks.find((t) => t.title.startsWith('t3'))!
    await softDeleteTask(deletedOne.id)

    const liveTasks = (await tasksRepository.listByProject(project.id)).filter((t) => !t.deleted_at)
    expect(liveTasks).toHaveLength(2)
    expect(liveTasks.map((t) => t.id).sort()).toEqual([t1.id, t2.id].sort())
  })
})
