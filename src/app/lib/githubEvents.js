// Memetakan respons GitHub Events API ke item riwayat aktivitas.
// additions/deletions bernilai null bila GitHub tidak menyertakannya
// (PushEvent tidak pernah memuatnya; payload PullRequestEvent dapat dipangkas).

const angkaAtauNull = (nilai) =>
  typeof nilai === "number" && Number.isFinite(nilai) ? nilai : null;

export function mapGitHubEvents(events) {
  if (!Array.isArray(events)) return [];
  return events
    .filter((event) =>
      ["PushEvent", "PullRequestEvent"].includes(String(event?.type || "")),
    )
    .map((event) => {
      if (event.type === "PullRequestEvent") {
        const pullRequest = event.payload?.pull_request || {};
        return {
          id: event.id,
          tipe: "pr",
          repo: event.repo?.name || "",
          commit: pullRequest.head?.sha || event.payload?.head || "",
          additions: angkaAtauNull(pullRequest.additions),
          deletions: angkaAtauNull(pullRequest.deletions),
          time: event.created_at,
        };
      }

      const commit = event.payload?.commits?.[0];
      return {
        id: event.id,
        tipe: "push",
        repo: event.repo?.name || "",
        commit: commit?.sha || event.payload?.head || "",
        additions: null,
        deletions: null,
        time: event.created_at,
      };
    });
}
