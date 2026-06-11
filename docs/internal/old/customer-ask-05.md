(9:16PM)
The following issues have now appeared after the latest convergence effort and revision. 
- please re-initiate teh following tasks as items in the phase 1 checklist, and please add fixes.
- please continue to mark off items from teh checklist as items complete. 

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


## nav bar left
1. the navr bar has a dark/light mode that doesn't work... remove it


## module page
- there is no module renderer that is exposed for supporting for example rendering the architeture module of how MHA works. we shoudl add this component for react-flow based component rendering. 
- the comparison table reference does not exist and is left as a hanging reference
- the summary table that says the module family, concept type, etc looks strange due to lack of proper text alignment on the dt/dd, as right now they have weird margin tops screwing with the shapes, we should remove these dt/dd spacings. 
- tag list style type should not have a disc, the only time list should have a style type is when its in prose. we should remove such discs from the tags page's elements and the architecture list elements as well. the default should be lists as tag less, except for prose. 
- callout components need to have appropriate top padding and lower padding, and right now it doesn't
- Variants And Nearby Modules -> this type of table should not be had. it should be removed
- there are various words on the page like mha, etc that would be better off being linkable text, we should make it so that during the build phases that we render words that are references to other pages as links. 
- the model component should render the algorithm using the latex renderer to show the effective comparative algorithm of mha vs gqa.

## glossary pages
2. glossary pages are overly repetitive
2.1. the title for the glossary appears twice, the docs body, and the docstitle/description duplicate themselves for the header/description with the problem statement. remove the problem statement and the header in the body. 
2.2. the tags appear twice
3. glossary pages "where it appears" sections are too long, and they crowd the page. We should just remove it. 
4. links in tags and other components on the glossary page looks weird, we should remove the underline. 
5. the core idea/porblem statement section is repetitive. merge them into one. it should be a one line sentence always still
6. the footer item navigates looks weird because when we hover its pink, but onyl the header turns white but the "previous page/next page" does not. both should change to white. 
