# learn language models

This project at a high level is a static react docs site that is a reference for customers looking up large language model concepts from a general normal person level perspective. 

## customer stories
1. customer is looking up attention variants. customer goes to this reference, and searches by the attention tag or just "attention"
The website lists pages with attention variants and the customer can readily see all the types of attention in existence. 

2. customer is looking to find out information about a new paper. Customers goes to the reference site the reference provides explainer on the model, what is the overall architecture, what new novel things it introduces (new model arch not yet explained, new training regime, data generation, free data sets, inference optimizations, new proof of ability to scale for various models, provides evidence against a technical approach)

3. customer is interested in learning about AI models. customer goes to the reference doc and looks up the gpt2 model. 
model page explains what it is. model page leaves links to various concepts that are to be explained. model page links to default concept of transformers. 

## what is this not
this is not a website for evaluating performance on benchmarks (use artifical analysis for that), its more a technical explainer and reference sheet.

this website is not a way to dowlnoad the relevant technical papers, though it does provide links to them. 

# conceptually. 
It enables customers to search across components. 
for example, if you're looking to see the various attention mechanisms, the document supports you to look at all the types of attention. 

to enable this type of search, the internal architecture persists data model for various models to rapidly index/search different models. 

-i.e. we have internal data model representing model, type of model, associated modules. then at a more general level, we support search for model variants as necessary.

By having this internal data model, customers are able to reference from a model and their corresponding associated modules. 

# architecture overall 
the architecture overall is a statically rendered Next.js App Router site composed with Fumadocs, React Flow, Recharts, Tailwind, shadcn/ui, and a defined system data model.

# build system

the overall system that builds the website is called `you`. This is an agent factory workflow system that keeps work persistent over long periods of time. 

The only one who should touch it is the PLANNER. You MUST NOT use you unless you are the planner. 

You figure out how you works by running `you -h` and `you docs agents`. don't run you directly, since it'll start the workflow runtime. 

# writing code
when writing code, we generally look to standardize and minimize complexity. 
[design-skills](./docs/design-skills.md)
[code-standards](./docs/code-standards.md)

# writing docs
As a general rule, we want docs to be fresh and relevant, meaning that all pages should have references to appropriate other pages for relevant information. i.e. a page on attention variants should link to the other pages around attention and explain why this one is better when its written. 

please follow the appropriate documents when writing docs. 
[documentation template](./docs/documentation-template.md)
[quality-documents-standards](./docs/quality-documents-standards.md)

# generally relevant files
we MUST read these generally when writing anything.
[site fundamentals](./docs/site-fundamentals.md)
[data model](./docs/data-model.md)
[architecture](./docs/architecture.md)

# customer asks
These files are the files that are being used as the fundamental customer asks that we use to create the entire website.
use these when necessary. The planners MUST always read this page. 
[documentation site pages](./docs/documentation-site-pages-needed.md)
[architecture-checklist](./docs/architectural-checklist.md)
