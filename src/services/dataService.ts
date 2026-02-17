export interface ListOptions {
  filter?: string
  search?: string
  orderBy?: string
  top?: number
  skip?: number
}

export interface PagedResult<T> {
  data: T[]
  totalCount: number
  hasMore: boolean
}

export interface DataService<T> {
  getAll(options?: ListOptions): Promise<PagedResult<T>>
  getById(id: string): Promise<T>
  create(item: Partial<T>): Promise<T>
  update(id: string, item: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}
