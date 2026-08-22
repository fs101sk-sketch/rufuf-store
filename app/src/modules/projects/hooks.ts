import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/schema'

/** Reactive read of every project row; undefined while the first query resolves. */
export function useProjects() {
  return useLiveQuery(() => db.projects.toArray(), [])
}

export function useAllTasks() {
  return useLiveQuery(() => db.tasks.toArray(), [])
}

export function useProject(id: string | undefined) {
  return useLiveQuery(() => (id ? db.projects.get(id) : undefined), [id])
}

export function useProjectTasks(projectId: string | undefined) {
  return useLiveQuery(
    () => (projectId ? db.tasks.where('project_id').equals(projectId).toArray() : []),
    [projectId],
  )
}

export function useActivityForEntity(entityId: string | undefined) {
  return useLiveQuery(
    () =>
      entityId
        ? db.activity_log.where('entity_id').equals(entityId).reverse().sortBy('created_at')
        : [],
    [entityId],
  )
}
