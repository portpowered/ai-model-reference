# This is a guide to writing pages

1. given a request to write a page. 
2. check if the page is conformant to an existing template, such as model, module, etc under docs/templates. 
3. check in the code base to see if there are similar pages,  
4. add a new page under src/contents/docs/XX that aligns with your description. following the structure of the docs/templates
4.0. ensure the page can stand on its own, avoids page-meta prose, and follows the [docs-writing-standards](../factory/docs/standards/docs-writing-standards.md)
4.1. we should structure our page content as related, and associated with the appropriate tags to similar pages.
4.2. if we are adding modules/models/training regimes/etc, we want customers to quickly be able to switch between model presentations. consider if we should add a new graph for our module/model/etc, as well as for pre-existing model/module. 
4.3. if we are adding modules/models/training regimes/etc, we want customers to quickly be able to switch, so consider if we should add a new equestion for our new page, as well as add a corresponding additions to the existing models/modules. 

Examples: 
1. there was an FFN page that explained the FFN as a concept, but what we wanted when we compared it to the MOE page is the variant in the expert count and the router, rather than the internal activation behavior.Therefore we added a new graph to the FFN. 

## Adding graphs

You must ensure to follow the [graphing-standards](./graphing-standards.md)

If the concept is mathematically heavy or conceptually heavy, we must add the
equations, graphs, charts, or diagrams needed to teach it clearly.

When adding new graphs for a family: 
0. we should be very sure what we should present as the graph. sometimes the best graph is a chart function like for silu/relu, sometimes its a node graph like ffn/moe. we should consider what si the best presentation. Sometimes its useful to have multiple charts. 


#### general 
the default introduction concept like attention, ffn, relu should be a singular graph. 
the variant formats like MOE, SwiGLU should be a comparator. 

#### node graphs
1. the various nodes positions within a family's specific graph shapes we should try align positions. i.e. for the attention over time, we should try to keep the positions of the Q the same, and the KV positions the same. Similary thing for QKV interation differences between GQA, MHA, etc. 
2. graph nodes should not overlap with text blocks. 


### function charts
for funtion charts
1. always model 0. 
2. always show labels for x/y
3. always have a title
4. always present a legend denoting what each node is. 

## Adding algorithms
Please ensure that the algorithms are reflective. 

## Types of pages

We define pages as generally as follows: 

1. a baseline. 
2. a variant. 
3. generic

### Baselines

base line pages are those that define the standard for a type of component or abstraction and exist in isolation. 

in our systems RELU, and FFNs are baselins. 

They don't put comparisons to other models, they exist independently. 

Some ones we should add later on include stuff like adamW, cross entropy, kaiming/he, dropout + weight decay.

### Variants

Variants are concepts like new training regimes or modules or whatever that modify the original abstract concept. 

These pages tends to have: 
1. a comparison between the function and the original baseline, or another variant. 
2. the text is still written in isolation of the paper, but provides some smaller affordances towards the thing it improves on. i.e. variants to MOE, variants to optimizers. 
3. Papers tend to start as variants, then slowly evolve to become baselines as more things become compared to it. 

### Generic

Generic pages are just pages that are not variants or not baselines. This could just be one offs where no variants are expected to exist or it doesn't make sense to do so. 

Some examples could be like: 
1. loss
2. training
3. neural network