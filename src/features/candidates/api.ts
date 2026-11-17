import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

/** 売り建て候補の一覧（GET /candidates）。asOf を省略すると、最新日。 */
export function useCandidates(asOf: string | undefined) {
  return useQuery({
    // queryKey が変わると（＝基準日を変えると）、自動で取り直す
    queryKey: ['candidates', asOf ?? 'latest'],
    queryFn: async () =>
      unwrap(await api.GET('/candidates', { params: { query: { as_of: asOf } } })),
  })
}
