# website fundamentals 

## operational
- website deploys via github actions
- website has CI on merges confirms deployment passes
- merges to main cannot be done without CI passing


## testing
- components are tested
- render integration tests exist to confirm website is working
- lighthouse/performance tests
- storybook for visual tests

## system structure
- package state uses a state manager (zustand)
- websites are separate from components
- styles are defined inline via tailwind
- tokens are defined for colors and sizing and font, and used consistently across the website. (no direct numbers for padding/fonts inside of components)

## component quality
- components have a loading state, failed state, success state
- components are modified mainly by variation like in shadcn

## package structures
- components are structured appropriately bound across feature groups
features/components, -> components
features/state, -> system state
features/hooks -> hooks for modification
features/messages -> localized values

## pages
- pages reference components
- pages are constrained to a set of layouts that are predefined
- static pages are generated via mdx. 

## accessibility
- wcag tests
- accessibility annotations on all components/resources

## localization
- customers can choose content localization
- times are localized appropriately to the reader region

## quality 
- linting (biome) - defaults + function, line size
- coverage validation - (mandate 100% code coverage)

# website specific decisions
## technology decisions
- static site
- uses appropriate router (next or react routers)
- use fuma docs for rendering docs
- uses mdx based docs
- shadcn, use as basis, magicui for fancy components

## feature sites
- supports doc search
- supports export to pdf
- supports having nav bars for in file navigation and cross file navigation
- supports rendering graphs for models
- supports math equations

-- uses reacct flow for model/module rendering

### components
has a standard graph viewer component
has a standard model viewer component
uses standard shadcn components + magicui components as necessary
