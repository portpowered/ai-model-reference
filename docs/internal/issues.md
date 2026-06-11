issues
## what? 

this isbasically a tracking of all the issues that happened on the initial run of the agent-factory, and what all can happen

## phase 0 -issues
## methodology of building
- vibe coding mostly
- write a very high level plan, data model, checklist, and let the agents run in a structured flow for roughly ~500 agent dispatches
-- do this at first, explain everything you want, and help build plan. 
- sum total cost (not measured)

## general observations
- the batch-input-example.json
the batch input on initial submit was kind of screwed up, the agent submitted the work without recognizing that the package had no work in them and then they stomped all over each other. 
- need to update the work behavior to not do that. 

## planning - longterms
- longitudinal system failures such as those that cause systems to hang tend to cause cascading effects
- good plans are really important, start with a smart planner

- working from a checklist helps, but the plan for achieving that checklist is important, as the models tend to just plan however they want
- sometimes the models merge over each other, and things get into issues, need to figure out the appropriate way to handle

- optimization: when writing checklists, best to pair with some ordering mechanism for planning. 
i.e. get the model to build CI first, then tests, then the internal components. 

## planning CI
- the agent submitted a baseline structure but did not enough baseline CI agtes to prevent drift, and would have been better off initiating hte project graph as being based on running ci, tests, coverage as soon as possible, rather than the derfault planning. 

- this planning of gates/testing needs to be planned first

- the solution is to for the planner ensure that it prioritizes the ordering of checklist ordered operations

## services getting stuck

  PID 59732 and PID 59782 are both waiting on:

  curl http://localhost:3000/docs/modules/grouped-query-attention

  The likely cause is port collision/stale server state. localhost:3000 is owned by an old Node/Next process:

  PID 1292 listening on *:3000

  That server is from an older site-app-scaffold dev run, not the reviewer’s docs-template-rendering bun run start. So
  the reviewer is curling the wrong/stale server and waiting indefinitely because the commands have no --max-time.

  Other running agent instances I found:

  - PID 69906: inline-dashboard-import-preview-dialog-classes processor, not reviewer. It is actively waiting on PR #635
    CI with a 12 x 30s polling loop. This one is expected to finish soon.
  - PID 76892: inline-agent-bento-classes processor, only running ~5 minutes; not obviously stuck.
  - PID 98539: the you factory runtime on port 7437.
  - PID 54095 and PID 87524: older Cursor agents from /Users/abdifamily/infinite-you, unrelated to this repo, also long-
    lived.
  - Several old orphan curl, Storybook, Playwright, and Next dev server processes are still around.

  I did not kill anything. The immediate unblock for the reviewer is to terminate the hung curl children 59732 and
  59782, or terminate the reviewer agent 56724 if you want the factory to treat that workstation attempt as interrupted/
  failed. The underlying fix is to make review/browser verification use a unique port plus curl --max-time, and to clean
  up stale dev servers before starting bun run start.
  
  //// need to be able to configure structures of standardization to prevent it getting stuck
- this issue caused certain runs to reach the timeline limit of something like 2 hours per run when the agent got stuck. 

- the solution to this ended up being to manually kill all child processes, regardless of success/failure of codex cli. 

  ## reviewer passthrough

  - certain agents are better than others (codex/glm are more likely to spot issues)
  - providing more explicit concerns tends to make things more likely to be caught, i.e did this X align with the internal data models or induce a segmentation, does this code duplicate the other code in this other side.
  - use a checklist for review. 

  ## dirty files

  any file that ends up in contention should be removed from git history commits
  - this is stuff usually like generated files, progress documents


  issues

- the batch-input-example.json
the batch input on initial submit was kind of screwed up, the agent submitted the work without recognizing that the package had no work in them and then they stomped all over each other. 
- need to update the work behavior to not do that. 

- longitudinal system failures such as those that cause systems to hang tend to cause cascading effects
- good plans are really important, start with a smart planner

- working from a checklist helps, but the plan for achieving that checklist is important, as the models tend to just plan however they want
- sometimes the models merge over each other, and things get into issues, need to figure out the appropriate way to handle

## phase 1 (manual-review-0)
- relevant review log:  /Users/abdifamily/.you-agent-factory/recordings/2026-06/2026-06-02/factory-session-~default-211920-ea1a86a5-db06-43b8-870c-58603d24a713.json
- i'm actually super impressed. it got so much of the work done roughly correctly.
- the main failure was not lack of effort. the main failure was lack of convergence: parallel work created working pieces that did not fully merge into one coherent docs product.

### CI and coverage
- issue: CI existed, but it did not publish to GitHub Pages, did not print coverage clearly, and did not enforce a coverage threshold.
- reconciliation:
  - GitHub Actions should run the same commands as local `make ci`.
  - GitHub Actions should print the coverage summary.
  - CI should fail below the configured coverage threshold.
  - Reusable components in `src/components/**` and `src/features/**/components/**` should have at least 90% reachable statement/branch coverage.
  - Thin wrappers may be below the full target only when they are documented as wrappers and have a smoke test proving render/props/children behavior.
  - CI, not a reviewer agent, is responsible for mechanical coverage enforcement.

### planning
- issue: the planning covered some items, but did not show how each part of `docs/architectural-checklist.md` and `docs/documentation-site-pages-needed.md` mapped to phases and work batches.
- reconciliation:
  - `docs/internal/checklist.md` should explicitly carry forward every major architecture checklist area and every roadmap phase.
  - each phase should include its page/work inventory, required outcomes, and manual review gate.
  - each batch should state which phase items and which architecture checklist rows it advances.
  - each batch should declare expected tests before implementation begins.
  - every few batches, the planner should schedule a reconciliation/merge-cleanup pass instead of only submitting new feature work.

### post-batch convergence review
- issue: completion of a factory batch was treated too much like completion of product work.
- reconciliation:
  - after every completed batch, the planner must run a convergence review before submitting new feature work.
  - use one validator/reviewer agent type, but dispatch it with different validation briefs.
  - useful validator briefs:
    - checklist convergence: compare finished work against the phase checklist, architecture checklist rows, and work-item acceptance criteria.
    - UX route convergence: manually exercise relevant routes, search flows, keyboard shortcuts, navigation, layout, loading/empty states, and responsive behavior.
    - data-model convergence: inspect registry records, page frontmatter, localized messages, assets, citations, tags, related docs, and dead-end links.
    - architecture drift: look for duplicate layouts, duplicate search systems, one-off components, boundary violations, and parallel work that failed to merge into one coherent implementation.
  - validator results should report `pass`, `fail`, or `uncertain`, with evidence, affected files/routes, checklist rows, and proposed repair work.
  - the planner should synthesize the validator outputs and choose one of three next actions: repair batch, cleanup/reconciliation batch, or next feature batch.
  - validator agents should exercise UX and inspect convergence gaps. They should not duplicate CI as the coverage engine.

### documents
- issue: README did not show actual CI badges and did not link directly to the `portpowered/you-agent-factory` repository.
- reconciliation:
  - README should include CI status, license, supported languages, and page-count/status badges when available.
  - README should link directly to the agent factory repository and explain how this project uses it.
  - README should explain the project problem, website link or local route, structure, build commands, and factory loop.

### home page
- issue: "Search the reference" was redundant when the header already had search.
- issue: the left "reference browser" area was empty or not useful.
- reconciliation:
  - keep one canonical search affordance in the header unless a page-level search section provides a distinct workflow.
  - if the home page has a browse section, it should contain useful reference entry points such as architecture, glossary, tags, modules, models, and papers.
  - home should still feel like page zero of the docs system, not a marketing page or separate dashboard.

### header bar and search
- issue: the visible search affordance did not reliably work.
- issue: there were duplicate search concepts: a menu item and a search bar/button.
- issue: command-k did not work.
- reconciliation:
  - implement one canonical header search affordance.
  - support `Cmd-K` and `Ctrl-K`.
  - search should return results for `GQA`, `attention`, and `KV cache`.
  - search should have functional tests for opening, typing, empty/loading states, result rendering, keyboard behavior, and handoff from tag/search routes.

### glossary page (token)
- issue: token used a page structure that felt separate from the rest of the docs site.
- issue: dark/light mode behavior was broken or misleading.
- issue: the page mentioned a diagram without rendering one.
- reconciliation:
  - token should use the canonical Fumadocs documentation shell or a documented Fumadocs-compatible variant.
  - token should use message-key prose, registry-backed related links, tag pills, and citations where relevant.
  - token should render an actual concept diagram through `ConceptMap` or an equivalent tested component.
  - do not show a light/dark toggle in Phase 1 unless theme switching is fully implemented. Phase 1 should default to the dark token set.

### module page (GQA)
- issue: GQA used a separate structure instead of the canonical docs shell.
- issue: markdown typography and MDX component rendering did not feel like the rest of the docs pages.
- issue: references were incomplete.
- issue: dead-end links led to empty pages instead of real pages or not-found behavior.
- issue: the page did not clearly explain component architecture.
- issue: the paper-supported memory/quality tradeoff table was missing.
- issue: duplicate tag lists appeared.
- issue: variants list/table alignment and headers were weak.
- reconciliation:
  - GQA should use the canonical Fumadocs documentation shell: top nav, left docs sidebar, central article column, and right table-of-contents rail where headings exist.
  - do not build a one-off in-file navigation bar when Fumadocs can provide the table of contents.
  - GQA should use message-key prose, registry-backed components, citations, and resolved assets.
  - render one tag list unless there is a distinct, documented reason for more.
  - add a reusable semantic table component or table-rendering asset component for MHA/MQA/GQA tradeoffs.
  - the comparison table should have visible headers, left-aligned variant names, responsive overflow behavior, and citation-backed values.
  - generic component prescriptions must map to a concrete reusable component such as `Table`, `Card`, `Callout`, `Section`, `TagPillList`, `CitationList`, `DerivedRelatedDocs`, `PageAsset`, `ModuleGraph`, `ConceptMap`, or a newly introduced tested component.

### getting started page and navigation
- issue: left nav contained the home page but not corresponding Phase 1 pages such as token and GQA.
- issue: in-page navigation hover/focus color was not visible enough and did not align with the primary blue-teal site token.
- reconciliation:
  - left docs nav should include the Phase 1 docs pages and reference routes as appropriate.
  - right table-of-contents hover/focus state should use the same primary blue-teal token as the rest of the shell.
  - navigation should have route smoke tests and UX route validation.

### tag page - attention
- issue: the "Search this tag / attention / Open search entry page" content was repetitive because the header already had search.
- reconciliation:
  - tag pages should primarily list resources grouped by kind from registry records and MDX frontmatter.
  - a tag-specific search handoff is okay only if it provides a distinct workflow, such as `/search?tag=attention`.
  - avoid duplicating the same search affordance in multiple nearby places.

### search page
- issue: search page did not list results.
- reconciliation:
  - search page should use the same search client/index assumptions as the dialog.
  - it should render results for known Phase 1 queries: `GQA`, `attention`, and `KV cache`.
  - it should support empty, loading, no-result, and success states.

### fold into checklist
- issue: review findings were not yet converted into durable planning gates.
- reconciliation:
  - add CI and coverage gates to the planner checklist.
  - add Fumadocs layout consistency gates to the planner checklist.
  - add search/header functional gates to the planner checklist.
  - add token and GQA page reconciliation gates to the planner checklist.
  - add a post-batch convergence review rule to the planner checklist and ideafy instructions.
  - future planner batches should not advance merely because the factory work completed; they should advance only after convergence review chooses repair, cleanup, or next feature work.

## phase 2 - issues
### fixes
- switched reviewers to codex
- switched planners to codex

### changes
- the re-rendering worked and the convergence helped to merge things but it lacked a few things
- there were stylistic issues

### planning issues
- the planner agent should always be told to loko a the customer-ask and determine if hte current customer ask is aligned with the current checklists/progress.md and if it isn'tit likely means its modified and you should reiterate.


## home page
- model atlas brush header has too much bottom margin, remove the margin
- the copy around search is verbose, remove it entirely. 
- the intent of the page is to be short and sweet and to the point. 
- the home browse links have disc styles, which is weird, and we should remove it
- the home browse links are underlined, which is weird, it should not be underlined

## Tag list
- mt-8 flex flex-col gap-8
- tags are weird... fix mt-8 to not exist. 

## header
- the header has a search button
- the header has a search bar

- these are redundant, remove the search nav bar item, and leave only the search bar
- the search bar when you hover over it makes the (command K) buttons appear black and no text, we should make the command K text white when hovered. 

### search list
- the search list when finding results is too verbose. 
-- it points to individual llinks on the pages have for example load of links to parts on the page, but that is non useful. the search should just enumerate the pages that it found rather than the deep links of text within the file. 
- when you hover over searchresultlistitem, it should highlight the entire search result list item including the meta details not just the search dialog list item. 
- when the word matches, the background is the current pink, but the matching text is blue/black which makes the text invisible, the text should be inverted to white on the current selection when the text matches. right now if the text doesn't match its fine because the text color turns black from white. not so when matching text
- remove the tags from teh framents
- keep meta details thin lke: 


/** Rich metadata panel shared by the global search dialog and `/search` results. */
export function SearchResultMetaDetails({
  url,
  query,
  meta,
  messages,
}: SearchResultMetaDetailsProps) {
  const matchedTags = getMatchedTags(query, meta.tags);

  return (
    <div
      className="space-y-1 pb-2 pl-2 pt-4 text-sm"
      data-testid="search-result-meta"
    >
      {meta.description ? (
        <p
          className="line-clamp-2 text-fd-muted-foreground"
          data-testid="search-result-summary"
        >
          {meta.description}
        </p>
      ) : null}
      <p
        className="truncate font-mono text-xs text-fd-muted-foreground"
        data-testid="search-result-url"
      >
      </p>
      {matchedTags.length > 0 ? (
        <div
          className="flex flex-wrap gap-1"
          data-testid="search-result-matched-tags"
        >
          {matchedTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-fd-border bg-fd-background px-1.5 py-0.5 text-xs text-fd-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}


## #nav bar left
1. the navr bar has a dark/light mode that doesn't work... remove it


## #module page
- there is no module renderer that is exposed for supporting for example rendering the architeture module of how MHA works. we shoudl add this component for react-flow based component rendering. 
- the comparison table reference does not exist and is left as a hanging reference
- the summary table that says the module family, concept type, etc looks strange due to lack of proper text alignment on the dt/dd, as right now they have weird margin tops screwing with the shapes, we should remove these dt/dd spacings. 
- tag list style type should not have a disc, the only time list should have a style type is when its in prose. we should remove such discs from the tags page's elements and the architecture list elements as well. the default should be lists as tag less, except for prose. 
- callout components need to have appropriate top padding and lower padding, and right now it doesn't
- Variants And Nearby Modules -> this type of table should not be had. it should be removed
- there are various words on the page like mha, etc that would be better off being linkable text, we should make it so that during the build phases that we render words that are references to other pages as links. 
- the model component should render the algorithm using the latex renderer to show the effective comparative algorithm of mha vs gqa.

### glossary pages
2. glossary pages are overly repetitive
2.1. the title for the glossary appears twice, the docs body, and the docstitle/description duplicate themselves for the header/description with the problem statement. remove the problem statement and the header in the body. 
2.2. the tags appear twice
3. glossary pages "where it appears" sections are too long, and they crowd the page. We should just remove it. 
4. links in tags and other components on the glossary page looks weird, we should remove the underline. 
5. the core idea/porblem statement section is repetitive. merge them into one. it should be a one line sentence always still
6. the footer item navigates looks weird because when we hover its pink, but onyl the header turns white but the "previous page/next page" does not. both should change to white. 

### planning
the model for planning is not following instructions to mark off checklist. 
