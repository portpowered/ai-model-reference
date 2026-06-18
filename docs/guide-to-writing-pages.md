# This is a guide to writing pages

1. given a request to write a page. 
2. check if the page is conformant to an existing template, such as model, module, etc under docs/templates. 
3. check in the code base to see if there are similar pages,  
4. add a new page under src/contents/docs/XX that aligns with your description. following the structure of the docs/templates
4.1. we should structure our page content as related, and associated with the appropriate tags to similar pages.
4.2. if we are adding modules/models/training regimes/etc, we want customers to quickly be able to switch between model presentations. consider if we should add a new graph for our module/model/etc, as well as for pre-existing model/module. 
4.3. if we are adding modules/models/training regimes/etc, we want customers to quickly be able to switch, so consider if we should add a new equestion for our new page, as well as add a corresponding additions to the existing models/modules. 

Examples: 
1. there was an FFN page that explained the FFN as a concept, but what we wanted when we compared it to the MOE page is the variant in the expert count and the router, rather than the internal activation behavior.Therefore we added a new graph to the FFN. 

### Adding graphs

You must ensure to follow the [graphing-standards](./graphing-standards.md)

### Adding algorithms
Please ensure that the algorithms are reflective. 
