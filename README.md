A reference on large language models - components, concepts, and techniques. 

# problem statement
Engineers who are interested in new architecture changes in large language models do not currently have a reference for all the components. 

# solution

customers need a compression; a way to get lots of data without scrounging themselves. 

# what
This project compiles all the various parts of a typical large language model, and the variants into a ready to use compressed document. 

Customers simply download the project, and have access to a reference of concepts/ the data as necessary in whatever language they want. 

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
the architecture overall is a statically rendered react site that is composed based on fuma, react flow, recharts, and correspondingly a defined system data model. 

# relevant files
[data model](./docs/data-model.md)
[architecture-checklist](./docs/architectural-checklist.md)
[design-skills](./docs/design-skills.md)
[documentation site pages](./docs/documentation-site-pages-needed.md)
[documentation template](./docs/ocumentation-template.md)
[site fundamentals](./docs/site-fundamentals.md)