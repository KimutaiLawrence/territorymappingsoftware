'use client'

import { useState } from 'react'
import { OnChangeFn, PaginationState } from '@tanstack/react-table'

export const usePagination = (initialState?: PaginationState) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialState?.pageIndex || 0,
    pageSize: initialState?.pageSize || 10,
  })

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    setPagination(old => {
      if (typeof updater === 'function') {
        return updater(old)
      }
      return updater
    })
  }

  return {
    pagination,
    setPagination: handlePaginationChange,
  }
}
