import { db } from '../../core/db/schema'
import type { ProjectRow, TaskRow } from '../../core/db/schema'

export const projectsRepository = {
  async list(): Promise<ProjectRow[]> {
    return db.projects.toArray()
  },
  async get(id: string): Promise<ProjectRow | undefined> {
    return db.projects.get(id)
  },
  async create(row: ProjectRow): Promise<void> {
    await db.projects.add(row)
  },
  async update(id: string, patch: Partial<ProjectRow>): Promise<void> {
    await db.projects.update(id, patch)
  },
  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.projects, db.tasks, async () => {
      await db.projects.delete(id)
      await db.tasks.where('project_id').equals(id).delete()
    })
  },
}

export const tasksRepository = {
  async listByProject(projectId: string): Promise<TaskRow[]> {
    return db.tasks.where('project_id').equals(projectId).toArray()
  },
  async listAll(): Promise<TaskRow[]> {
    return db.tasks.toArray()
  },
  async get(id: string): Promise<TaskRow | undefined> {
    return db.tasks.get(id)
  },
  async create(row: TaskRow): Promise<void> {
    await db.tasks.add(row)
  },
  async update(id: string, patch: Partial<TaskRow>): Promise<void> {
    await db.tasks.update(id, patch)
  },
  async remove(id: string): Promise<void> {
    await db.tasks.delete(id)
  },
}
